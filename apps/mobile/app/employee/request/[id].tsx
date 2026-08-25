import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { fmtDateHY, REQUEST_TYPE_LABELS } from "@omboo/shared";
import { api } from "../../../lib/api-client";
import type { RequestView } from "../../../lib/types";
import { Card } from "../../../components/ui/Card";
import { StatusPill } from "../../../components/ui/StatusPill";
import { Timeline } from "../../../components/ui/Timeline";
import { Button } from "../../../components/ui/Button";
import { colors } from "../../../lib/theme";

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<RequestView | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const all = await api.get<RequestView[]>("/requests/mine");
    setRequest(all.find((r) => r.id === id) ?? null);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

  async function cancel() {
    if (!request) return;
    await api.post(`/requests/${request.id}/cancel`);
    load();
  }

  if (loading || !request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.seal} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <Card>
        <View style={styles.spread}>
          <View>
            <Text style={styles.title}>{REQUEST_TYPE_LABELS[request.type]}</Text>
            <Text style={styles.muted}>
              {fmtDateHY(request.start)} – {fmtDateHY(request.end)} · {request.days} oր
            </Text>
            {request.orderNumber && <Text style={styles.orderNumber}>{request.orderNumber}</Text>}
          </View>
          <StatusPill status={request.status} />
        </View>
        {request.reason && <Text style={styles.reason}>«{request.reason}»</Text>}
        {request.history && <Timeline history={request.history} />}
      </Card>
      {request.status === "SUBMITTED" && (
        <Button title="Հետ կանչել հայտ-դիմումը" variant="danger" onPress={cancel} style={{ marginTop: 8 }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  spread: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 16, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 13, color: colors.muted, marginTop: 2 },
  orderNumber: { fontSize: 12, color: colors.seal, marginTop: 4, fontFamily: "Courier" },
  reason: { fontSize: 13, color: colors.muted, marginTop: 8, fontStyle: "italic" },
});
