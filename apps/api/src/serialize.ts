import type { schema } from "@saltzer/database";
import {
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
  },
) {
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
  });
}
