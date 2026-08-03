import {
  assertDailyOutcomeCapacity,
  type CreateOutcomeInput,
  DailyContractClosedError,
  DailyOutcomeLimitError,
  type LocalDate,
  nextLocalDate,
  type OutcomeDecisionInput,
  OutcomeNotActionableError,
  OutcomeNotFocusedError,
  type ProgressCheckInInput,
  type StartFocusInput,
  UnresolvedDailyOutcomesError,
  type UpdateOutcomeInput,
} from "@saltzer/domain";
import { and, asc, count, eq, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { apiTokens, dailyContracts, outcomeEvents, outcomes } from "./schema.js";

export class OutcomeNotFoundError extends Error {
  constructor() {
    super("Outcome not found.");
    this.name = "OutcomeNotFoundError";
  }
}

export class DailyContractNotFoundError extends Error {
  constructor() {
    super("Daily Contract not found.");
    this.name = "DailyContractNotFoundError";
  }
}

export class DailyRepository {
  constructor(private readonly db: Database) {}

  async getOutcome(userId: string, outcomeId: string) {
    const [outcome] = await this.db
      .select()
      .from(outcomes)
      .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
      .limit(1);

    if (!outcome) throw new OutcomeNotFoundError();
    return outcome;
  }

  async getDailyContract(userId: string, localDate: LocalDate) {
    const contract = await this.db.query.dailyContracts.findFirst({
      where: and(eq(dailyContracts.userId, userId), eq(dailyContracts.localDate, localDate)),
    });

    const scheduledCandidates = await this.db
      .select()
      .from(outcomes)
      .where(
        and(
          eq(outcomes.userId, userId),
          eq(outcomes.status, "planned"),
          isNull(outcomes.contractId),
          lte(outcomes.scheduledFor, localDate),
        ),
      )
      .orderBy(asc(outcomes.scheduledFor), asc(outcomes.createdAt));

    if (!contract) {
      return { contract: null, outcomes: [], scheduledCandidates };
    }

    const contractOutcomes = await this.db
      .select()
      .from(outcomes)
      .where(eq(outcomes.contractId, contract.id))
      .orderBy(asc(outcomes.position), asc(outcomes.createdAt));

    return { contract, outcomes: contractOutcomes, scheduledCandidates };
  }

  async createOutcome(userId: string, localDate: LocalDate, input: CreateOutcomeInput) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${localDate}`}, 0))`,
      );

      const [contract] = await tx
        .insert(dailyContracts)
        .values({ userId, localDate })
        .onConflictDoUpdate({
          target: [dailyContracts.userId, dailyContracts.localDate],
          set: { updatedAt: new Date() },
        })
        .returning();

      if (!contract) throw new Error("Unable to create Daily Contract.");
      if (contract.status === "closed") throw new DailyContractClosedError();

      const [result] = await tx
        .select({ value: count() })
        .from(outcomes)
        .where(eq(outcomes.contractId, contract.id));

      const outcomeCount = result?.value ?? 0;
      assertDailyOutcomeCapacity(outcomeCount);

      const [outcome] = await tx
        .insert(outcomes)
        .values({
          ...input,
          userId,
          contractId: contract.id,
          position: outcomeCount,
        })
        .returning();

      if (!outcome) throw new Error("Unable to create outcome.");

      await tx.insert(outcomeEvents).values({
        outcomeId: outcome.id,
        userId,
        type: "created",
        toDate: localDate,
      });

      return outcome;
    });
  }

  async updateOutcome(userId: string, outcomeId: string, input: UpdateOutcomeInput) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:focus`}, 0))`,
      );

      const [existing] = await tx
        .select()
        .from(outcomes)
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .limit(1);

      if (!existing) throw new OutcomeNotFoundError();

      if (existing.contractId) {
        const [contract] = await tx
          .select({ status: dailyContracts.status })
          .from(dailyContracts)
          .where(eq(dailyContracts.id, existing.contractId))
          .for("update")
          .limit(1);

        if (contract?.status === "closed") throw new DailyContractClosedError();
      }

      const [outcome] = await tx
        .update(outcomes)
        .set(input)
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .returning();

      if (!outcome) throw new OutcomeNotFoundError();

      await tx.insert(outcomeEvents).values({
        outcomeId,
        userId,
        type: "edited",
      });

      return outcome;
    });
  }

  async startFocus(userId: string, outcomeId: string, input: StartFocusInput) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:focus`}, 0))`,
      );

      const [existing] = await tx
        .select()
        .from(outcomes)
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .for("update")
        .limit(1);

      if (!existing) throw new OutcomeNotFoundError();
      if (!existing.contractId || existing.status !== "planned") {
        throw new OutcomeNotActionableError();
      }

      const [contract] = await tx
        .select({ status: dailyContracts.status })
        .from(dailyContracts)
        .where(and(eq(dailyContracts.id, existing.contractId), eq(dailyContracts.userId, userId)))
        .for("update")
        .limit(1);

      if (contract?.status !== "open") throw new OutcomeNotActionableError();

      await tx
        .update(outcomes)
        .set({ focusStartedAt: null })
        .where(and(eq(outcomes.userId, userId), eq(outcomes.status, "planned")));

      const now = new Date();
      const [focused] = await tx
        .update(outcomes)
        .set({
          nextAction: input.nextAction,
          focusStartedAt: now,
          blockedAt: null,
          updatedAt: now,
        })
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .returning();

      if (!focused) throw new OutcomeNotFoundError();

      await tx.insert(outcomeEvents).values({
        outcomeId,
        userId,
        type: "focus_started",
        metadata: { nextAction: input.nextAction },
      });

      return focused;
    });
  }

  async checkInProgress(userId: string, outcomeId: string, input: ProgressCheckInInput) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:focus`}, 0))`,
      );

      const [existing] = await tx
        .select()
        .from(outcomes)
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .for("update")
        .limit(1);

      if (!existing) throw new OutcomeNotFoundError();
      if (!existing.contractId || existing.status !== "planned") {
        throw new OutcomeNotActionableError();
      }
      if (!existing.focusStartedAt) throw new OutcomeNotFocusedError();

      const [contract] = await tx
        .select({ status: dailyContracts.status })
        .from(dailyContracts)
        .where(and(eq(dailyContracts.id, existing.contractId), eq(dailyContracts.userId, userId)))
        .for("update")
        .limit(1);

      if (contract?.status !== "open") throw new OutcomeNotActionableError();

      const now = new Date();
      const [updated] = await tx
        .update(outcomes)
        .set({
          ...(input.nextAction ? { nextAction: input.nextAction } : {}),
          focusStartedAt: input.state === "continue" ? existing.focusStartedAt : null,
          lastProgressNote: input.note,
          lastProgressAt: now,
          blockedAt: input.state === "blocked" ? now : null,
          updatedAt: now,
        })
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .returning();

      if (!updated) throw new OutcomeNotFoundError();

      await tx.insert(outcomeEvents).values({
        outcomeId,
        userId,
        type:
          input.state === "continue"
            ? "progressed"
            : input.state === "blocked"
              ? "blocked"
              : "focus_paused",
        note: input.note,
        metadata: input.nextAction ? { nextAction: input.nextAction } : {},
      });

      return updated;
    });
  }

  async decideOutcome(
    userId: string,
    outcomeId: string,
    currentDate: LocalDate,
    input: OutcomeDecisionInput,
  ) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:focus`}, 0))`,
      );

      const [existing] = await tx
        .select()
        .from(outcomes)
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .limit(1);

      if (!existing) throw new OutcomeNotFoundError();

      if (existing.contractId) {
        const [contract] = await tx
          .select({ status: dailyContracts.status })
          .from(dailyContracts)
          .where(eq(dailyContracts.id, existing.contractId))
          .for("update")
          .limit(1);

        if (contract?.status === "closed") throw new DailyContractClosedError();
      }

      const now = new Date();
      const targetDate =
        input.decision === "tomorrow"
          ? nextLocalDate(currentDate)
          : input.decision === "schedule"
            ? input.targetDate
            : undefined;

      const [updated] = await tx
        .update(outcomes)
        .set(
          input.decision === "complete"
            ? { status: "completed", completedAt: now, focusStartedAt: null, blockedAt: null }
            : input.decision === "release"
              ? { status: "released", releasedAt: now, focusStartedAt: null, blockedAt: null }
              : {
                  contractId: null,
                  scheduledFor: targetDate,
                  position: 0,
                  focusStartedAt: null,
                  blockedAt: null,
                },
        )
        .where(and(eq(outcomes.id, outcomeId), eq(outcomes.userId, userId)))
        .returning();

      if (!updated) throw new OutcomeNotFoundError();

      await tx.insert(outcomeEvents).values({
        outcomeId,
        userId,
        type:
          input.decision === "complete"
            ? "completed"
            : input.decision === "release"
              ? "released"
              : "rescheduled",
        fromDate: currentDate,
        toDate: targetDate,
        note: input.note,
      });

      return updated;
    });
  }

  async addScheduledToDay(userId: string, outcomeId: string, localDate: LocalDate) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${localDate}`}, 0))`,
      );

      const [contract] = await tx
        .insert(dailyContracts)
        .values({ userId, localDate })
        .onConflictDoUpdate({
          target: [dailyContracts.userId, dailyContracts.localDate],
          set: { updatedAt: new Date() },
        })
        .returning();

      if (!contract) throw new Error("Unable to create Daily Contract.");
      if (contract.status === "closed") throw new DailyContractClosedError();

      const [countResult] = await tx
        .select({ value: count() })
        .from(outcomes)
        .where(eq(outcomes.contractId, contract.id));

      const outcomeCount = countResult?.value ?? 0;
      if (outcomeCount >= 3) throw new DailyOutcomeLimitError();

      const [outcome] = await tx
        .update(outcomes)
        .set({ contractId: contract.id, scheduledFor: null, position: outcomeCount })
        .where(
          and(
            eq(outcomes.id, outcomeId),
            eq(outcomes.userId, userId),
            eq(outcomes.status, "planned"),
            isNull(outcomes.contractId),
          ),
        )
        .returning();

      if (!outcome) throw new OutcomeNotFoundError();

      await tx.insert(outcomeEvents).values({
        outcomeId,
        userId,
        type: "added_to_day",
        toDate: localDate,
      });

      return outcome;
    });
  }

  async closeDailyContract(userId: string, localDate: LocalDate) {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${localDate}`}, 0))`,
      );

      const [contract] = await tx
        .select()
        .from(dailyContracts)
        .where(and(eq(dailyContracts.userId, userId), eq(dailyContracts.localDate, localDate)))
        .for("update")
        .limit(1);

      if (!contract) throw new DailyContractNotFoundError();
      if (contract.status === "closed") throw new DailyContractClosedError();

      const [result] = await tx
        .select({ value: count() })
        .from(outcomes)
        .where(and(eq(outcomes.contractId, contract.id), eq(outcomes.status, "planned")));

      if ((result?.value ?? 0) > 0) throw new UnresolvedDailyOutcomesError();

      const now = new Date();
      const [closed] = await tx
        .update(dailyContracts)
        .set({ status: "closed", closedAt: now, updatedAt: now })
        .where(
          and(
            eq(dailyContracts.id, contract.id),
            eq(dailyContracts.userId, userId),
            eq(dailyContracts.status, "open"),
          ),
        )
        .returning();

      if (!closed) throw new DailyContractClosedError();
      return closed;
    });
  }

  async findToken(tokenHash: string) {
    const [token] = await this.db
      .select()
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.tokenHash, tokenHash),
          isNull(apiTokens.revokedAt),
          sql`(${apiTokens.expiresAt} is null or ${apiTokens.expiresAt} > now())`,
        ),
      )
      .limit(1);

    if (token) {
      await this.db
        .update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.id, token.id));
    }

    return token;
  }

  async createToken(userId: string, name: string, tokenHash: string) {
    const [token] = await this.db
      .insert(apiTokens)
      .values({ userId, name, tokenHash })
      .returning({ id: apiTokens.id, name: apiTokens.name, scopes: apiTokens.scopes });

    if (!token) throw new Error("Unable to create API token.");
    return token;
  }
}
