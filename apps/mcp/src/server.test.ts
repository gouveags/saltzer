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
      today: vi.fn(
        async (date) =>
          ({
            localDate: date,
            contract: null,
            scheduledCandidates: [],
            realityCheck: {
              localDate: date,
              capacityMinutes: null,
              plannedMinutes: 0,
              unestimatedOutcomes: 0,
              remainingMinutes: null,
              status: "unset",
              due: { count: 0, estimatedMinutes: 0, unestimatedOutcomes: 0 },
              recent: {
                lookbackDays: 7,
                daysReviewed: 0,
                completed: 0,
                released: 0,
                rescheduled: 0,
                completionRate: null,
              },
            },
          }) as never,
      ),
      addOutcome: vi.fn(),
      addScheduledToDay: vi.fn(),
      closeDay: vi.fn(async (date) => ({ localDate: date, status: "closed" }) as never),
      checkInProgress: vi.fn(async () => ({ id: outcomeId }) as never),
      contextPacket: vi.fn(),
      decideOutcome: vi.fn(async () => ({ id: outcomeId }) as never),
      startFocus: vi.fn(async () => ({ id: outcomeId }) as never),
      setDailyCapacity: vi.fn(async (date, input) => ({ localDate: date, ...input })),
    };
  }

  it("exposes every deliberate Daily Contract operation", async () => {
    const protocolClient = await connect(fakeClient());
    const { tools } = await protocolClient.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "list_daily_contract",
      "set_daily_capacity",
      "add_daily_outcome",
      "complete_outcome",
      "release_outcome",
      "move_outcome_to_tomorrow",
      "schedule_outcome",
      "add_scheduled_outcome_to_day",
      "start_focus",
      "record_progress",
      "close_daily_contract",
      "get_context_packet",
    ]);
  });

  it("lets the agent share an explicit capacity without inferring one", async () => {
    const implementation = fakeClient();
    const protocolClient = await connect(implementation);

    const result = await protocolClient.callTool({
      name: "set_daily_capacity",
      arguments: { date: "2026-08-03", capacityMinutes: 180 },
    });

    expect(implementation.setDailyCapacity).toHaveBeenCalledWith("2026-08-03", {
      capacityMinutes: 180,
    });
    expect(result.isError).not.toBe(true);
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

  it("lets an agent advance the user's active outcome without choosing it", async () => {
    const implementation = fakeClient();
    const protocolClient = await connect(implementation);

    await protocolClient.callTool({
      name: "start_focus",
      arguments: { id: outcomeId, nextAction: "Open the failing trace" },
    });
    await protocolClient.callTool({
      name: "record_progress",
      arguments: {
        id: outcomeId,
        state: "continue",
        note: "Found the failing hop",
        nextAction: "Add the regression test",
      },
    });

    expect(implementation.startFocus).toHaveBeenCalledWith(outcomeId, {
      nextAction: "Open the failing trace",
    });
    expect(implementation.checkInProgress).toHaveBeenCalledWith(outcomeId, {
      state: "continue",
      note: "Found the failing hop",
      nextAction: "Add the regression test",
    });
  });
});
