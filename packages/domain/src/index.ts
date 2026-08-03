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

export const OutcomeSchema = z.object({
  id: z.uuid(),
  contractId: z.uuid().nullable(),
  title: z.string(),
  desiredOutcome: z.string(),
  context: z.string(),
  constraints: z.string(),
  estimateMinutes: z.number().int().positive().nullable(),
  aiPermissions: z.array(AiPermissionSchema),
  status: OutcomeStatusSchema,
  scheduledFor: LocalDateSchema.nullable(),
  position: z.number().int().nonnegative(),
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

export const TodayViewSchema = z.object({
  localDate: LocalDateSchema,
  contract: DailyContractSchema.nullable(),
  scheduledCandidates: z.array(OutcomeSchema),
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

export const ContextPacketSchema = z.object({
  outcomeId: z.uuid(),
  title: z.string(),
  desiredOutcome: z.string(),
  context: z.string(),
  constraints: z.string(),
  today: LocalDateSchema,
  permissions: z.array(AiPermissionSchema),
  instruction: z.string(),
});

export type LocalDate = z.infer<typeof LocalDateSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type DailyContract = z.infer<typeof DailyContractSchema>;
export type TodayView = z.infer<typeof TodayViewSchema>;
export type CreateOutcomeInput = z.infer<typeof CreateOutcomeInputSchema>;
export type UpdateOutcomeInput = z.infer<typeof UpdateOutcomeInputSchema>;
export type OutcomeDecisionInput = z.infer<typeof OutcomeDecisionInputSchema>;
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

export function assertDailyOutcomeCapacity(outcomeCount: number): void {
  if (outcomeCount >= MAX_DAILY_OUTCOMES) {
    throw new DailyOutcomeLimitError();
  }
}

export function nextLocalDate(localDate: LocalDate): LocalDate {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return LocalDateSchema.parse(date.toISOString().slice(0, 10));
}

export function buildContextPacket(outcome: Outcome, today: LocalDate): ContextPacket {
  return ContextPacketSchema.parse({
    outcomeId: outcome.id,
    title: outcome.title,
    desiredOutcome: outcome.desiredOutcome,
    context: outcome.context,
    constraints: outcome.constraints,
    today,
    permissions: outcome.aiPermissions,
    instruction:
      "Help advance this outcome using only the supplied context and permissions. " +
      "State assumptions, do not invent missing facts, and ask before any external side effect.",
  });
}
