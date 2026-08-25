import { Pressable, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "../../lib/theme";

type Variant = "primary" | "ghost" | "danger" | "seal";

const VARIANT_STYLES: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: "#fff", border: colors.ink },
  ghost: { bg: "transparent", fg: colors.ink, border: colors.line },
  danger: { bg: "#fff", fg: "#A02E2E", border: "#E3B9B9" },
  seal: { bg: colors.seal, fg: "#fff", border: colors.seal },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = VARIANT_STYLES[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Text style={[styles.text, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  text: { fontSize: 13.5, fontWeight: "700" },
});
