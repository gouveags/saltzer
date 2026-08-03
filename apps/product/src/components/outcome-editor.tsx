import type { CreateOutcomeInput, Outcome } from "@saltzer/domain";
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

interface OutcomeEditorProps {
  theme: Theme;
  visible: boolean;
  outcome?: Outcome | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateOutcomeInput) => Promise<void>;
}

export function OutcomeEditor({
  theme,
  visible,
  outcome,
  pending,
  onClose,
  onSubmit,
}: OutcomeEditorProps) {
  const [title, setTitle] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(outcome?.title ?? "");
    setDesiredOutcome(outcome?.desiredOutcome ?? "");
    setContext(outcome?.context ?? "");
    setConstraints(outcome?.constraints ?? "");
    setMinutes(outcome?.estimateMinutes?.toString() ?? "");
    setError(null);
  }, [outcome, visible]);

  async function submit() {
    const parsedMinutes = minutes.trim() ? Number(minutes) : null;
    if (!title.trim()) {
      setError("Name the result that matters.");
      return;
    }
    if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes < 5)) {
      setError("Use an estimate of at least five minutes.");
      return;
    }

    setError(null);
    await onSubmit({
      title: title.trim(),
      desiredOutcome: desiredOutcome.trim(),
      context: context.trim(),
      constraints: constraints.trim(),
      estimateMinutes: parsedMinutes,
      aiPermissions: ["read_context", "suggest", "draft"],
    });
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.backdrop, { backgroundColor: "rgba(10, 12, 10, 0.54)" }]}
      >
        <View
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.hairline }]}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={[styles.kicker, { color: theme.accent }]}>THE DAILY CONTRACT</Text>
            <Text style={[styles.title, { color: theme.ink }]}>
              {outcome ? "Sharpen the outcome." : "What deserves today?"}
            </Text>
            <Text style={[styles.note, { color: theme.inkMuted }]}>
              An outcome is a result, not a vague activity. Context makes it executable.
            </Text>

            <Field label="Outcome" theme={theme}>
              <TextInput
                autoFocus
                maxLength={180}
                onChangeText={setTitle}
                placeholder="Prepare the launch note"
                placeholderTextColor={theme.inkMuted}
                style={[styles.input, { borderColor: theme.hairline, color: theme.ink }]}
                value={title}
              />
            </Field>
            <Field label="What done looks like" theme={theme}>
              <TextInput
                maxLength={2_000}
                multiline
                onChangeText={setDesiredOutcome}
                placeholder="A concise draft ready for review"
                placeholderTextColor={theme.inkMuted}
                style={[
                  styles.input,
                  styles.multiline,
                  { borderColor: theme.hairline, color: theme.ink },
                ]}
                value={desiredOutcome}
              />
            </Field>
            <Field label="Context" theme={theme}>
              <TextInput
                maxLength={20_000}
                multiline
                onChangeText={setContext}
                placeholder="Background, decisions, links, and what has already happened"
                placeholderTextColor={theme.inkMuted}
                style={[
                  styles.input,
                  styles.context,
                  { borderColor: theme.hairline, color: theme.ink },
                ]}
                value={context}
              />
            </Field>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field label="Constraints" theme={theme}>
                  <TextInput
                    maxLength={5_000}
                    onChangeText={setConstraints}
                    placeholder="Do not publish"
                    placeholderTextColor={theme.inkMuted}
                    style={[styles.input, { borderColor: theme.hairline, color: theme.ink }]}
                    value={constraints}
                  />
                </Field>
              </View>
              <View style={styles.minutes}>
                <Field label="Minutes" theme={theme}>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={setMinutes}
                    placeholder="45"
                    placeholderTextColor={theme.inkMuted}
                    style={[styles.input, { borderColor: theme.hairline, color: theme.ink }]}
                    value={minutes}
                  />
                </Field>
              </View>
            </View>
            {error && <Text style={[styles.error, { color: theme.accent }]}>{error}</Text>}
            <View style={styles.actions}>
              <Button kind="quiet" onPress={onClose} theme={theme}>
                Cancel
              </Button>
              <Button loading={pending} onPress={submit} theme={theme}>
                {outcome ? "Save context" : "Add to today"}
              </Button>
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
  note: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, marginBottom: 8, maxWidth: 520 },
  field: { gap: 7 },
  label: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.1, textTransform: "uppercase" },
  input: {
    borderRadius: 3,
    borderWidth: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  context: { minHeight: 118 },
  row: { flexDirection: "row", gap: 14 },
  flex: { flex: 1 },
  minutes: { width: 110 },
  error: { fontFamily: fonts.serif, fontSize: 14 },
  actions: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
});
