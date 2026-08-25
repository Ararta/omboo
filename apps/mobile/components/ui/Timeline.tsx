import { View, Text, StyleSheet } from "react-native";
import { fmtDateHY } from "@omboo/shared";
import { colors } from "../../lib/theme";

export interface HistoryEntryView {
  id: string;
  step: string;
  actorDisplayName: string;
  note?: string | null;
  createdAt: string;
}

function fmtDateTimeHY(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDateHY(iso.slice(0, 10))}, ${hh}:${mm}`;
}

export function Timeline({ history }: { history: HistoryEntryView[] }) {
  return (
    <View style={{ marginTop: 10 }}>
      {history.map((h, i) => (
        <View key={h.id} style={styles.row}>
          <View style={styles.dotColumn}>
            <View style={styles.dot} />
            {i < history.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.content}>
            <Text style={styles.step}>{h.step}</Text>
            <Text style={styles.meta}>
              {h.actorDisplayName} · {fmtDateTimeHY(h.createdAt)}
            </Text>
            {!!h.note && <Text style={styles.note}>«{h.note}»</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dotColumn: { alignItems: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.seal, marginTop: 4 },
  line: { width: 1, flex: 1, backgroundColor: colors.line, marginTop: 2 },
  content: { flex: 1, paddingBottom: 2 },
  step: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  note: { fontSize: 12.5, color: "#4A4E5A", marginTop: 3, fontStyle: "italic" },
});
