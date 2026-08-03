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
});
