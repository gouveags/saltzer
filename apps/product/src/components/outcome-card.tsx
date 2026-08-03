import type { Outcome } from "@saltzer/domain";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { fonts, type Theme } from "@/constants/theme";

interface OutcomeCardProps {
  index: number;
  outcome: Outcome;
  theme: Theme;
  pending: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onRelease: () => void;
  onTomorrow: () => void;
  onSchedule: (date: string) => void;
  onContext: () => void;
}

export function OutcomeCard(props: OutcomeCardProps) {
  const { outcome, theme } = props;
  const [expanded, setExpanded] = useState(false);
  const [targetDate, setTargetDate] = useState("");

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.hairline },
        Platform.OS === "web"
          ? { boxShadow: `0 8px 24px ${theme.shadow}` }
          : {
              elevation: 2,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 1,
              shadowRadius: 24,
            },
      ]}
    >
      <View style={styles.topline}>
        <Text style={[styles.index, { color: theme.accent }]}>0{props.index + 1}</Text>
        {outcome.estimateMinutes && (
          <Text style={[styles.estimate, { color: theme.inkMuted }]}>
            {outcome.estimateMinutes} MIN
          </Text>
        )}
      </View>
      <View style={styles.body}>
        <Pressable
          accessibilityLabel={`Complete ${outcome.title}`}
          accessibilityRole="button"
          onPress={props.onComplete}
          style={[styles.check, { borderColor: theme.ink }]}
        >
          <View style={[styles.checkInner, { backgroundColor: theme.background }]} />
        </Pressable>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.ink }]}>{outcome.title}</Text>
          {outcome.desiredOutcome ? (
            <Text style={[styles.desired, { color: theme.inkMuted }]}>
              {outcome.desiredOutcome}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityLabel={`${expanded ? "Hide" : "Show"} context and decisions for ${outcome.title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.toggle, { color: theme.moss }]}>
          {expanded ? "Hide details ↑" : "Context & decisions ↓"}
        </Text>
      </Pressable>

      {expanded && (
        <View style={[styles.details, { borderTopColor: theme.hairline }]}>
          {outcome.context ? (
            <Text style={[styles.context, { color: theme.ink }]}>{outcome.context}</Text>
          ) : (
            <Text style={[styles.contextEmpty, { color: theme.inkMuted }]}>
              No context yet. Add what a collaborator would need to begin.
            </Text>
          )}
          {outcome.constraints ? (
            <Text style={[styles.constraint, { color: theme.accent }]}>
              Guardrail — {outcome.constraints}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button compact kind="outline" onPress={props.onEdit} theme={theme}>
              Edit
            </Button>
            <Button compact kind="outline" onPress={props.onContext} theme={theme}>
              Start with AI
            </Button>
            <Button compact kind="quiet" onPress={props.onTomorrow} theme={theme}>
              Tomorrow
            </Button>
            <Button compact kind="danger" onPress={props.onRelease} theme={theme}>
              Release
            </Button>
          </View>
          <View style={styles.schedule}>
            <TextInput
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.inkMuted}
              style={[styles.dateInput, { borderColor: theme.hairline, color: theme.ink }]}
              value={targetDate}
            />
            <Button
              compact
              disabled={!targetDate}
              kind="quiet"
              onPress={() => props.onSchedule(targetDate)}
              theme={theme}
            >
              Set date
            </Button>
          </View>
        </View>
      )}
      {props.pending && (
        <View
          style={[StyleSheet.absoluteFill, styles.pending, { backgroundColor: theme.surface }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderWidth: 1,
    gap: 18,
    minHeight: 220,
    overflow: "hidden",
    padding: 22,
  },
  topline: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  index: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.3 },
  estimate: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.1 },
  body: { alignItems: "flex-start", flexDirection: "row", gap: 16 },
  check: {
    alignItems: "center",
    borderRadius: 99,
    borderWidth: 1.5,
    height: 25,
    justifyContent: "center",
    marginTop: 3,
    width: 25,
  },
  checkInner: { borderRadius: 99, height: 11, width: 11 },
  copy: { flex: 1, gap: 7 },
  title: { fontFamily: fonts.serifMedium, fontSize: 25, letterSpacing: -0.4, lineHeight: 29 },
  desired: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 21 },
  toggle: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase" },
  details: { borderTopWidth: 1, gap: 15, paddingTop: 18 },
  context: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 },
  contextEmpty: { fontFamily: fonts.serif, fontSize: 15, fontStyle: "italic", lineHeight: 22 },
  constraint: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  schedule: { alignItems: "center", flexDirection: "row", gap: 6 },
  dateInput: {
    borderBottomWidth: 1,
    fontFamily: fonts.mono,
    fontSize: 11,
    minHeight: 36,
    paddingHorizontal: 4,
    width: 124,
  },
  pending: { opacity: 0.55 },
});
