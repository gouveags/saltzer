#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LocalDateSchema } from "@saltzer/domain";
import { SaltzerClient } from "@saltzer/sdk";
import { z } from "zod";

const baseUrl = process.env.SALTZER_API_URL ?? "http://localhost:4100";
const token = process.env.SALTZER_TOKEN;

if (!token) {
  process.stderr.write("SALTZER_TOKEN is required for the Saltzer MCP server.\n");
  process.exit(1);
}

const client = new SaltzerClient({ baseUrl, token });
const server = new McpServer({ name: "saltzer", version: "0.1.0" });

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

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
    text(await client.decideOutcome(id, date, { decision: "release", ...(note ? { note } : {}) })),
);

server.registerTool(
  "get_context_packet",
  {
    description: "Preview exactly what Saltzer may share to help with an outcome.",
    inputSchema: { id: z.uuid(), date: LocalDateSchema },
  },
  async ({ id, date }) => text(await client.contextPacket(id, date)),
);

await server.connect(new StdioServerTransport());
