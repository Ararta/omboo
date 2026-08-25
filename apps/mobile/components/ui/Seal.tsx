import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../lib/theme";

export function Seal({ label, sub, tone = "seal" }: { label: string | number; sub: string; tone?: "seal" | "ink" }) {
  const color = tone === "ink" ? colors.ink : colors.seal;
  return (
    <View style={[styles.circle, { borderColor: color }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={[styles.sub, { color }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
  },
  label: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 9, textTransform: "uppercase", marginTop: 2, letterSpacing: 1 },
});
