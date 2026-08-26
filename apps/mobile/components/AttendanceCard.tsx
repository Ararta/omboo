import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { api, ApiError } from "../lib/api-client";
import type { AttendanceStatusView } from "../lib/types";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { colors } from "../lib/theme";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function AttendanceCard() {
  const [status, setStatus] = useState<AttendanceStatusView | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    api.get<AttendanceStatusView>("/attendance/status").then(setStatus).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function act() {
    setWorking(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        Alert.alert("Տեղորոշման թույլտվություն", "Ներկայությունը գրանցելու համար անհրաժեշտ է թույլատրել տեղորոշումը։");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      const path = status?.checkedIn ? "/attendance/check-out" : "/attendance/check-in";
      await api.post(path, point);
      load();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Չհաջողվեց գրանցել, փորձեք կրկին։";
      Alert.alert("Սխալ", message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ներկայության գրանցում</Text>
          <Text style={styles.status}>
            {status === null ? "…" : status.checkedIn ? `Ներկա եք ${formatTime(status.since!)}-ից` : "Այսօր դեռ չեք գրանցվել"}
          </Text>
        </View>
        {working && <ActivityIndicator color={colors.seal} />}
      </View>
      <Button
        title={status?.checkedIn ? "Գրանցել ելք" : "Գրանցել մուտք"}
        variant={status?.checkedIn ? "danger" : "primary"}
        onPress={act}
        disabled={working || status === null}
        style={{ marginTop: 10 }}
      />
      <Text style={styles.privacyNote}>
        Տեղորոշումն օգտագործվում է միայն այս պահին՝ ներկայությունը հաստատելու համար. ֆոնային հետևում չի կատարվում։
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 14.5, fontWeight: "700", color: colors.ink },
  status: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  privacyNote: { fontSize: 10.5, color: colors.muted, marginTop: 8, lineHeight: 14 },
});
