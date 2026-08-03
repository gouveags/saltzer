import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMcpServer, type SaltzerToolClient } from "./server.js";

const outcomeId = "550e8400-e29b-41d4-a716-446655440000";

describe("Saltzer MCP server", () => {
  const openConnections: Array<{ close: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(openConnections.splice(0).map((connection) => connection.close()));
  });

  async function connect(clientImplementation: SaltzerToolClient) {
    const server = createMcpServer(clientImplementation);
    const protocolClient = new Client({ name: "saltzer-test", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), protocolClient.connect(clientTransport)]);
    openConnections.push(server, protocolClient);
    return protocolClient;
  }

  function fakeClient(): SaltzerToolClient {
    return {
      today: vi.fn(async (date) => ({ localDate: date, contract: null, scheduledCandidates: [] })),
      addOutcome: vi.fn(),
      addScheduledToDay: vi.fn(),
      closeDay: vi.fn(async (date) => ({ localDate: date, status: "closed" }) as never),
      contextPacket: vi.fn(),
      decideOutcome: vi.fn(async () => ({ id: outcomeId }) as never),
    };
  }

  it("exposes every deliberate Daily Contract operation", async () => {
    const protocolClient = await connect(fakeClient());
    const { tools } = await protocolClient.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "list_daily_contract",
      "add_daily_outcome",
      "complete_outcome",
      "release_outcome",
      "move_outcome_to_tomorrow",
      "schedule_outcome",
      "add_scheduled_outcome_to_day",
      "close_daily_contract",
      "get_context_packet",
    ]);
  });

  it("closes the exact local date requested by the agent", async () => {
    const implementation = fakeClient();
    const protocolClient = await connect(implementation);

    const result = await protocolClient.callTool({
      name: "close_daily_contract",
      arguments: { date: "2026-08-03" },
    });

    expect(implementation.closeDay).toHaveBeenCalledWith("2026-08-03");
    expect(result.isError).not.toBe(true);
  });

  it("maps tomorrow to an explicit domain decision", async () => {
    const implementation = fakeClient();
    const protocolClient = await connect(implementation);

    const result = await protocolClient.callTool({
      name: "move_outcome_to_tomorrow",
      arguments: { id: outcomeId, date: "2026-08-03" },
    });

    expect(implementation.decideOutcome).toHaveBeenCalledWith(outcomeId, "2026-08-03", {
      decision: "tomorrow",
    });
    expect(result.isError).not.toBe(true);
  });
});
