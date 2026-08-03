import { SaltzerClient } from "@saltzer/sdk";
import { apiBaseUrl, authClient } from "./auth-client.native";

const authenticatedFetch: typeof fetch = async (input, init = {}) => {
  const headers = new Headers(init.headers);
  const cookie = authClient.getCookie();
  if (cookie) headers.set("Cookie", cookie);
  return fetch(input, { ...init, headers });
};

export const api = new SaltzerClient({ baseUrl: apiBaseUrl, fetch: authenticatedFetch });
