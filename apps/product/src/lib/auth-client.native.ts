import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const apiBaseUrl = process.env.EXPO_PUBLIC_SALTZER_API_URL ?? "http://localhost:4100";
type BetterAuthOptions = NonNullable<Parameters<typeof createAuthClient>[0]>;
type BetterAuthPlugin = NonNullable<BetterAuthOptions["plugins"]>[number];
type NativeAuthClient = ReturnType<typeof createAuthClient> & { getCookie(): string };

const nativeExpoPlugin = expoClient({
  scheme: "saltzer",
  storagePrefix: "saltzer",
  storage: SecureStore,
}) as unknown as BetterAuthPlugin;

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  plugins: [nativeExpoPlugin],
}) as unknown as NativeAuthClient;
