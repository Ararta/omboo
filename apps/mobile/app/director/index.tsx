import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { fmtDateHY, REQUEST_TYPE_LABELS } from "@omboo/shared";
import { api, logout as apiLogout } from "../../lib/api-client";
import { useSession } from "../../lib/session-context";
import type { RequestView } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { colors } from "../../lib/theme";

export default function DirectorHome() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [pending, setPending] = useState<RequestView[]>([]);
  const [teamOut, setTeamOut] = useState<RequestView[]>([]);
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [p, t] = await Promise.all([
      api.get<RequestView[]>("/requests/pending-director"),
      api.get<RequestView[]>("/requests/team-out"),
    ]);
    setPending(p);
    setTeamOut(t);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function decide(id: string, decision: "APPROVED" | "REJECTED", note?: string) {
    await api.patch(`/requests/${id}/decision`, { decision, note });
    setRejectDraft((prev) => ({ ...prev, [id]: "" }));
    load();
  }

  async function handleLogout() {
    await apiLogout();
    await refreshSession();
    router.replace("/login");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.seal} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      {teamOut.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Այս ամիս բացակայում են</Text>
          {teamOut.map((r) => (
            <View key={r.id} style={styles.spread}>
              <Text style={styles.rowText}>{r.employee?.name}</Text>
              <Text style={styles.muted}>
                {fmtDateHY(r.start)} – {fmtDateHY(r.end)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Հաստատման սպասող ({pending.length})</Text>
      {pending.length === 0 && <Text style={styles.muted}>Ընթացիկ հայտ-դիմումներ չկան։</Text>}
      {pending.map((r) => {
        const emp = r.employee!;
        return (
          <Card key={r.id}>
            <Text style={styles.title}>{emp.name}</Text>
            <Text style={styles.muted}>{emp.position}</Text>
            <Text style={styles.body}>
              {REQUEST_TYPE_LABELS[r.type]} · {fmtDateHY(r.start)} – {fmtDateHY(r.end)} ({r.days} oր)
            </Text>
            {!!r.reason && <Text style={styles.reason}>«{r.reason}»</Text>}
            <View style={{ marginTop: 10, gap: 8 }}>
              <Button title="Հաստատել" onPress={() => decide(r.id, "APPROVED")} />
              <TextInput
                placeholder="Մերժման հիմնավորում (պարտադիր)"
                value={rejectDraft[r.id] || ""}
                onChangeText={(v) => setRejectDraft({ ...rejectDraft, [r.id]: v })}
                style={styles.input}
                multiline
              />
              <Button
                title="Մերժել"
                variant="danger"
                disabled={!rejectDraft[r.id]}
                onPress={() => decide(r.id, "REJECTED", rejectDraft[r.id])}
              />
            </View>
          </Card>
        );
      })}

      <Button title="Ելք" variant="ghost" onPress={handleLogout} style={{ marginTop: 8, marginBottom: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: 8, marginTop: 4 },
  spread: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  rowText: { fontSize: 13, color: "#4A4E5A" },
  muted: { fontSize: 13, color: colors.muted },
  title: { fontSize: 14.5, fontWeight: "700", color: colors.ink },
  body: { fontSize: 13.5, color: colors.ink, marginTop: 6 },
  reason: { fontSize: 13, color: colors.muted, marginTop: 4, fontStyle: "italic" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 8, fontSize: 12.5, backgroundColor: "#fff" },
});
