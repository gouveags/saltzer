import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4100),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SALTZER_ALLOWED_ORIGINS: z.string().default("http://localhost:8081"),
});

export function readEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = EnvSchema.parse(source);
  return {
    ...env,
    allowedOrigins: env.SALTZER_ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export type SaltzerEnv = ReturnType<typeof readEnv>;
