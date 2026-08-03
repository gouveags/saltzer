import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { fonts, type Theme } from "@/constants/theme";
import { authClient } from "@/lib/auth-client";

export function AuthScreen({ theme }: { theme: Theme }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [focusedField, setFocusedField] = useState<"email" | "name" | "password" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      duration: 650,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [reveal]);

  async function submit() {
    setError(null);
    if (!email.trim() || password.length < 8 || (mode === "sign-up" && !name.trim())) {
      setError("Use a valid email and a password of at least eight characters.");
      return;
    }

    setPending(true);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ email: email.trim(), name: name.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    setPending(false);
    if (result.error) setError(result.error.message ?? "Saltzer could not sign you in.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View
        style={[
          styles.watermark,
          compact && styles.watermarkCompact,
          { opacity: 0.045, pointerEvents: "none" },
        ]}
      >
        <BrandMark compact decorative size={compact ? 360 : 520} theme={theme} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.shell, compact && styles.shellCompact, { opacity: reveal }]}>
          <View style={[styles.statement, compact && styles.statementCompact]}>
            <BrandMark theme={theme} />
            <View style={styles.statementMeta}>
              <Text style={[styles.eyebrow, { color: theme.accent }]}>TODAY IS THE PRODUCT</Text>
              <Text style={[styles.edition, { color: theme.inkMuted }]}>FIELD NOTE / 01</Text>
            </View>
            <Text
              style={[styles.headline, compact && styles.headlineCompact, { color: theme.ink }]}
            >
              Your backlog is not your life.
            </Text>
            {!compact && (
              <Text style={[styles.copy, { color: theme.inkMuted }]}>
                Choose what matters today. Give it context. Do the work. Let everything else wait.
              </Text>
            )}
            <View style={[styles.quoteBlock, { borderColor: theme.hairline }]}>
              <Text style={[styles.quote, { color: theme.ink }]}>
                {compact
                  ? "“Each day has enough trouble of its own.”"
                  : "“Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.”"}
              </Text>
              <Text style={[styles.quoteSource, { color: theme.accent }]}>MATTHEW 6:34 · NIV</Text>
            </View>
          </View>

          <View
            testID="auth-card"
            style={[
              styles.card,
              compact && styles.cardCompact,
              { backgroundColor: theme.surface, borderColor: theme.hairline },
              Platform.OS === "web"
                ? { boxShadow: `0 18px 42px ${theme.shadow}` }
                : {
                    elevation: 6,
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 18 },
                    shadowOpacity: 1,
                    shadowRadius: 42,
                  },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardLabel, { color: theme.inkMuted }]}>BEGIN WITH TODAY</Text>
              <Text style={[styles.cardIndex, { color: theme.accent }]}>01 / 01</Text>
            </View>
            <View style={styles.cardTitleSlot}>
              <Text style={[styles.cardTitle, { color: theme.ink }]}>
                {mode === "sign-up" ? "Make your first contract." : "Return to your day."}
              </Text>
            </View>
            <View style={styles.nameSlot}>
              {mode === "sign-up" ? (
                <TextInput
                  accessibilityLabel="Your name"
                  autoCapitalize="words"
                  nativeID="saltzer-auth-name"
                  onBlur={() => setFocusedField(null)}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  placeholder="Your name"
                  placeholderTextColor={theme.inkMuted}
                  selectionColor={theme.accent}
                  style={[
                    styles.input,
                    {
                      borderColor: focusedField === "name" ? theme.accent : theme.hairline,
                      color: theme.ink,
                    },
                  ]}
                  value={name}
                />
              ) : (
                <View style={[styles.signInNote, { borderColor: theme.hairline }]}>
                  <Text style={[styles.signInNoteLabel, { color: theme.accent }]}>SAME DAY</Text>
                  <Text style={[styles.signInNoteText, { color: theme.inkMuted }]}>
                    Your priorities and context are waiting.
                  </Text>
                </View>
              )}
            </View>
            <TextInput
              accessibilityLabel="Email"
              autoCapitalize="none"
              autoComplete="email"
              nativeID="saltzer-auth-email"
              keyboardType="email-address"
              onBlur={() => setFocusedField(null)}
              onChangeText={setEmail}
              onFocus={() => setFocusedField("email")}
              placeholder="Email"
              placeholderTextColor={theme.inkMuted}
              selectionColor={theme.accent}
              style={[
                styles.input,
                {
                  borderColor: focusedField === "email" ? theme.accent : theme.hairline,
                  color: theme.ink,
                },
              ]}
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              nativeID="saltzer-auth-password"
              onBlur={() => setFocusedField(null)}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              placeholder="Password"
              placeholderTextColor={theme.inkMuted}
              selectionColor={theme.accent}
              secureTextEntry
              style={[
                styles.input,
                {
                  borderColor: focusedField === "password" ? theme.accent : theme.hairline,
                  color: theme.ink,
                },
              ]}
              value={password}
            />
            <View style={styles.errorSlot}>
              {error && <Text style={[styles.error, { color: theme.accent }]}>{error}</Text>}
            </View>
            <Button loading={pending} onPress={submit} theme={theme}>
              {mode === "sign-up" ? "Create my day" : "Enter Saltzer"}
            </Button>
            <Pressable
              accessibilityLabel={mode === "sign-up" ? "Sign in" : "Create an account"}
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setMode(mode === "sign-up" ? "sign-in" : "sign-up");
              }}
            >
              <Text style={[styles.switch, { color: theme.inkMuted }]}>
                {mode === "sign-up"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  scrollCompact: { justifyContent: "flex-start", padding: 20 },
  shell: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 70,
    maxWidth: 1060,
    width: "100%",
    flexWrap: "wrap",
  },
  shellCompact: { gap: 28 },
  statement: { flex: 1, gap: 20, justifyContent: "center", minWidth: 300 },
  statementCompact: { gap: 14, minWidth: 0 },
  statementMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  eyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.7 },
  edition: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.2 },
  headline: {
    fontFamily: fonts.display,
    fontSize: 66,
    letterSpacing: -2.2,
    lineHeight: 63,
    maxWidth: 620,
  },
  headlineCompact: { fontSize: 48, letterSpacing: -1.3, lineHeight: 47 },
  copy: { fontFamily: fonts.body, fontSize: 19, lineHeight: 27, maxWidth: 520 },
  quoteBlock: { borderLeftWidth: 1, gap: 12, marginTop: 10, maxWidth: 510, paddingLeft: 18 },
  quote: { fontFamily: fonts.bodyItalic, fontSize: 14, lineHeight: 20 },
  quoteSource: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.35 },
  card: {
    borderRadius: 4,
    borderWidth: 1,
    gap: 12,
    height: 520,
    maxWidth: 390,
    minWidth: 310,
    padding: 34,
    width: "100%",
  },
  cardCompact: { height: 500, minWidth: 0, padding: 26 },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  cardIndex: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.1 },
  cardTitleSlot: { justifyContent: "center", minHeight: 76 },
  cardTitle: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.9, lineHeight: 35 },
  nameSlot: { height: 52, justifyContent: "center" },
  signInNote: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 48,
  },
  signInNoteLabel: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 1.2 },
  signInNoteText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 17 },
  input: {
    borderWidth: 0,
    borderBottomWidth: 1,
    fontFamily: fonts.body,
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 2,
  },
  errorSlot: { justifyContent: "center", minHeight: 32 },
  error: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  switch: {
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 2,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  watermark: {
    position: "absolute",
    right: -160,
    top: -150,
  },
  watermarkCompact: { right: -90, top: -80 },
});
