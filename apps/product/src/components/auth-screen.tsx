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
  View,
} from "react-native";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { fonts, type Theme } from "@/constants/theme";
import { authClient } from "@/lib/auth-client";

export function AuthScreen({ theme }: { theme: Theme }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-up");
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
      <View style={[styles.sun, { backgroundColor: theme.accentSoft, pointerEvents: "none" }]} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View
          style={[
            styles.shell,
            {
              opacity: reveal,
              transform: [
                { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.statement}>
            <BrandMark theme={theme} />
            <Text style={[styles.eyebrow, { color: theme.accent }]}>A DAILY EXECUTION SYSTEM</Text>
            <Text style={[styles.headline, { color: theme.ink }]}>
              Your backlog is not your life.
            </Text>
            <Text style={[styles.copy, { color: theme.inkMuted }]}>
              Choose what matters today. Give it context. Do the work. Let everything else wait.
            </Text>
            <View style={[styles.rule, { backgroundColor: theme.hairline }]} />
            <Text style={[styles.quote, { color: theme.ink }]}>
              “Each day has enough trouble of its own.”
            </Text>
          </View>

          <View
            style={[
              styles.card,
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
            <Text style={[styles.cardLabel, { color: theme.inkMuted }]}>BEGIN WITH TODAY</Text>
            <Text style={[styles.cardTitle, { color: theme.ink }]}>
              {mode === "sign-up" ? "Make your first contract." : "Welcome back."}
            </Text>
            {mode === "sign-up" && (
              <TextInput
                autoCapitalize="words"
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.inkMuted}
                style={[styles.input, { borderColor: theme.hairline, color: theme.ink }]}
                value={name}
              />
            )}
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.inkMuted}
              style={[styles.input, { borderColor: theme.hairline, color: theme.ink }]}
              value={email}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.inkMuted}
              secureTextEntry
              style={[styles.input, { borderColor: theme.hairline, color: theme.ink }]}
              value={password}
            />
            {error && <Text style={[styles.error, { color: theme.accent }]}>{error}</Text>}
            <Button loading={pending} onPress={submit} theme={theme}>
              {mode === "sign-up" ? "Create my day" : "Enter Saltzer"}
            </Button>
            <Pressable
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
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  shell: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 70,
    maxWidth: 1060,
    width: "100%",
    flexWrap: "wrap",
  },
  statement: { flex: 1, gap: 22, justifyContent: "center", minWidth: 300 },
  eyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.7, marginTop: 28 },
  headline: {
    fontFamily: fonts.display,
    fontSize: 64,
    letterSpacing: -2.6,
    lineHeight: 62,
    maxWidth: 620,
  },
  copy: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 30, maxWidth: 540 },
  rule: { height: 1, marginTop: 12, maxWidth: 210 },
  quote: { fontFamily: fonts.serif, fontSize: 15, fontStyle: "italic" },
  card: {
    borderRadius: 4,
    borderWidth: 1,
    gap: 15,
    justifyContent: "center",
    maxWidth: 390,
    minWidth: 310,
    padding: 34,
  },
  cardLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5 },
  cardTitle: { fontFamily: fonts.display, fontSize: 31, letterSpacing: -0.8, marginBottom: 8 },
  input: {
    borderWidth: 0,
    borderBottomWidth: 1,
    fontFamily: fonts.serif,
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 2,
  },
  error: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20 },
  switch: {
    fontFamily: fonts.serif,
    fontSize: 14,
    marginTop: 2,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  sun: {
    borderRadius: 999,
    height: 440,
    opacity: 0.28,
    position: "absolute",
    right: -120,
    top: -180,
    width: 440,
  },
});
