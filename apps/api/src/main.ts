import "dotenv/config";
import { serve } from "@hono/node-server";
import { createSaltzerApp } from "./app.js";
import { readEnv } from "./env.js";

const env = readEnv();
const { app, close } = createSaltzerApp(env);
const server = serve({ fetch: app.fetch, port: env.PORT });

console.log(`Saltzer API listening on http://localhost:${env.PORT}`);

async function shutdown() {
  server.close();
  await close();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
