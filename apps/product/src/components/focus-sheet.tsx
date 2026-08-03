import type { Outcome, ProgressCheckInInput, StartFocusInput } from "@saltzer/domain";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/button";
import { fonts, type Theme } from "@/constants/theme";

interface FocusSheetProps {
  theme: Theme;
  visible: boolean;
  mode: "start" | "check-in";
  outcome: Outcome | null;
  pending: boolean;
  onClose: () => void;
  onStart: (input: StartFocusInput) => Promise<void>;
  onProgress: (input: ProgressCheckInInput) => Promise<void>;
}

export function FocusSheet({
  theme,
  visible,
  mode,
  outcome,
  pending,
  onClose,
  onStart,
  onProgress,
}: FocusSheetProps) {
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setNote("");
    setNextAction(outcome?.nextAction ?? "");
    setError(null);
  }, [outcome, visible]);

  async function start() {
    if (!nextAction.trim()) {
      setError("Name the smallest concrete move you can begin now.");
      return;
    }
    setError(null);
    await onStart({ nextAction: nextAction.trim() });
  }

  async function checkIn(state: ProgressCheckInInput["state"]) {
    if (!note.trim()) {
      setError("Capture what changed before you switch or continue.");
      return;
    }
    if (state === "continue" && !nextAction.trim()) {
      setError("Choose the next concrete move before continuing.");
      return;
    }
    setError(null);
    await onProgress({
      state,
      note: note.trim(),
      ...(nextAction.trim() ? { nextAction: nextAction.trim() } : {}),
    });
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible && outcome !== null}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.backdrop, { backgroundColor: "rgba(10, 12, 10, 0.62)" }]}
      >
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.hairline }]}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.kicker, { color: theme.accent }]}>THE EXECUTION LOOP</Text>
            <Text style={[styles.title, { color: theme.ink }]}>
              {mode === "start" ? "What will you do first?" : "What moved forward?"}
            </Text>
            <Text style={[styles.outcome, { color: theme.inkMuted }]}>{outcome?.title}</Text>

            {mode === "check-in" && (
              <Field label="What changed" theme={theme}>
                <TextInput
                  accessibilityLabel="What changed"
                  autoFocus
                  maxLength={2_000}
                  multiline
                  onChangeText={setNote}
                  placeholder="I proved the failing hop and captured the evidence"
                  placeholderTextColor={theme.inkMuted}
                  style={[
                    styles.input,
                    styles.noteInput,
                    { borderColor: theme.hairline, color: theme.ink },
                  ]}
                  value={note}
                />
              </Field>
            )}

            <Field
              label={mode === "start" ? "The next move" : "Next move if you keep going"}
              theme={theme}
            >
              <TextInput
                accessibilityLabel={
                  mode === "start" ? "The next move" : "Next move if you keep going"
                }
                autoFocus={mode === "start"}
                maxLength={500}
                multiline
                onChangeText={setNextAction}
                placeholder="Open the failing trace and identify the first broken hop"
                placeholderTextColor={theme.inkMuted}
                style={[
                  styles.input,
                  styles.nextInput,
                  { borderColor: theme.hairline, color: theme.ink },
                ]}
                value={nextAction}
              />
            </Field>

            <Text style={[styles.guidance, { color: theme.inkMuted }]}>
              Keep the move small enough to start without another planning session.
            </Text>
            {error && <Text style={[styles.error, { color: theme.accent }]}>{error}</Text>}

            <View style={styles.actions}>
              <Button kind="quiet" onPress={onClose} theme={theme}>
                Cancel
              </Button>
              {mode === "start" ? (
                <Button loading={pending} onPress={() => void start()} theme={theme}>
                  Focus this now
                </Button>
              ) : (
                <View style={styles.checkInActions}>
                  <Button
                    disabled={pending}
                    kind="danger"
                    onPress={() => void checkIn("blocked")}
                    theme={theme}
                  >
                    I’m blocked
                  </Button>
                  <Button
                    disabled={pending}
                    kind="outline"
                    onPress={() => void checkIn("pause")}
                    theme={theme}
                  >
                    Pause
                  </Button>
                  <Button loading={pending} onPress={() => void checkIn("continue")} theme={theme}>
                    Keep going
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.inkMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    alignSelf: "center",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: "94%",
    maxWidth: 720,
    width: "100%",
  },
  content: { gap: 18, padding: 28, paddingBottom: 36 },
  kicker: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  title: { fontFamily: fonts.display, fontSize: 37, letterSpacing: -1.1 },
  outcome: { fontFamily: fonts.body, fontSize: 17, lineHeight: 23, marginBottom: 4 },
  field: { gap: 7 },
  label: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.1, textTransform: "uppercase" },
  input: {
    borderRadius: 3,
    borderWidth: 1,
    fontFamily: fonts.body,
    fontSize: 17,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  noteInput: { minHeight: 92 },
  nextInput: { minHeight: 72 },
  guidance: { fontFamily: fonts.bodyItalic, fontSize: 14, lineHeight: 20 },
  error: { fontFamily: fonts.body, fontSize: 14 },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 8,
  },
  checkInActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
});
