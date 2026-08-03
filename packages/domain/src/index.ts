import { z } from "zod";

export const MAX_DAILY_OUTCOMES = 3;

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealDate, "Use a real calendar date");

export const OutcomeStatusSchema = z.enum(["planned", "completed", "released"]);
export const ContractStatusSchema = z.enum(["open", "closed"]);
export const AiPermissionSchema = z.enum(["read_context", "suggest", "draft"]);
export const DailyRealityStatusSchema = z.enum([
  "unset",
  "within_capacity",
  "at_capacity",
  "over_capacity",
]);

export const OutcomeSchema = z.object({
  id: z.uuid(),
  contractId: z.uuid().nullable(),
  title: z.string(),
  desiredOutcome: z.string(),
  context: z.string(),
  constraints: z.string(),
  nextAction: z.string(),
  estimateMinutes: z.number().int().positive().nullable(),
  aiPermissions: z.array(AiPermissionSchema),
  status: OutcomeStatusSchema,
  scheduledFor: LocalDateSchema.nullable(),
  position: z.number().int().nonnegative(),
  focusStartedAt: z.iso.datetime().nullable(),
  lastProgressNote: z.string(),
  lastProgressAt: z.iso.datetime().nullable(),
  blockedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  releasedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const DailyContractSchema = z.object({
  id: z.uuid(),
  localDate: LocalDateSchema,
  status: ContractStatusSchema,
  capacityMinutes: z.number().int().positive().nullable(),
  closedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  outcomes: z.array(OutcomeSchema),
});

export const DailyRealityCheckSchema = z.object({
  localDate: LocalDateSchema,
  capacityMinutes: z.number().int().min(15).max(1_440).nullable(),
  plannedMinutes: z.number().int().nonnegative(),
  unestimatedOutcomes: z.number().int().nonnegative(),
  remainingMinutes: z.number().int().nullable(),
  status: DailyRealityStatusSchema,
  due: z.object({
    count: z.number().int().nonnegative(),
    estimatedMinutes: z.number().int().nonnegative(),
    unestimatedOutcomes: z.number().int().nonnegative(),
  }),
  recent: z.object({
    lookbackDays: z.literal(7),
    daysReviewed: z.number().int().min(0).max(7),
    completed: z.number().int().nonnegative(),
    released: z.number().int().nonnegative(),
    rescheduled: z.number().int().nonnegative(),
    completionRate: z.number().int().min(0).max(100).nullable(),
  }),
});

export const TodayViewSchema = z.object({
  localDate: LocalDateSchema,
  contract: DailyContractSchema.nullable(),
  scheduledCandidates: z.array(OutcomeSchema),
  realityCheck: DailyRealityCheckSchema,
});

export const CloseDayResultSchema = z.object({
  localDate: LocalDateSchema,
  status: z.literal("closed"),
  closedAt: z.iso.datetime(),
});

export const CreateOutcomeInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  desiredOutcome: z.string().trim().max(2_000).default(""),
  context: z.string().trim().max(20_000).default(""),
  constraints: z.string().trim().max(5_000).default(""),
  estimateMinutes: z.number().int().min(5).max(1_440).nullable().default(null),
  aiPermissions: z.array(AiPermissionSchema).default(["read_context", "suggest"]),
});

export const SetDailyCapacityInputSchema = z.object({
  capacityMinutes: z.number().int().min(15).max(1_440).nullable(),
});

export const DailyCapacitySchema = z.object({
  localDate: LocalDateSchema,
  capacityMinutes: z.number().int().min(15).max(1_440).nullable(),
});

export const UpdateOutcomeInputSchema = CreateOutcomeInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field",
);

export const OutcomeDecisionInputSchema = z
  .object({
    decision: z.enum(["complete", "release", "tomorrow", "schedule"]),
    targetDate: LocalDateSchema.optional(),
    note: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "schedule" && !value.targetDate) {
      context.addIssue({
        code: "custom",
        message: "targetDate is required when scheduling",
        path: ["targetDate"],
      });
    }
  });

export const StartFocusInputSchema = z.object({
  nextAction: z.string().trim().min(1).max(500),
});

export const ProgressCheckInInputSchema = z
  .object({
    state: z.enum(["continue", "blocked", "pause"]),
    note: z.string().trim().min(1).max(2_000),
    nextAction: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.state === "continue" && !value.nextAction) {
      context.addIssue({
        code: "custom",
        message: "nextAction is required to continue focus",
        path: ["nextAction"],
      });
    }
  });

export const DayContextSchema = z.object({
  capacityMinutes: z.number().int().min(15).max(1_440).nullable(),
  plannedMinutes: z.number().int().nonnegative(),
  remainingMinutes: z.number().int().nullable(),
  status: DailyRealityStatusSchema,
});

export const ContextPacketSchema = z.object({
  outcomeId: z.uuid(),
  title: z.string(),
  desiredOutcome: z.string(),
  context: z.string(),
  constraints: z.string(),
  nextAction: z.string(),
  lastProgressNote: z.string(),
  today: LocalDateSchema,
  day: DayContextSchema,
  permissions: z.array(AiPermissionSchema),
  instruction: z.string(),
});

export type LocalDate = z.infer<typeof LocalDateSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type DailyContract = z.infer<typeof DailyContractSchema>;
export type TodayView = z.infer<typeof TodayViewSchema>;
export type DailyRealityCheck = z.infer<typeof DailyRealityCheckSchema>;
export type DailyCapacity = z.infer<typeof DailyCapacitySchema>;
export type DayContext = z.infer<typeof DayContextSchema>;
export type CreateOutcomeInput = z.infer<typeof CreateOutcomeInputSchema>;
export type SetDailyCapacityInput = z.infer<typeof SetDailyCapacityInputSchema>;
export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeInputSchema>;
export type OutcomeDecisionInput = z.infer<typeof OutcomeDecisionInputSchema>;
export type StartFocusInput = z.infer<typeof StartFocusInputSchema>;
export type ProgressCheckInInput = z.infer<typeof ProgressCheckInInputSchema>;
export type ContextPacket = z.infer<typeof ContextPacketSchema>;
export type CloseDayResult = z.infer<typeof CloseDayResultSchema>;
export type AiPermission = z.infer<typeof AiPermissionSchema>;

export class DailyOutcomeLimitError extends Error {
  constructor() {
    super(`A Daily Contract can hold at most ${MAX_DAILY_OUTCOMES} outcomes.`);
    this.name = "DailyOutcomeLimitError";
  }
}

export class DailyContractClosedError extends Error {
  constructor() {
    super("This Daily Contract is already closed.");
    this.name = "DailyContractClosedError";
  }
}

export class UnresolvedDailyOutcomesError extends Error {
  constructor() {
    super("Complete, release, or reschedule every outcome before closing the day.");
    this.name = "UnresolvedDailyOutcomesError";
  }
}

export class OutcomeNotActionableError extends Error {
  constructor() {
    super("Only a planned outcome in an open Daily Contract can be focused.");
    this.name = "OutcomeNotActionableError";
  }
}

export class OutcomeNotFocusedError extends Error {
  constructor() {
    super("Start focus on this outcome before recording progress.");
    this.name = "OutcomeNotFocusedError";
  }
}

export function assertDailyOutcomeCapacity(outcomeCount: number): void {
  if (outcomeCount >= MAX_DAILY_OUTCOMES) {
    throw new DailyOutcomeLimitError();
  }
}

export function shiftLocalDate(localDate: LocalDate, days: number): LocalDate {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return LocalDateSchema.parse(date.toISOString().slice(0, 10));
}

export function nextLocalDate(localDate: LocalDate): LocalDate {
  return shiftLocalDate(localDate, 1);
}

type DailyRealityCheckInput = {
  localDate: LocalDate;
  capacityMinutes: number | null;
  outcomes: Array<number | null>;
  scheduledCandidates: Array<number | null>;
  recentDecisions: Array<{
    date: LocalDate;
    decision: "completed" | "released" | "rescheduled";
  }>;
};

export function buildDailyRealityCheck(input: DailyRealityCheckInput): DailyRealityCheck {
  const plannedMinutes = input.outcomes.reduce<number>(
    (total, estimate) => total + (estimate ?? 0),
    0,
  );
  const remainingMinutes =
    input.capacityMinutes === null ? null : input.capacityMinutes - plannedMinutes;
  const status =
    remainingMinutes === null
      ? "unset"
      : remainingMinutes < 0
        ? "over_capacity"
        : remainingMinutes === 0
          ? "at_capacity"
          : "within_capacity";
  const completed = input.recentDecisions.filter(({ decision }) => decision === "completed").length;
  const released = input.recentDecisions.filter(({ decision }) => decision === "released").length;
  const rescheduled = input.recentDecisions.filter(
    ({ decision }) => decision === "rescheduled",
  ).length;
  const totalDecisions = completed + released + rescheduled;

  return DailyRealityCheckSchema.parse({
    localDate: input.localDate,
    capacityMinutes: input.capacityMinutes,
    plannedMinutes,
    unestimatedOutcomes: input.outcomes.filter((estimate) => estimate === null).length,
    remainingMinutes,
    status,
    due: {
      count: input.scheduledCandidates.length,
      estimatedMinutes: input.scheduledCandidates.reduce<number>(
        (total, estimate) => total + (estimate ?? 0),
        0,
      ),
      unestimatedOutcomes: input.scheduledCandidates.filter((estimate) => estimate === null).length,
    },
    recent: {
      lookbackDays: 7,
      daysReviewed: new Set(input.recentDecisions.map(({ date }) => date)).size,
      completed,
      released,
      rescheduled,
      completionRate: totalDecisions === 0 ? null : Math.round((completed / totalDecisions) * 100),
    },
  });
}

export function buildContextPacket(
  outcome: Outcome,
  today: LocalDate,
  day: DayContext,
): ContextPacket {
  return ContextPacketSchema.parse({
    outcomeId: outcome.id,
    title: outcome.title,
    desiredOutcome: outcome.desiredOutcome,
    context: outcome.context,
    constraints: outcome.constraints,
    nextAction: outcome.nextAction,
    lastProgressNote: outcome.lastProgressNote,
    today,
    day,
    permissions: outcome.aiPermissions,
    instruction:
      "Help advance this outcome using only the supplied context and permissions. " +
      "State assumptions, do not invent missing facts, and ask before any external side effect.",
  });
}
