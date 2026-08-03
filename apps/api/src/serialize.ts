import type { schema } from "@saltzer/database";
import {
  buildDailyRealityCheck,
  CloseDayResultSchema,
  DailyContractSchema,
  OutcomeSchema,
  TodayViewSchema,
} from "@saltzer/domain";

type OutcomeRow = typeof schema.outcomes.$inferSelect;
type ContractRow = typeof schema.dailyContracts.$inferSelect;

export function serializeOutcome(row: OutcomeRow) {
  return OutcomeSchema.parse({
    ...row,
    focusStartedAt: row.focusStartedAt?.toISOString() ?? null,
    lastProgressAt: row.lastProgressAt?.toISOString() ?? null,
    blockedAt: row.blockedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function serializeClosedContract(row: ContractRow) {
  return CloseDayResultSchema.parse({
    localDate: row.localDate,
    status: row.status,
    closedAt: row.closedAt?.toISOString(),
  });
}

export function serializeToday(
  localDate: string,
  result: {
    contract: ContractRow | null;
    outcomes: OutcomeRow[];
    scheduledCandidates: OutcomeRow[];
    recentDecisions: Array<{
      date: string;
      decision: "completed" | "released" | "rescheduled";
    }>;
  },
) {
  const realityCheck = buildDailyRealityCheck({
    localDate,
    capacityMinutes: result.contract?.capacityMinutes ?? null,
    outcomes: result.outcomes
      .filter((outcome) => outcome.status === "planned")
      .map((outcome) => outcome.estimateMinutes),
    scheduledCandidates: result.scheduledCandidates.map((outcome) => outcome.estimateMinutes),
    recentDecisions: result.recentDecisions,
  });

  return TodayViewSchema.parse({
    localDate,
    contract: result.contract
      ? DailyContractSchema.parse({
          ...result.contract,
          closedAt: result.contract.closedAt?.toISOString() ?? null,
          createdAt: result.contract.createdAt.toISOString(),
          updatedAt: result.contract.updatedAt.toISOString(),
          outcomes: result.outcomes.map(serializeOutcome),
        })
      : null,
    scheduledCandidates: result.scheduledCandidates.map(serializeOutcome),
    realityCheck,
  });
}
