import { randomUUID } from "node:crypto";
import { createDatabase } from "@saltzer/database";
import { afterAll, describe, expect, it } from "vitest";
import { createSaltzerApp } from "./app.js";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const origin = "http://localhost:8081";

function sessionCookie(response: Response): string {
  const value = response.headers.get("set-cookie") ?? "";
  const match = /(?:__Secure-)?better-auth\.session_token=[^;,\s]+/.exec(value);
  if (!match) throw new Error("Better Auth did not return a session cookie.");
  return match[0];
}

function jsonRequest(body: unknown, cookie?: string): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

describeWithDatabase("Saltzer API integration", () => {
  if (!databaseUrl) return;

  const suffix = randomUUID();
  const emails = [`owner-${suffix}@saltzer.test`, `other-${suffix}@saltzer.test`] as const;
  const instance = createSaltzerApp({
    NODE_ENV: "test",
    PORT: 4100,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: "integration-test-secret-that-is-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:4100",
    SALTZER_ALLOWED_ORIGINS: origin,
    allowedOrigins: [origin],
  });

  afterAll(async () => {
    await instance.close();
    const cleanup = createDatabase(databaseUrl);
    for (const email of emails) {
      await cleanup.client`delete from "user" where email = ${email}`;
    }
    await cleanup.client.end();
  });

  async function signUp(email: string): Promise<string> {
    const response = await instance.app.request(
      "/api/auth/sign-up/email",
      jsonRequest({ name: "Integration User", email, password: "SaltzerTest!2026" }),
    );
    expect(response.status).toBe(200);
    return sessionCookie(response);
  }

  it("protects the complete authenticated Daily Contract flow", async () => {
    const ownerCookie = await signUp(emails[0]);
    const outcomes: Array<{ id: string }> = [];

    for (let index = 1; index <= 3; index += 1) {
      const response = await instance.app.request(
        "/v1/contracts/2026-08-03/outcomes",
        jsonRequest(
          {
            title: `Outcome ${index}`,
            desiredOutcome: "A concrete result",
            context: "Only explicitly shared context",
            constraints: "No external side effects",
            estimateMinutes: 30,
            aiPermissions: ["read_context", "suggest"],
          },
          ownerCookie,
        ),
      );
      expect(response.status).toBe(200);
      outcomes.push((await response.json()) as { id: string });
    }

    const fourth = await instance.app.request(
      "/v1/contracts/2026-08-03/outcomes",
      jsonRequest(
        {
          title: "Outcome 4",
          desiredOutcome: "",
          context: "",
          constraints: "",
          estimateMinutes: null,
          aiPermissions: [],
        },
        ownerCookie,
      ),
    );
    expect(fourth.status).toBe(409);
    await expect(fourth.json()).resolves.toMatchObject({ error: { code: "DAILY_LIMIT" } });

    const context = await instance.app.request(
      `/v1/outcomes/${outcomes[0]?.id}/context-packet?date=2026-08-03`,
      { headers: { Cookie: ownerCookie, Origin: origin } },
    );
    expect(context.status).toBe(200);
    await expect(context.json()).resolves.toMatchObject({
      title: "Outcome 1",
      context: "Only explicitly shared context",
      permissions: ["read_context", "suggest"],
    });

    const focusFirst = await instance.app.request(`/v1/outcomes/${outcomes[0]?.id}/focus`, {
      ...jsonRequest({ nextAction: "Open the failing trace" }, ownerCookie),
    });
    expect(focusFirst.status).toBe(200);
    await expect(focusFirst.json()).resolves.toMatchObject({
      nextAction: "Open the failing trace",
      focusStartedAt: expect.any(String),
    });

    const focusSecond = await instance.app.request(`/v1/outcomes/${outcomes[1]?.id}/focus`, {
      ...jsonRequest({ nextAction: "Read the release diff" }, ownerCookie),
    });
    expect(focusSecond.status).toBe(200);

    const staleProgress = await instance.app.request(`/v1/outcomes/${outcomes[0]?.id}/progress`, {
      ...jsonRequest(
        { state: "continue", note: "This focus was replaced", nextAction: "Do not continue" },
        ownerCookie,
      ),
    });
    expect(staleProgress.status).toBe(409);
    await expect(staleProgress.json()).resolves.toMatchObject({
      error: { code: "OUTCOME_NOT_FOCUSED" },
    });

    const focusedToday = await instance.app.request("/v1/today?date=2026-08-03", {
      headers: { Cookie: ownerCookie, Origin: origin },
    });
    const focusedTodayBody = (await focusedToday.json()) as {
      contract: { outcomes: Array<{ id: string; focusStartedAt: string | null }> };
    };
    expect(focusedTodayBody.contract.outcomes.filter((outcome) => outcome.focusStartedAt)).toEqual([
      expect.objectContaining({ id: outcomes[1]?.id }),
    ]);

    const progress = await instance.app.request(`/v1/outcomes/${outcomes[1]?.id}/progress`, {
      ...jsonRequest(
        {
          state: "continue",
          note: "The diff is clean",
          nextAction: "Run the release checks",
        },
        ownerCookie,
      ),
    });
    expect(progress.status).toBe(200);
    await expect(progress.json()).resolves.toMatchObject({
      nextAction: "Run the release checks",
      lastProgressNote: "The diff is clean",
      focusStartedAt: expect.any(String),
    });

    const refreshedContext = await instance.app.request(
      `/v1/outcomes/${outcomes[1]?.id}/context-packet?date=2026-08-03`,
      { headers: { Cookie: ownerCookie, Origin: origin } },
    );
    await expect(refreshedContext.json()).resolves.toMatchObject({
      nextAction: "Run the release checks",
      lastProgressNote: "The diff is clean",
    });

    const tokenResponse = await instance.app.request(
      "/v1/tokens",
      jsonRequest({ name: "Integration agent" }, ownerCookie),
    );
    expect(tokenResponse.status).toBe(200);
    const { token } = (await tokenResponse.json()) as { token: string };
    expect(token).toMatch(/^saltzer_[A-Za-z0-9_-]{43}$/);

    const tokenToday = await instance.app.request("/v1/today?date=2026-08-03", {
      headers: { Authorization: `Bearer ${token}`, Origin: origin },
    });
    expect(tokenToday.status).toBe(200);
    expect(tokenToday.headers.get("x-content-type-options")).toBe("nosniff");
    expect(tokenToday.headers.get("strict-transport-security")).toContain("max-age=");
    await expect(tokenToday.json()).resolves.toMatchObject({
      contract: {
        outcomes: expect.arrayContaining([expect.objectContaining({ title: "Outcome 1" })]),
      },
    });

    const tokenEscalation = await instance.app.request(
      "/v1/tokens",
      jsonRequest({ name: "Nested token" }),
    );
    const tokenEscalationWithBearer = await instance.app.request("/v1/tokens", {
      ...jsonRequest({ name: "Nested token" }),
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Authorization: `Bearer ${token}`,
      },
    });
    expect(tokenEscalation.status).toBe(401);
    expect(tokenEscalationWithBearer.status).toBe(403);

    const otherCookie = await signUp(emails[1]);
    const crossUserUpdate = await instance.app.request(`/v1/outcomes/${outcomes[0]?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: otherCookie, Origin: origin },
      body: JSON.stringify({ title: "Stolen outcome" }),
    });
    expect(crossUserUpdate.status).toBe(404);

    const crossUserFocus = await instance.app.request(`/v1/outcomes/${outcomes[0]?.id}/focus`, {
      ...jsonRequest({ nextAction: "Steal focus" }, otherCookie),
    });
    expect(crossUserFocus.status).toBe(404);

    const prematureClose = await instance.app.request("/v1/contracts/2026-08-03/close", {
      method: "POST",
      headers: { Cookie: ownerCookie, Origin: origin },
    });
    expect(prematureClose.status).toBe(409);
    await expect(prematureClose.json()).resolves.toMatchObject({
      error: { code: "UNRESOLVED_OUTCOMES" },
    });

    for (const [index, decision] of ["complete", "release", "tomorrow"].entries()) {
      const response = await instance.app.request(
        `/v1/outcomes/${outcomes[index]?.id}/decision?date=2026-08-03`,
        jsonRequest({ decision }, ownerCookie),
      );
      expect(response.status).toBe(200);
    }

    const close = await instance.app.request("/v1/contracts/2026-08-03/close", {
      method: "POST",
      headers: { Cookie: ownerCookie, Origin: origin },
    });
    expect(close.status).toBe(200);
    await expect(close.json()).resolves.toMatchObject({
      localDate: "2026-08-03",
      status: "closed",
      closedAt: expect.any(String),
    });

    const lateAddition = await instance.app.request(
      "/v1/contracts/2026-08-03/outcomes",
      jsonRequest(
        {
          title: "Late addition",
          desiredOutcome: "",
          context: "",
          constraints: "",
          estimateMinutes: null,
          aiPermissions: [],
        },
        ownerCookie,
      ),
    );
    expect(lateAddition.status).toBe(409);
    await expect(lateAddition.json()).resolves.toMatchObject({
      error: { code: "CONTRACT_CLOSED" },
    });
  });
});
