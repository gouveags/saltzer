import { SaltzerClient } from "@saltzer/sdk";
import { apiBaseUrl } from "./auth-client";

export const api = new SaltzerClient({ baseUrl: apiBaseUrl });
