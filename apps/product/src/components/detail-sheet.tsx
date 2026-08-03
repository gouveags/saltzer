import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/button";
import { fonts, type Theme } from "@/constants/theme";

interface DetailSheetProps {
  theme: Theme;
  visible: boolean;
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
  onClose: () => void;
}

export function DetailSheet({
  theme,
  visible,
  eyebrow,
  title,
  body,
  note,
  onClose,
}: DetailSheetProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.hairline }]}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text>
            <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
            {note && <Text style={[styles.note, { color: theme.inkMuted }]}>{note}</Text>}
            <View
              style={[
                styles.packet,
                { backgroundColor: theme.background, borderColor: theme.hairline },
              ]}
            >
              <Text selectable style={[styles.body, { color: theme.ink }]}>
                {body}
              </Text>
            </View>
            <Button kind="outline" onPress={onClose} theme={theme}>
              Done
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(10, 12, 10, 0.58)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  sheet: { borderRadius: 6, borderWidth: 1, maxHeight: "88%", maxWidth: 700, width: "100%" },
  content: { gap: 16, padding: 28 },
  eyebrow: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  title: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -1 },
  note: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 },
  packet: { borderRadius: 3, borderWidth: 1, padding: 20 },
  body: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 20 },
});
