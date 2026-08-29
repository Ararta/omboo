import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { fmtDateHY, REQUEST_TYPE_LABELS } from "@omboo/shared";
import { api, ApiError, logout as apiLogout } from "../../lib/api-client";
import { useSession } from "../../lib/session-context";
import type { EmployeeView, RequestView } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Seal } from "../../components/ui/Seal";
import { StatusPill } from "../../components/ui/StatusPill";
import { Button } from "../../components/ui/Button";
import { AttendanceCard } from "../../components/AttendanceCard";
import { colors } from "../../lib/theme";

export default function EmployeeHome() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [me, setMe] = useState<EmployeeView | null>(null);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [teamOut, setTeamOut] = useState<RequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [meRes, reqRes, teamRes] = await Promise.all([
        api.get<EmployeeView>("/employees/me"),
        api.get<RequestView[]>("/requests/mine"),
        api.get<RequestView[]>("/requests/team-out"),
      ]);
      setMe(meRes);
      setRequests(reqRes);
      setTeamOut(teamRes);
    } catch (e) {
      // A stale/expired session (refresh failed, tokens cleared) lands here — re-sync the
      // session context so the layout guard's `!session` check picks it up and redirects to
      // /login, instead of leaving the screen stuck on its spinner forever.
      await refreshSession();
      const message = e instanceof ApiError ? e.message : "Չհաջողվեց բեռնել տվյալները։";
      Alert.alert("Սխալ", message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function respondRecall(requestId: string, accept: boolean) {
    try {
      await api.patch(`/recalls/${requestId}/respond`, { accept });
      load();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Չհաջողվեց ուղարկել պատասխանը, փորձեք կրկին։";
      Alert.alert("Սխալ", message);
    }
  }

  async function handleLogout() {
    await apiLogout();
    await refreshSession();
    router.replace("/login");
  }

  if (loading || !me) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.seal} />
      </View>
    );
  }

  const pendingRecalls = requests.filter((r) => r.recall && r.recall.status === "PENDING_EMPLOYEE");

  return (
    <ScrollView style={styles.screen} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <AttendanceCard />

      <View style={styles.row}>
        <Card style={{ flex: 1, marginRight: 8, alignItems: "center" }}>
          <Text style={styles.mutedSmall}>Արձակուրդ</Text>
          <Seal label={me.balance} sub="oր մնացորդ" />
        </Card>
        <Card style={{ flex: 1, marginLeft: 8, alignItems: "center" }}>
          <Text style={styles.mutedSmall}>Ազատ oր</Text>
          <Seal label={me.dayOffBalance} sub="ազատ oր" tone="ink" />
        </Card>
      </View>

      {pendingRecalls.map((r) => (
        <Card key={"recall-" + r.id} style={{ borderColor: "#E8C9C9", backgroundColor: "#FBF5F5" }}>
          <Text style={styles.cardTitle}>Հայտ-դիմում՝ վաղաժամկետ վերադարձի մասին</Text>
          <Text style={styles.cardBody}>
            ՄՌԿ-ն խնդրում է Ձեզ վերադառնալ {fmtDateHY(r.recall!.requestedEnd)}-ից (փոխարեն {fmtDateHY(r.end)}-ի)՝ «
            {r.recall!.reason}»։
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Button title="Համաձայն եմ" onPress={() => respondRecall(r.id, true)} />
            <Button title="Մերժել" variant="danger" onPress={() => respondRecall(r.id, false)} />
          </View>
        </Card>
      ))}

      <Button title="+ Նոր հայտ-դիմում" onPress={() => router.push("/employee/new-request")} style={{ marginBottom: 12 }} />

      {teamOut.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Այս ամիս բացակայում են</Text>
          {teamOut.map((r) => (
            <View key={r.id} style={styles.spread}>
              <Text style={styles.rowText}>{r.employee?.name}</Text>
              <Text style={styles.mutedSmall}>
                {fmtDateHY(r.start)} – {fmtDateHY(r.end)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Իմ հայտ-դիմումները</Text>
      {requests.length === 0 && <Text style={styles.mutedSmall}>Դեռ հայտ-դիմումներ չկան։</Text>}
      {requests.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/employee/request/${r.id}`)}>
          <Card>
            <View style={styles.spread}>
              <View>
                <Text style={styles.cardTitle}>{REQUEST_TYPE_LABELS[r.type]}</Text>
                <Text style={styles.mutedSmall}>
                  {fmtDateHY(r.start)} – {fmtDateHY(r.end)} · {r.days} oր
                </Text>
              </View>
              <StatusPill status={r.status} />
            </View>
          </Card>
        </Pressable>
      ))}

      <Button title="Ելք" variant="ghost" onPress={handleLogout} style={{ marginTop: 12, marginBottom: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  row: { flexDirection: "row", marginBottom: 4 },
  mutedSmall: { fontSize: 12, color: colors.muted, marginBottom: 6 },
  cardTitle: { fontSize: 14.5, fontWeight: "700", color: colors.ink },
  cardBody: { fontSize: 13, color: "#4A4E5A", marginTop: 6 },
  spread: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowText: { fontSize: 13, color: "#4A4E5A" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 8, marginBottom: 8 },
});
