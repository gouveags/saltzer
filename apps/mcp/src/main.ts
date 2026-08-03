#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SaltzerClient } from "@saltzer/sdk";
import { createMcpServer } from "./server.js";

const baseUrl = process.env.SALTZER_API_URL ?? "http://localhost:4100";
const token = process.env.SALTZER_TOKEN;

if (!token) {
  process.stderr.write("SALTZER_TOKEN is required for the Saltzer MCP server.\n");
  process.exit(1);
}

const client = new SaltzerClient({ baseUrl, token });
await createMcpServer(client).connect(new StdioServerTransport());
