import { randomUUID } from "node:crypto";
import {
  DailyContractClosedError,
  DailyOutcomeLimitError,
  UnresolvedDailyOutcomesError,
} from "@saltzer/domain";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { DailyRepository } from "./repository.js";
import { outcomeEvents, user } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("DailyRepository integration", () => {
  if (!databaseUrl) return;

  const userId = `integration-${randomUUID()}`;
  const { db, client } = createDatabase(databaseUrl);
  const repository = new DailyRepository(db);

  beforeAll(async () => {
    await db.insert(user).values({
      id: userId,
      name: "Concurrency Test",
      email: `${userId}@saltzer.test`,
    });
  });

  afterAll(async () => {
    await db.delete(user).where(eq(user.id, userId));
    await client.end();
  });

  it("keeps the Daily Contract at three outcomes under concurrent writes", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, (_, index) =>
        repository.createOutcome(userId, "2026-08-03", {
          title: `Outcome ${index + 1}`,
          desiredOutcome: "",
          context: "",
          constraints: "",
          estimateMinutes: null,
          aiPermissions: [],
        }),
      ),
    );

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(3);
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ reason: expect.any(DailyOutcomeLimitError) });

    const day = await repository.getDailyContract(userId, "2026-08-03");
    expect(day.outcomes).toHaveLength(3);

    await expect(repository.closeDailyContract(userId, "2026-08-03")).rejects.toBeInstanceOf(
      UnresolvedDailyOutcomesError,
    );

    await Promise.all([
      repository.decideOutcome(userId, day.outcomes[0]?.id ?? "", "2026-08-03", {
        decision: "complete",
      }),
      repository.decideOutcome(userId, day.outcomes[1]?.id ?? "", "2026-08-03", {
        decision: "release",
      }),
      repository.decideOutcome(userId, day.outcomes[2]?.id ?? "", "2026-08-03", {
        decision: "tomorrow",
      }),
    ]);

    await expect(repository.closeDailyContract(userId, "2026-08-03")).resolves.toMatchObject({
      status: "closed",
      closedAt: expect.any(Date),
    });
    await expect(
      repository.createOutcome(userId, "2026-08-03", {
        title: "Late addition",
        desiredOutcome: "",
        context: "",
        constraints: "",
        estimateMinutes: null,
        aiPermissions: [],
      }),
    ).rejects.toBeInstanceOf(DailyContractClosedError);
    await expect(
      repository.updateOutcome(userId, day.outcomes[0]?.id ?? "", { title: "Rewritten day" }),
    ).rejects.toBeInstanceOf(DailyContractClosedError);
    await expect(
      repository.decideOutcome(userId, day.outcomes[0]?.id ?? "", "2026-08-03", {
        decision: "release",
      }),
    ).rejects.toBeInstanceOf(DailyContractClosedError);
    await expect(
      repository.addScheduledToDay(userId, day.outcomes[2]?.id ?? "", "2026-08-03"),
    ).rejects.toBeInstanceOf(DailyContractClosedError);
    await expect(
      repository.setDailyCapacity(userId, "2026-08-03", { capacityMinutes: 120 }),
    ).rejects.toBeInstanceOf(DailyContractClosedError);
  });

  it("keeps capacity and recent behavior scoped to the user and local day", async () => {
    const capacity = await repository.setDailyCapacity(userId, "2026-08-05", {
      capacityMinutes: 150,
    });
    expect(capacity).toMatchObject({ localDate: "2026-08-05", capacityMinutes: 150 });

    const day = await repository.getDailyContract(userId, "2026-08-05");
    expect(day.contract).toMatchObject({ capacityMinutes: 150 });
    expect(day.recentDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-08-03", decision: "completed" }),
        expect.objectContaining({ date: "2026-08-03", decision: "released" }),
        expect.objectContaining({ date: "2026-08-03", decision: "rescheduled" }),
      ]),
    );

    const strangerId = `integration-${randomUUID()}`;
    await db.insert(user).values({
      id: strangerId,
      name: "Other Person",
      email: `${strangerId}@saltzer.test`,
    });
    const strangerDay = await repository.getDailyContract(strangerId, "2026-08-05");
    expect(strangerDay.contract).toBeNull();
    expect(strangerDay.recentDecisions).toEqual([]);
    await db.delete(user).where(eq(user.id, strangerId));
  });

  it("keeps one active focus and records honest progress transitions", async () => {
    const first = await repository.createOutcome(userId, "2026-08-04", {
      title: "Trace the production failure",
      desiredOutcome: "The failing hop is proven",
      context: "Start from the report",
      constraints: "No production writes",
      estimateMinutes: 50,
      aiPermissions: ["read_context", "suggest"],
    });
    const second = await repository.createOutcome(userId, "2026-08-04", {
      title: "Prepare the release",
      desiredOutcome: "A reviewed release is ready",
      context: "",
      constraints: "",
      estimateMinutes: 30,
      aiPermissions: [],
    });

    await Promise.all([
      repository.startFocus(userId, first.id, { nextAction: "Open the failing trace" }),
      repository.startFocus(userId, second.id, { nextAction: "Read the release diff" }),
    ]);
    const focusedDay = await repository.getDailyContract(userId, "2026-08-04");
    const focused = focusedDay.outcomes.filter((outcome) => outcome.focusStartedAt);
    expect(focused).toHaveLength(1);
    const focusedOutcome = focused[0];
    if (!focusedOutcome) throw new Error("Expected one focused outcome.");

    const continued = await repository.checkInProgress(userId, focusedOutcome.id, {
      state: "continue",
      note: "The diff is clean",
      nextAction: "Run the release checks",
    });
    expect(continued).toMatchObject({
      nextAction: "Run the release checks",
      lastProgressNote: "The diff is clean",
      lastProgressAt: expect.any(Date),
      focusStartedAt: expect.any(Date),
    });

    const blocked = await repository.checkInProgress(userId, focusedOutcome.id, {
      state: "blocked",
      note: "Waiting for deployment approval",
    });
    expect(blocked).toMatchObject({
      lastProgressNote: "Waiting for deployment approval",
      focusStartedAt: null,
      blockedAt: expect.any(Date),
    });

    const events = await db
      .select({ type: outcomeEvents.type, note: outcomeEvents.note })
      .from(outcomeEvents)
      .where(eq(outcomeEvents.outcomeId, focusedOutcome.id));
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "focus_started" }),
        expect.objectContaining({ type: "progressed", note: "The diff is clean" }),
        expect.objectContaining({ type: "blocked", note: "Waiting for deployment approval" }),
      ]),
    );
  });
});
