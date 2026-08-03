import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { fonts, type Theme } from "@/constants/theme";

interface ButtonProps extends PropsWithChildren {
  theme: Theme;
  onPress: () => void;
  kind?: "primary" | "quiet" | "danger" | "outline";
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function Button({
  children,
  theme,
  onPress,
  kind = "primary",
  disabled = false,
  loading = false,
  compact = false,
  style,
}: ButtonProps) {
  const palette = {
    primary: { background: theme.ink, border: theme.ink, text: theme.background },
    quiet: { background: "transparent", border: "transparent", text: theme.inkMuted },
    danger: { background: "transparent", border: theme.hairline, text: theme.accent },
    outline: { background: "transparent", border: theme.hairline, text: theme.ink },
  }[kind];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.42 : pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <Text style={[styles.label, compact && styles.compactLabel, { color: palette.text }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 99,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 22,
  },
  compact: { minHeight: 36, paddingHorizontal: 14 },
  label: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.3, textTransform: "uppercase" },
  compactLabel: { fontSize: 10 },
});
