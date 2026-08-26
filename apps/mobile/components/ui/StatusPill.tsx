import { View, Text, StyleSheet } from "react-native";
import type { RequestStatus } from "@omboo/shared";

const STATUS_MAP: Record<RequestStatus, { text: string; bg: string; fg: string }> = {
  SUBMITTED: { text: "Ուղարկված է", bg: "#F3EAE6", fg: "#241619" },
  APPROVED: { text: "Հաստատված է", bg: "#E6F4EC", fg: "#1F7A4D" },
  REJECTED: { text: "Մերժված է", bg: "#F5E1E0", fg: "#841320" },
  CANCELLED: { text: "Հետ կանչված է", bg: "#F5E1E0", fg: "#841320" },
  ORDER_CREATED: { text: "Հրամանը կազմված է", bg: "#F7EED0", fg: "#A9860F" },
};

export function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS_MAP[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  text: { fontSize: 12, fontWeight: "600" },
});
