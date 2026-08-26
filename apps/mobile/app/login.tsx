import { useState } from "react";
import { router } from "expo-router";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { ApiError, login } from "../lib/api-client";
import { useSession } from "../lib/session-context";
import { colors } from "../lib/theme";

export default function LoginScreen() {
  const { refreshSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      await refreshSession();
      if (user.role === "HR") {
        setError("ՄՌԿ մասնագետի աշխատատեղը դեռ հասանելի է միայն վեբ հավելվածում։");
        return;
      }
      router.replace(user.role === "DIRECTOR" ? "/director" : "/employee");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Մուտքը ձախողվեց։");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Omboo · ՄՌԿ Թվային Հարթակ</Text>
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

        <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "…" : "Մուտք գործել"}</Text>
        </Pressable>

        <Text style={styles.hint}>
          Ցուցադրական մուտքեր (գաղտնաբառ՝ omboo1234)՝{"\n"}ani.hakobyan@example.am, director@company.am
        </Text>
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
  error: { color: "#841320", fontSize: 12.5, marginTop: 10 },
  button: { marginTop: 16, backgroundColor: colors.ink, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  hint: { marginTop: 16, fontSize: 11, color: colors.muted, lineHeight: 16 },
});
