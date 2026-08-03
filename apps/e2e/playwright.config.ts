import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const workspace = resolve(import.meta.dirname, "../..");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:8081",
    colorScheme: "dark",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @saltzer/api dev",
      cwd: workspace,
      env: {
        BETTER_AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters-long",
        BETTER_AUTH_URL: "http://localhost:4100",
        DATABASE_URL:
          process.env.DATABASE_URL ?? "postgres://saltzer:saltzer@localhost:5439/saltzer",
        NODE_ENV: "test",
        PORT: "4100",
        SALTZER_ALLOWED_ORIGINS: "http://localhost:8081",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://localhost:4100/health",
    },
    {
      command: "pnpm --filter @saltzer/product web -- --port 8081",
      cwd: workspace,
      env: {
        CI: "1",
        EXPO_PUBLIC_SALTZER_API_URL: "http://localhost:4100",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://localhost:8081",
    },
  ],
});
