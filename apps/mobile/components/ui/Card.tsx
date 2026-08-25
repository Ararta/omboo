import { View, StyleSheet, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { colors } from "../../lib/theme";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
});
