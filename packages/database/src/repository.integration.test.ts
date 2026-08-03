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
import { user } from "./schema.js";

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
  });
});
