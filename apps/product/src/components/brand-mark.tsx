import { Image, StyleSheet, Text, View } from "react-native";
import { darkTheme, fonts, type Theme } from "@/constants/theme";
import darkMark from "../../assets/images/saltzer-mark-dark.png";
import lightMark from "../../assets/images/saltzer-mark-light.png";

export function BrandMark({
  theme,
  compact = false,
  decorative = false,
  size = 40,
}: {
  theme: Theme;
  compact?: boolean;
  decorative?: boolean;
  size?: number;
}) {
  const source = theme.background === darkTheme.background ? darkMark : lightMark;

  return (
    <View style={styles.row}>
      <Image
        accessibilityLabel={compact && !decorative ? "Saltzer" : undefined}
        accessible={compact && !decorative}
        resizeMode="contain"
        source={source}
        style={{ height: size, width: size }}
      />
      {!compact && <Text style={[styles.name, { color: theme.ink }]}>saltzer</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  name: { fontFamily: fonts.display, fontSize: 27, letterSpacing: -0.9 },
});
