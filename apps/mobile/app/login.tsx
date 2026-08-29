import { useState } from "react";
import { router } from "expo-router";
import { View, Text, TextInput, Pressable, Image, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { ApiError, confirmTotpSetup, login, logout, verifyTotp, type LoginResult, type PublicUser } from "../lib/api-client";
import { useSession } from "../lib/session-context";
import { colors } from "../lib/theme";

type Step =
  | { kind: "password" }
  | { kind: "totp-setup"; setupToken: string; qrCodeDataUrl: string; secret: string }
  | { kind: "totp-challenge"; challengeToken: string };

// HR has no mobile screens yet (see app/index.tsx) — but HR accounts also go through TOTP
// (same as DIRECTOR), so the "web only" message can only be shown once the final token
// response comes back and reveals the role, not before. By that point api-client's postAuth
// has already written a real, working token pair to SecureStore — log back out immediately
// (revoking it server-side too) rather than leaving a live, unused credential on the device.
async function afterLogin(user: PublicUser, refreshSession: () => Promise<void>): Promise<{ blocked: boolean }> {
  if (user.role === "HR") {
    await logout();
    return { blocked: true };
  }
  void refreshSession();
  return { blocked: false };
}

export default function LoginScreen() {
  const { refreshSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResult(result: LoginResult) {
    if ("totpSetupRequired" in result) {
      setStep({ kind: "totp-setup", setupToken: result.setupToken, qrCodeDataUrl: result.qrCodeDataUrl, secret: result.secret });
      return;
    }
    if ("requiresTotp" in result) {
      setStep({ kind: "totp-challenge", challengeToken: result.challengeToken });
      return;
    }
    const { blocked } = await afterLogin(result.user, refreshSession);
    if (blocked) {
      setError("ՄՌԿ մասնագետի աշխատատեղը դեռ հասանելի է միայն վեբ հավելվածում։");
      return;
    }
    router.replace(result.user.role === "DIRECTOR" ? "/director" : "/employee");
  }

  async function submitPassword() {
    setError("");
    setLoading(true);
    try {
      await handleResult(await login(email.trim(), password));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Մուտքը ձախողվեց։");
    } finally {
      setLoading(false);
    }
  }

  async function submitTotp() {
    if (step.kind === "password") return;
    setError("");
    setLoading(true);
    try {
      const result =
        step.kind === "totp-setup" ? await confirmTotpSetup(step.setupToken, code) : await verifyTotp(step.challengeToken, code);
      await handleResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Սխալ կոդ։");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Omboo · ՄՌԿ Թվային Հարթակ</Text>

        {step.kind === "password" && (
          <>
            <Text style={styles.title}>Մուտք</Text>

            <Text style={styles.label}>Էլ. փոստ</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Գաղտնաբառ</Text>
            <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={submitPassword} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "…" : "Մուտք գործել"}</Text>
            </Pressable>

            {__DEV__ && (
              <Text style={styles.hint}>
                Ցուցադրական մուտքեր (գաղտնաբառ՝ omboo1234)՝{"\n"}ani.hakobyan@example.am, director@company.am
              </Text>
            )}
          </>
        )}

        {step.kind === "totp-setup" && (
          <>
            <Text style={styles.title}>Երկքայլ հաստատում</Text>
            <Text style={styles.body}>
              Backend մուտքի համար պահանջվում է հաստատող հավելված (Google Authenticator, Authy և նման)։ Սկանավորեք կոդը կամ
              մուտքագրեք բանալին ձեռքով, ապա գրեք ստացված 6-նիշանոց կոդը։
            </Text>
            <Image source={{ uri: step.qrCodeDataUrl }} style={styles.qr} />
            <Text style={styles.secret}>{step.secret}</Text>

            <Text style={styles.label}>6-նիշանոց կոդ</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={submitTotp} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "…" : "Ակտիվացնել և մուտք գործել"}</Text>
            </Pressable>
          </>
        )}

        {step.kind === "totp-challenge" && (
          <>
            <Text style={styles.title}>Երկքայլ հաստատում</Text>
            <Text style={styles.body}>Մուտքագրեք ձեր հաստատող հավելվածի 6-նիշանոց կոդը։</Text>

            <Text style={styles.label}>6-նիշանոց կոդ</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              value={code}
              onChangeText={setCode}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={submitTotp} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? "…" : "Հաստատել"}</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: 24 },
  eyebrow: { fontSize: 11, letterSpacing: 1, color: colors.muted, textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: 20 },
  label: { fontSize: 11.5, color: colors.muted, marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  codeInput: { textAlign: "center", fontSize: 20, letterSpacing: 6 },
  error: { color: "#841320", fontSize: 12.5, marginTop: 10 },
  button: { marginTop: 16, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  hint: { marginTop: 16, fontSize: 11, color: colors.muted, lineHeight: 16 },
  body: { fontSize: 12.5, color: colors.muted, marginBottom: 16, lineHeight: 18 },
  qr: { width: 160, height: 160, alignSelf: "center", borderRadius: 8, borderWidth: 1, borderColor: colors.line, marginBottom: 12 },
  secret: {
    fontSize: 12,
    color: colors.ink,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    backgroundColor: colors.paper,
    borderRadius: 6,
    paddingVertical: 8,
    marginBottom: 16,
  },
});
