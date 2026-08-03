import { createAuthClient } from "better-auth/react";

export const apiBaseUrl = process.env.EXPO_PUBLIC_SALTZER_API_URL ?? "http://localhost:4100";
export const authClient = createAuthClient({ baseURL: apiBaseUrl });
