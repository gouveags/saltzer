import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LocalDateSchema } from "@saltzer/domain";
import type { SaltzerClient } from "@saltzer/sdk";
import { z } from "zod";

export type SaltzerToolClient = Pick<
  SaltzerClient,
  "addOutcome" | "addScheduledToDay" | "closeDay" | "contextPacket" | "decideOutcome" | "today"
>;

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function createMcpServer(client: SaltzerToolClient) {
  const server = new McpServer({ name: "saltzer", version: "0.1.0" });

  server.registerTool(
    "list_daily_contract",
    {
      description: "Read the user's Daily Contract and scheduled candidates for a local date.",
      inputSchema: { date: LocalDateSchema },
    },
    async ({ date }) => text(await client.today(date)),
  );

  server.registerTool(
    "add_daily_outcome",
    {
      description: "Add one of at most three meaningful outcomes after the user has chosen it.",
      inputSchema: {
        date: LocalDateSchema,
        title: z.string().min(1).max(180),
        desiredOutcome: z.string().max(2_000).default(""),
        context: z.string().max(20_000).default(""),
        constraints: z.string().max(5_000).default(""),
        estimateMinutes: z.number().int().min(5).max(1_440).nullable().default(null),
      },
    },
    async ({ date, title, desiredOutcome, context, constraints, estimateMinutes }) =>
      text(
        await client.addOutcome(date, {
          title,
          desiredOutcome,
          context,
          constraints,
          estimateMinutes,
          aiPermissions: ["read_context", "suggest", "draft"],
        }),
      ),
  );

  server.registerTool(
    "complete_outcome",
    {
      description: "Mark an outcome complete after the result has been achieved.",
      inputSchema: { id: z.uuid(), date: LocalDateSchema },
    },
    async ({ id, date }) => text(await client.decideOutcome(id, date, { decision: "complete" })),
  );

  server.registerTool(
    "release_outcome",
    {
      description: "Deliberately release an outcome that no longer matters. This is not failure.",
      inputSchema: { id: z.uuid(), date: LocalDateSchema, note: z.string().max(2_000).optional() },
    },
    async ({ id, date, note }) =>
      text(
        await client.decideOutcome(id, date, {
          decision: "release",
          ...(note ? { note } : {}),
        }),
      ),
  );

  server.registerTool(
    "move_outcome_to_tomorrow",
    {
      description: "Move an unfinished outcome to tomorrow as an explicit user decision.",
      inputSchema: { id: z.uuid(), date: LocalDateSchema },
    },
    async ({ id, date }) => text(await client.decideOutcome(id, date, { decision: "tomorrow" })),
  );

  server.registerTool(
    "schedule_outcome",
    {
      description: "Move an unfinished outcome to a deliberate future date.",
      inputSchema: { id: z.uuid(), date: LocalDateSchema, targetDate: LocalDateSchema },
    },
    async ({ id, date, targetDate }) =>
      text(await client.decideOutcome(id, date, { decision: "schedule", targetDate })),
  );

  server.registerTool(
    "add_scheduled_outcome_to_day",
    {
      description: "Bring a scheduled candidate into the Daily Contract when capacity permits.",
      inputSchema: { id: z.uuid(), date: LocalDateSchema },
    },
    async ({ id, date }) => text(await client.addScheduledToDay(id, date)),
  );

  server.registerTool(
    "close_daily_contract",
    {
      description:
        "Close the day only after every outcome has been completed, released, or rescheduled.",
      inputSchema: { date: LocalDateSchema },
    },
    async ({ date }) => text(await client.closeDay(date)),
  );

  server.registerTool(
    "get_context_packet",
    {
      description: "Preview exactly what Saltzer may share to help with an outcome.",
      inputSchema: { id: z.uuid(), date: LocalDateSchema },
    },
    async ({ id, date }) => text(await client.contextPacket(id, date)),
  );

  return server;
}
