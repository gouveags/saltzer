import type { DailyRealityCheck } from "@saltzer/domain";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/button";
import { fonts, type Theme } from "@/constants/theme";

interface RealityCheckProps {
  check: DailyRealityCheck;
  closed: boolean;
  pending: boolean;
  theme: Theme;
  onSave: (minutes: number | null) => Promise<boolean>;
}

function roomCopy(check: DailyRealityCheck) {
  if (check.status === "unset") {
    return {
      title: "How much focused time is actually yours?",
      body: "Name the room before deciding whether today fits inside it.",
    };
  }
  if (check.status === "over_capacity") {
    return {
      title: `${Math.abs(check.remainingMinutes ?? 0)} minutes over capacity.`,
      body: "Make one outcome smaller, move it deliberately, or create more room.",
    };
  }
  if (check.status === "at_capacity") {
    return {
      title: "Today is fully spoken for.",
      body: "Protect the plan. New work needs an explicit tradeoff.",
    };
  }
  return {
    title: `${check.remainingMinutes ?? 0} minutes remain.`,
    body: "The work with estimates fits the room you named.",
  };
}

export function RealityCheck({ check, closed, pending, theme, onSave }: RealityCheckProps) {
  const [minutes, setMinutes] = useState(check.capacityMinutes?.toString() ?? "");
  const [editing, setEditing] = useState(check.capacityMinutes === null);
  const [error, setError] = useState<string | null>(null);
  const copy = roomCopy(check);
  const reconsidered = check.recent.released + check.recent.rescheduled;

  useEffect(() => {
    setMinutes(check.capacityMinutes?.toString() ?? "");
  }, [check.capacityMinutes]);

  async function save() {
    const parsed = Number(minutes);
    if (!Number.isInteger(parsed) || parsed < 15 || parsed > 1_440) {
      setError("Use 15 to 1,440 minutes.");
      return;
    }
    setError(null);
    if (await onSave(parsed)) setEditing(false);
  }

  async function clear() {
    setError(null);
    if (await onSave(null)) setEditing(false);
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceStrong,
          borderColor: check.status === "over_capacity" ? theme.accent : theme.hairline,
        },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.kicker, { color: theme.moss }]}>MORNING REALITY CHECK</Text>
        <Text style={[styles.title, { color: theme.ink }]}>{copy.title}</Text>
        <Text style={[styles.body, { color: theme.inkMuted }]}>{copy.body}</Text>
        {check.unestimatedOutcomes > 0 && (
          <Text style={[styles.unknown, { color: theme.accent }]}>
            {check.unestimatedOutcomes} chosen outcome
            {check.unestimatedOutcomes === 1 ? " has" : "s have"} no estimate yet.
          </Text>
        )}
      </View>

      <View style={styles.facts}>
        <Fact
          label="PLANNED"
          theme={theme}
          value={check.plannedMinutes > 0 ? `${check.plannedMinutes} min` : "—"}
        />
        <Fact
          label="WAITING"
          theme={theme}
          value={check.due.count > 0 ? `${check.due.count} due` : "None"}
        />
        <Fact
          label="LAST 7 DAYS"
          theme={theme}
          value={
            check.recent.completionRate === null
              ? "Learning"
              : `${check.recent.completed} done · ${reconsidered} reset`
          }
        />
      </View>

      {!closed && (editing || check.capacityMinutes === null) ? (
        <View style={styles.capacityForm}>
          <View style={styles.inputWrap}>
            <TextInput
              accessibilityLabel="Focused minutes available today"
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={setMinutes}
              onSubmitEditing={() => void save()}
              placeholder="120"
              placeholderTextColor={theme.inkMuted}
              selectTextOnFocus
              style={[
                styles.input,
                { borderColor: error ? theme.accent : theme.hairline, color: theme.ink },
              ]}
              value={minutes}
            />
            <Text style={[styles.unit, { color: theme.inkMuted }]}>MINUTES</Text>
          </View>
          <Button
            compact
            disabled={pending}
            loading={pending}
            onPress={() => void save()}
            theme={theme}
          >
            Set today’s room
          </Button>
          {check.capacityMinutes !== null && (
            <Pressable
              accessibilityLabel="Clear focused minutes available today"
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void clear()}
            >
              <Text style={[styles.clear, { color: theme.inkMuted }]}>CLEAR CAPACITY</Text>
            </Pressable>
          )}
          {error && <Text style={[styles.error, { color: theme.accent }]}>{error}</Text>}
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Change focused minutes available today"
          accessibilityRole="button"
          disabled={closed}
          onPress={() => setEditing(true)}
          style={styles.capacityValue}
        >
          <Text style={[styles.capacityNumber, { color: theme.ink }]}>{check.capacityMinutes}</Text>
          <Text style={[styles.capacityLabel, { color: theme.inkMuted }]}>MINUTES AVAILABLE</Text>
          {!closed && <Text style={[styles.change, { color: theme.accent }]}>CHANGE</Text>}
        </Pressable>
      )}
    </View>
  );
}

function Fact({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factValue, { color: theme.ink }]}>{value}</Text>
      <Text style={[styles.factLabel, { color: theme.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    justifyContent: "space-between",
    marginBottom: 28,
    padding: 22,
  },
  copy: { flex: 2, gap: 5, minWidth: 260 },
  kicker: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.35 },
  title: { fontFamily: fonts.display, fontSize: 25, letterSpacing: -0.5, lineHeight: 29 },
  body: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, maxWidth: 500 },
  unknown: { fontFamily: fonts.serifMedium, fontSize: 13, marginTop: 3 },
  facts: { flexDirection: "row", gap: 22 },
  fact: { gap: 3, minWidth: 72 },
  factValue: { fontFamily: fonts.serifMedium, fontSize: 15 },
  factLabel: { fontFamily: fonts.mono, fontSize: 7, letterSpacing: 0.9 },
  capacityForm: { alignItems: "flex-start", gap: 8, minWidth: 180 },
  inputWrap: { alignItems: "center", flexDirection: "row", gap: 8 },
  input: {
    borderRadius: 3,
    borderWidth: 1,
    fontFamily: fonts.display,
    fontSize: 24,
    height: 44,
    paddingHorizontal: 10,
    width: 78,
  },
  unit: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 0.9 },
  error: { fontFamily: fonts.serif, fontSize: 12 },
  clear: { fontFamily: fonts.mono, fontSize: 7, letterSpacing: 0.8 },
  capacityValue: { alignItems: "flex-end", minWidth: 118 },
  capacityNumber: { fontFamily: fonts.display, fontSize: 38, lineHeight: 40 },
  capacityLabel: { fontFamily: fonts.mono, fontSize: 7, letterSpacing: 0.8 },
  change: { fontFamily: fonts.mono, fontSize: 7, letterSpacing: 0.8, marginTop: 6 },
});
