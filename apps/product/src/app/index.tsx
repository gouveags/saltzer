import {
  type ContextPacket,
  type CreateOutcomeInput,
  LocalDateSchema,
  type Outcome,
  type TodayView,
} from "@saltzer/domain";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "@/components/auth-screen";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { DetailSheet } from "@/components/detail-sheet";
import { OutcomeCard } from "@/components/outcome-card";
import { OutcomeEditor } from "@/components/outcome-editor";
import { darkTheme, fonts, lightTheme } from "@/constants/theme";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { longDate, todayLocalDate } from "@/lib/date";

export default function HomeScreen() {
  const systemScheme = useColorScheme();
  const [dark, setDark] = useState(systemScheme === "dark");
  const theme = dark ? darkTheme : lightTheme;
  const { width } = useWindowDimensions();
  const wide = width >= 920;
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const localDate = useMemo(() => todayLocalDate(), []);
  const [view, setView] = useState<TodayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Outcome | null>(null);
  const [mutationPending, setMutationPending] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    eyebrow: string;
    title: string;
    body: string;
    note?: string;
  } | null>(null);

  const loadToday = useCallback(async () => {
    if (!session?.user) return;
    setError(null);
    try {
      setView(await api.today(localDate));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saltzer could not load today.");
    } finally {
      setLoading(false);
    }
  }, [localDate, session?.user]);

  useEffect(() => {
    if (session?.user) void loadToday();
  }, [loadToday, session?.user]);

  async function mutate(action: () => Promise<unknown>, outcomeId?: string) {
    setError(null);
    setMutationPending(true);
    setPendingOutcome(outcomeId ?? null);
    try {
      await action();
      await loadToday();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saltzer could not save the decision.");
    } finally {
      setMutationPending(false);
      setPendingOutcome(null);
    }
  }

  async function saveOutcome(input: CreateOutcomeInput) {
    await mutate(() =>
      editing ? api.updateOutcome(editing.id, input) : api.addOutcome(localDate, input),
    );
    setEditorOpen(false);
    setEditing(null);
  }

  async function decide(
    outcome: Outcome,
    decision: "complete" | "release" | "tomorrow",
    targetDate?: string,
  ) {
    await mutate(
      () =>
        api.decideOutcome(outcome.id, localDate, {
          decision,
          ...(targetDate ? { targetDate: LocalDateSchema.parse(targetDate) } : {}),
        }),
      outcome.id,
    );
  }

  async function schedule(outcome: Outcome, date: string) {
    const parsed = LocalDateSchema.safeParse(date);
    if (!parsed.success) {
      setError("Use a real future date in YYYY-MM-DD format.");
      return;
    }
    await mutate(
      () =>
        api.decideOutcome(outcome.id, localDate, { decision: "schedule", targetDate: parsed.data }),
      outcome.id,
    );
  }

  async function showContext(outcome: Outcome) {
    setPendingOutcome(outcome.id);
    try {
      const packet: ContextPacket = await api.contextPacket(outcome.id, localDate);
      setDetail({
        eyebrow: "PERMISSIONED CONTEXT PACKET",
        title: "Ready for your AI.",
        note: "This is the complete payload. Saltzer never shares hidden backlog data or acts beyond these permissions.",
        body: JSON.stringify(packet, null, 2),
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Saltzer could not build the context packet.",
      );
    } finally {
      setPendingOutcome(null);
    }
  }

  async function createAgentToken() {
    setMutationPending(true);
    try {
      const token = await api.createToken("Personal CLI and MCP");
      setDetail({
        eyebrow: "AGENT ACCESS",
        title: "Copy this token now.",
        note: "Saltzer stores only its hash and will never show it again. Put it in SALTZER_TOKEN for the CLI or MCP server.",
        body: token.token,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Saltzer could not create the token.");
    } finally {
      setMutationPending(false);
    }
  }

  if (sessionPending) {
    return <LoadingScreen theme={theme} />;
  }
  if (!session?.user) {
    return <AuthScreen theme={theme} />;
  }

  const outcomes = view?.contract?.outcomes ?? [];
  const planned = outcomes.filter((outcome) => outcome.status === "planned");
  const completed = outcomes.filter((outcome) => outcome.status === "completed");
  const committedCount = outcomes.length;
  const canAdd = committedCount < 3;
  const restraintPositions = [0, 1, 2].slice(planned.length + (canAdd ? 1 : 0));
  const greetingName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={[styles.ambient, { borderColor: theme.hairline, pointerEvents: "none" }]} />
      <View style={styles.shell}>
        {wide ? (
          <View style={[styles.rail, { borderRightColor: theme.hairline }]}>
            <BrandMark theme={theme} />
            <View style={styles.railMiddle}>
              <Text style={[styles.railLabel, { color: theme.inkMuted }]}>TODAY</Text>
              <Text style={[styles.railDay, { color: theme.ink }]}>{localDate.slice(-2)}</Text>
              <Text style={[styles.railMonth, { color: theme.inkMuted }]}>
                {longDate(localDate).split(" ")[1]}
              </Text>
            </View>
            <View style={styles.railBottom}>
              <Pressable onPress={() => setDark(!dark)}>
                <Text style={[styles.railAction, { color: theme.inkMuted }]}>
                  {dark ? "LIGHT" : "DARK"}
                </Text>
              </Pressable>
              <Pressable onPress={() => void authClient.signOut()}>
                <Text style={[styles.railAction, { color: theme.inkMuted }]}>SIGN OUT</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.mobileHeader, { borderBottomColor: theme.hairline }]}>
            <BrandMark compact theme={theme} />
            <Text style={[styles.mobileDate, { color: theme.inkMuted }]}>
              {longDate(localDate)}
            </Text>
            <Pressable onPress={() => setDark(!dark)}>
              <Text style={[styles.mobileTheme, { color: theme.ink }]}>◐</Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.content, !wide && styles.contentMobile]}
          refreshControl={
            <RefreshControl onRefresh={loadToday} refreshing={loading} tintColor={theme.accent} />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: theme.accent }]}>
                {longDate(localDate).toUpperCase()}
              </Text>
              <Text style={[styles.heading, !wide && styles.headingMobile, { color: theme.ink }]}>
                Good morning, {greetingName}.
              </Text>
              <Text style={[styles.subheading, { color: theme.inkMuted }]}>
                Choose what will make today meaningful. Three is enough.
              </Text>
            </View>
            <View style={[styles.progress, { borderColor: theme.hairline }]}>
              <Text style={[styles.progressNumber, { color: theme.ink }]}>
                {completed.length}/{Math.max(committedCount, 3)}
              </Text>
              <Text style={[styles.progressLabel, { color: theme.inkMuted }]}>DONE</Text>
            </View>
          </View>

          {error && (
            <View
              style={[
                styles.error,
                { backgroundColor: theme.accentSoft, borderColor: theme.accent },
              ]}
            >
              <Text style={[styles.errorText, { color: theme.ink }]}>{error}</Text>
              <Pressable onPress={() => setError(null)}>
                <Text style={[styles.errorClose, { color: theme.ink }]}>×</Text>
              </Pressable>
            </View>
          )}

          {(view?.scheduledCandidates.length ?? 0) > 0 && (
            <View
              style={[
                styles.scheduled,
                { backgroundColor: theme.surfaceStrong, borderColor: theme.hairline },
              ]}
            >
              <View style={styles.scheduledCopy}>
                <Text style={[styles.scheduledLabel, { color: theme.moss }]}>
                  ARRIVED FOR TODAY
                </Text>
                <Text style={[styles.scheduledTitle, { color: theme.ink }]}>
                  {view?.scheduledCandidates[0]?.title}
                </Text>
              </View>
              <Button
                compact
                disabled={!canAdd}
                kind="outline"
                onPress={() => {
                  const candidate = view?.scheduledCandidates[0];
                  if (candidate)
                    void mutate(() => api.addScheduledToDay(candidate.id, localDate), candidate.id);
                }}
                theme={theme}
              >
                Bring into today
              </Button>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionKicker, { color: theme.inkMuted }]}>
                YOUR DAILY CONTRACT
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.ink }]}>Today’s outcomes</Text>
            </View>
            <Text style={[styles.capacity, { color: theme.inkMuted }]}>
              {committedCount} OF 3 CHOSEN
            </Text>
          </View>

          {loading && !view ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : (
            <View style={styles.grid}>
              {planned.map((outcome, index) => (
                <View key={outcome.id} style={[styles.cardWrap, wide && styles.cardWrapWide]}>
                  <OutcomeCard
                    index={outcome.position ?? index}
                    onComplete={() => void decide(outcome, "complete")}
                    onContext={() => void showContext(outcome)}
                    onEdit={() => {
                      setEditing(outcome);
                      setEditorOpen(true);
                    }}
                    onRelease={() => void decide(outcome, "release")}
                    onSchedule={(date) => void schedule(outcome, date)}
                    onTomorrow={() => void decide(outcome, "tomorrow")}
                    outcome={outcome}
                    pending={pendingOutcome === outcome.id}
                    theme={theme}
                  />
                </View>
              ))}
              {canAdd && (
                <Pressable
                  onPress={() => {
                    setEditing(null);
                    setEditorOpen(true);
                  }}
                  style={({ pressed }) => [
                    styles.emptySlot,
                    wide && styles.cardWrapWide,
                    { borderColor: theme.hairline, opacity: pressed ? 0.62 : 1 },
                  ]}
                >
                  <Text style={[styles.plus, { color: theme.accent }]}>＋</Text>
                  <Text style={[styles.emptyTitle, { color: theme.ink }]}>Choose an outcome</Text>
                  <Text style={[styles.emptyCopy, { color: theme.inkMuted }]}>
                    What result would make today count?
                  </Text>
                </Pressable>
              )}
              {restraintPositions.map((position) => (
                <View
                  key={`restraint-${position}`}
                  style={[
                    styles.restraint,
                    wide && styles.cardWrapWide,
                    { borderColor: theme.hairline },
                  ]}
                >
                  <Text style={[styles.restraintText, { color: theme.inkMuted }]}>
                    The empty space is intentional.
                  </Text>
                </View>
              ))}
            </View>
          )}

          {completed.length > 0 && (
            <View style={[styles.completed, { borderTopColor: theme.hairline }]}>
              <Text style={[styles.sectionKicker, { color: theme.success }]}>
                COMPLETED WITH CARE
              </Text>
              {completed.map((outcome) => (
                <Text key={outcome.id} style={[styles.completedItem, { color: theme.inkMuted }]}>
                  ✓ {outcome.title}
                </Text>
              ))}
            </View>
          )}

          <View style={[styles.agent, !wide && styles.agentMobile, { backgroundColor: theme.ink }]}>
            <View style={styles.agentCopy}>
              <Text style={[styles.agentKicker, { color: theme.accentSoft }]}>
                FOR THE TOOLS YOU TRUST
              </Text>
              <Text style={[styles.agentTitle, { color: theme.background }]}>
                You and your AI can share the same day.
              </Text>
              <Text style={[styles.agentBody, { color: theme.background }]}>
                Use the CLI or MCP server with an explicit, revocable token. Context remains visible
                and permissioned.
              </Text>
            </View>
            <Button
              loading={mutationPending}
              onPress={createAgentToken}
              style={styles.agentButton}
              theme={{ ...theme, ink: theme.background, background: theme.ink }}
            >
              Create agent token
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerQuote, { color: theme.ink }]}>
              What matters is what you will do today.
            </Text>
            <Text style={[styles.footerNote, { color: theme.inkMuted }]}>The rest is noise.</Text>
          </View>
        </ScrollView>
      </View>

      <OutcomeEditor
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={saveOutcome}
        outcome={editing}
        pending={mutationPending}
        theme={theme}
        visible={editorOpen}
      />
      <DetailSheet
        body={detail?.body ?? ""}
        eyebrow={detail?.eyebrow ?? ""}
        {...(detail?.note ? { note: detail.note } : {})}
        onClose={() => setDetail(null)}
        theme={theme}
        title={detail?.title ?? ""}
        visible={detail !== null}
      />
    </SafeAreaView>
  );
}

function LoadingScreen({ theme }: { theme: typeof lightTheme | typeof darkTheme }) {
  return (
    <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
      <BrandMark theme={theme} />
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  shell: { flex: 1, flexDirection: "row" },
  ambient: {
    borderRadius: 999,
    borderWidth: 1,
    height: 540,
    opacity: 0.32,
    position: "absolute",
    right: -260,
    top: -260,
    width: 540,
  },
  rail: {
    alignItems: "center",
    borderRightWidth: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 26,
    width: 102,
  },
  railMiddle: { alignItems: "center", gap: 3 },
  railLabel: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.4, marginBottom: 10 },
  railDay: { fontFamily: fonts.display, fontSize: 47, lineHeight: 48 },
  railMonth: { fontFamily: fonts.serif, fontSize: 13 },
  railBottom: { alignItems: "center", gap: 18 },
  railAction: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    transform: [{ rotate: "-90deg" }],
    width: 58,
  },
  mobileHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  mobileDate: { fontFamily: fonts.serif, fontSize: 12 },
  mobileTheme: { fontSize: 20 },
  content: {
    alignSelf: "center",
    maxWidth: 1240,
    paddingBottom: 80,
    paddingHorizontal: 56,
    paddingTop: 58,
    width: "100%",
  },
  contentMobile: { paddingHorizontal: 18, paddingTop: 34 },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 58,
  },
  headerCopy: { flex: 1, gap: 11 },
  kicker: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.55 },
  heading: { fontFamily: fonts.display, fontSize: 53, letterSpacing: -2, lineHeight: 56 },
  headingMobile: { fontSize: 39, letterSpacing: -1.3, lineHeight: 42 },
  subheading: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, maxWidth: 540 },
  progress: {
    alignItems: "center",
    borderRadius: 99,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    marginLeft: 20,
    width: 84,
  },
  progressNumber: { fontFamily: fonts.display, fontSize: 24 },
  progressLabel: { fontFamily: fonts.mono, fontSize: 7, letterSpacing: 1.1 },
  error: {
    alignItems: "center",
    borderLeftWidth: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    padding: 14,
  },
  errorText: { flex: 1, fontFamily: fonts.serif, fontSize: 15 },
  errorClose: { fontFamily: fonts.serif, fontSize: 24, marginLeft: 12 },
  scheduled: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    padding: 18,
  },
  scheduledCopy: { flex: 1, gap: 5 },
  scheduledLabel: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.2 },
  scheduledTitle: { fontFamily: fonts.serifMedium, fontSize: 18 },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionKicker: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.35 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 31, letterSpacing: -0.8, marginTop: 4 },
  capacity: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  cardWrap: { width: "100%" },
  cardWrapWide: { flexBasis: "31.8%", flexGrow: 1, maxWidth: "49%" },
  emptySlot: {
    alignItems: "center",
    borderRadius: 4,
    borderStyle: "dashed",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 220,
    padding: 24,
    width: "100%",
  },
  plus: { fontFamily: fonts.serif, fontSize: 31, marginBottom: 6 },
  emptyTitle: { fontFamily: fonts.serifMedium, fontSize: 20 },
  emptyCopy: { fontFamily: fonts.serif, fontSize: 14, marginTop: 5, textAlign: "center" },
  restraint: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 220,
    opacity: 0.45,
    width: "100%",
  },
  restraintText: { fontFamily: fonts.serif, fontSize: 14, fontStyle: "italic" },
  loadingBlock: { alignItems: "center", minHeight: 260, paddingTop: 80 },
  completed: { borderTopWidth: 1, gap: 9, marginTop: 34, paddingTop: 24 },
  completedItem: { fontFamily: fonts.serif, fontSize: 16, textDecorationLine: "line-through" },
  agent: {
    alignItems: "center",
    borderRadius: 4,
    flexDirection: "row",
    gap: 32,
    justifyContent: "space-between",
    marginTop: 54,
    padding: 28,
  },
  agentMobile: { alignItems: "stretch", flexDirection: "column" },
  agentCopy: { flex: 1, gap: 7 },
  agentKicker: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.3 },
  agentTitle: { fontFamily: fonts.display, fontSize: 27, letterSpacing: -0.6 },
  agentBody: {
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 640,
    opacity: 0.72,
  },
  agentButton: { minWidth: 190 },
  footer: { alignItems: "center", marginTop: 74 },
  footerQuote: { fontFamily: fonts.display, fontSize: 24, textAlign: "center" },
  footerNote: { fontFamily: fonts.serif, fontSize: 15, fontStyle: "italic", marginTop: 4 },
  loadingScreen: { alignItems: "center", flex: 1, gap: 24, justifyContent: "center" },
});
