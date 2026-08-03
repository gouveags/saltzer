import { createHash, randomBytes } from "node:crypto";
import { expo } from "@better-auth/expo";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createDatabase, DailyRepository, OutcomeNotFoundError, schema } from "@saltzer/database";
import {
  buildContextPacket,
  ContextPacketSchema,
  CreateOutcomeInputSchema,
  DailyOutcomeLimitError,
  LocalDateSchema,
  OutcomeDecisionInputSchema,
  OutcomeSchema,
  TodayViewSchema,
  UpdateOutcomeInputSchema,
} from "@saltzer/domain";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { SaltzerEnv } from "./env.js";
import { serializeOutcome, serializeToday } from "./serialize.js";

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const DateQuerySchema = z.object({ date: LocalDateSchema });
const OutcomeParamsSchema = z.object({ id: z.uuid() });

type Variables = {
  userId: string;
  authKind: "session" | "token";
};

function jsonError(code: string, message: string) {
  return { error: { code, message } };
}

export function createSaltzerApp(env: SaltzerEnv) {
  const { db, client } = createDatabase(env.DATABASE_URL);
  const repository = new DailyRepository(db);
  const auth = betterAuth({
    appName: "Saltzer",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true },
    trustedOrigins: [...env.allowedOrigins, "saltzer://", "saltzer://*"],
    plugins: [expo()],
  });

  const app = new OpenAPIHono<{ Variables: Variables }>();

  app.use(logger());
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => (env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0]),
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      maxAge: 600,
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw));

  app.use("/v1/*", async (context, next) => {
    const authorization = context.req.header("Authorization");
    if (authorization?.startsWith("Bearer ")) {
      const rawToken = authorization.slice("Bearer ".length);
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const token = await repository.findToken(tokenHash);
      if (token) {
        context.set("userId", token.userId);
        context.set("authKind", "token");
        return next();
      }
    }

    const session = await auth.api.getSession({ headers: context.req.raw.headers });
    if (!session) return context.json(jsonError("UNAUTHORIZED", "Sign in to continue."), 401);

    context.set("userId", session.user.id);
    context.set("authKind", "session");
    return next();
  });

  app.get("/health", (context) => context.json({ status: "ok" as const }));

  const todayRoute = createRoute({
    method: "get",
    path: "/v1/today",
    request: { query: DateQuerySchema },
    responses: {
      200: { content: { "application/json": { schema: TodayViewSchema } }, description: "Today" },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Unauthorized",
      },
    },
  });
  app.openapi(todayRoute, async (context) => {
    const { date } = context.req.valid("query");
    const result = await repository.getDailyContract(context.get("userId"), date);
    return context.json(serializeToday(date, result), 200);
  });

  const addOutcomeRoute = createRoute({
    method: "post",
    path: "/v1/contracts/{date}/outcomes",
    request: {
      params: z.object({ date: LocalDateSchema }),
      body: { content: { "application/json": { schema: CreateOutcomeInputSchema } } },
    },
    responses: {
      200: { content: { "application/json": { schema: OutcomeSchema } }, description: "Created" },
      409: { content: { "application/json": { schema: ErrorSchema } }, description: "Daily limit" },
    },
  });
  app.openapi(addOutcomeRoute, async (context) => {
    const { date } = context.req.valid("param");
    const input = context.req.valid("json");
    const outcome = await repository.createOutcome(context.get("userId"), date, input);
    return context.json(serializeOutcome(outcome), 200);
  });

  const updateOutcomeRoute = createRoute({
    method: "patch",
    path: "/v1/outcomes/{id}",
    request: {
      params: OutcomeParamsSchema,
      body: { content: { "application/json": { schema: UpdateOutcomeInputSchema } } },
    },
    responses: {
      200: { content: { "application/json": { schema: OutcomeSchema } }, description: "Updated" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  });
  app.openapi(updateOutcomeRoute, async (context) => {
    const { id } = context.req.valid("param");
    const outcome = await repository.updateOutcome(
      context.get("userId"),
      id,
      context.req.valid("json"),
    );
    return context.json(serializeOutcome(outcome), 200);
  });

  const decisionRoute = createRoute({
    method: "post",
    path: "/v1/outcomes/{id}/decision",
    request: {
      params: OutcomeParamsSchema,
      query: DateQuerySchema,
      body: { content: { "application/json": { schema: OutcomeDecisionInputSchema } } },
    },
    responses: {
      200: { content: { "application/json": { schema: OutcomeSchema } }, description: "Decided" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  });
  app.openapi(decisionRoute, async (context) => {
    const { id } = context.req.valid("param");
    const { date } = context.req.valid("query");
    const outcome = await repository.decideOutcome(
      context.get("userId"),
      id,
      date,
      context.req.valid("json"),
    );
    return context.json(serializeOutcome(outcome), 200);
  });

  const addToDayRoute = createRoute({
    method: "post",
    path: "/v1/outcomes/{id}/add-to-day",
    request: {
      params: OutcomeParamsSchema,
      body: {
        content: { "application/json": { schema: z.object({ localDate: LocalDateSchema }) } },
      },
    },
    responses: {
      200: { content: { "application/json": { schema: OutcomeSchema } }, description: "Added" },
      409: { content: { "application/json": { schema: ErrorSchema } }, description: "Daily limit" },
    },
  });
  app.openapi(addToDayRoute, async (context) => {
    const { id } = context.req.valid("param");
    const { localDate } = context.req.valid("json");
    const outcome = await repository.addScheduledToDay(context.get("userId"), id, localDate);
    return context.json(serializeOutcome(outcome), 200);
  });

  const contextPacketRoute = createRoute({
    method: "get",
    path: "/v1/outcomes/{id}/context-packet",
    request: { params: OutcomeParamsSchema, query: DateQuerySchema },
    responses: {
      200: {
        content: { "application/json": { schema: ContextPacketSchema } },
        description: "Permissioned AI context",
      },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  });
  app.openapi(contextPacketRoute, async (context) => {
    const { id } = context.req.valid("param");
    const { date } = context.req.valid("query");
    const outcome = serializeOutcome(await repository.getOutcome(context.get("userId"), id));
    return context.json(buildContextPacket(outcome, date), 200);
  });

  const createTokenRoute = createRoute({
    method: "post",
    path: "/v1/tokens",
    request: {
      body: {
        content: { "application/json": { schema: z.object({ name: z.string().min(1).max(80) }) } },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              id: z.uuid(),
              name: z.string(),
              scopes: z.array(z.string()),
              token: z.string(),
            }),
          },
        },
        description: "Token shown once",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Session required",
      },
    },
  });
  app.openapi(createTokenRoute, async (context) => {
    if (context.get("authKind") !== "session") {
      return context.json(
        jsonError("SESSION_REQUIRED", "Create tokens from a signed-in session."),
        403,
      );
    }

    const rawToken = `saltzer_${randomBytes(32).toString("base64url")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const token = await repository.createToken(
      context.get("userId"),
      context.req.valid("json").name,
      tokenHash,
    );
    return context.json({ ...token, token: rawToken }, 200);
  });

  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Saltzer API",
      version: "0.1.0",
      description: "The authenticated daily-execution API used by every Saltzer surface.",
    },
  });

  app.onError((error, context) => {
    if (error instanceof DailyOutcomeLimitError) {
      return context.json(jsonError("DAILY_LIMIT", error.message), 409);
    }
    if (error instanceof OutcomeNotFoundError) {
      return context.json(jsonError("NOT_FOUND", error.message), 404);
    }
    if (error instanceof z.ZodError) {
      return context.json(jsonError("INVALID_INPUT", "The request is invalid."), 400);
    }

    console.error(error instanceof Error ? error.message : "Unknown API error");
    return context.json(
      jsonError("INTERNAL_ERROR", "Saltzer could not complete the request."),
      500,
    );
  });

  return { app, auth, close: () => client.end() };
}
