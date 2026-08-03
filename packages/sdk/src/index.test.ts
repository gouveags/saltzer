import { describe, expect, it, vi } from "vitest";
import { SaltzerClient } from "./index.js";

describe("SaltzerClient", () => {
  it("preserves the browser receiver when it uses the global fetch implementation", async () => {
    const originalFetch = globalThis.fetch;
    const receiverAwareFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        new Response(
          JSON.stringify({ localDate: "2026-08-03", contract: null, scheduledCandidates: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    globalThis.fetch = receiverAwareFetch as typeof fetch;

    try {
      const client = new SaltzerClient({ baseUrl: "https://saltzer.example" });
      await expect(client.today("2026-08-03")).resolves.toMatchObject({
        localDate: "2026-08-03",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(receiverAwareFetch).toHaveBeenCalledOnce();
  });

  it("sends API tokens without leaking them into the URL", async () => {
    const request = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret-token");
      return new Response(
        JSON.stringify({
          localDate: "2026-08-03",
          contract: null,
          scheduledCandidates: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const client = new SaltzerClient({
      baseUrl: "https://saltzer.example/",
      token: "secret-token",
      fetch: request as typeof fetch,
    });

    await client.today("2026-08-03");

    expect(request).toHaveBeenCalledWith(
      "https://saltzer.example/v1/today?date=2026-08-03",
      expect.any(Object),
    );
  });

  it("surfaces structured API failures", async () => {
    const client = new SaltzerClient({
      baseUrl: "https://saltzer.example",
      fetch: async () =>
        new Response(JSON.stringify({ error: { code: "DAILY_LIMIT", message: "Only three." } }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
    });

    await expect(
      client.addOutcome("2026-08-03", {
        title: "Fourth",
        desiredOutcome: "",
        context: "",
        constraints: "",
        estimateMinutes: null,
        aiPermissions: [],
      }),
    ).rejects.toMatchObject({ status: 409, code: "DAILY_LIMIT" });
  });

  it("closes a day through the explicit contract endpoint", async () => {
    const request = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            localDate: "2026-08-03",
            status: "closed",
            closedAt: "2026-08-04T00:12:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    const client = new SaltzerClient({
      baseUrl: "https://saltzer.example",
      fetch: request as typeof fetch,
    });

    await expect(client.closeDay("2026-08-03")).resolves.toMatchObject({ status: "closed" });
    expect(request).toHaveBeenCalledWith(
      "https://saltzer.example/v1/contracts/2026-08-03/close",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("starts focus and records progress through explicit execution endpoints", async () => {
    const outcome = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      contractId: "4c86c4fe-81de-4fdd-94df-a43dd4ae4827",
      title: "Trace the production failure",
      desiredOutcome: "The failing hop is proven",
      context: "",
      constraints: "",
      nextAction: "Open the failing trace",
      estimateMinutes: 50,
      aiPermissions: ["read_context", "suggest"],
      status: "planned",
      scheduledFor: null,
      position: 0,
      focusStartedAt: "2026-08-03T12:00:00.000Z",
      lastProgressNote: "",
      lastProgressAt: null,
      blockedAt: null,
      completedAt: null,
      releasedAt: null,
      createdAt: "2026-08-03T11:00:00.000Z",
      updatedAt: "2026-08-03T12:00:00.000Z",
    };
    const request = vi.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify(outcome), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const client = new SaltzerClient({
      baseUrl: "https://saltzer.example",
      fetch: request as typeof fetch,
    });

    await expect(
      client.startFocus(outcome.id, { nextAction: outcome.nextAction }),
    ).resolves.toEqual(outcome);
    await expect(
      client.checkInProgress(outcome.id, {
        state: "continue",
        note: "Found the failing hop",
        nextAction: "Add the regression test",
      }),
    ).resolves.toEqual(outcome);

    expect(request).toHaveBeenNthCalledWith(
      1,
      `https://saltzer.example/v1/outcomes/${outcome.id}/focus`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      `https://saltzer.example/v1/outcomes/${outcome.id}/progress`,
      expect.objectContaining({ method: "POST" }),
    );
  });
});
