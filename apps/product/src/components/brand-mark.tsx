import { StyleSheet, Text, View } from "react-native";
import { fonts, type Theme } from "@/constants/theme";

export function BrandMark({ theme, compact = false }: { theme: Theme; compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.seal, { borderColor: theme.ink }]}>
        <Text style={[styles.sealText, { color: theme.ink }]}>S</Text>
      </View>
      {!compact && <Text style={[styles.name, { color: theme.ink }]}>Saltzer</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 10 },
  seal: {
    alignItems: "center",
    borderRadius: 99,
    borderWidth: 1.5,
    height: 34,
    justifyContent: "center",
    transform: [{ rotate: "-7deg" }],
    width: 34,
  },
  sealText: { fontFamily: fonts.display, fontSize: 23, lineHeight: 29 },
  name: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.8 },
});
