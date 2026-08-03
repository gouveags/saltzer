import { describe, expect, it } from "vitest";
import {
  assertDailyOutcomeCapacity,
  buildContextPacket,
  buildDailyRealityCheck,
  DailyOutcomeLimitError,
  LocalDateSchema,
  MAX_DAILY_OUTCOMES,
  nextLocalDate,
  OutcomeDecisionInputSchema,
  ProgressCheckInInputSchema,
  SetDailyCapacityInputSchema,
  StartFocusInputSchema,
  shiftLocalDate,
} from "./index.js";

describe("Daily Contract rules", () => {
  it("rejects a fourth outcome in the same Daily Contract", () => {
    expect(() => assertDailyOutcomeCapacity(MAX_DAILY_OUTCOMES)).toThrow(DailyOutcomeLimitError);
  });

  it("allows another outcome while fewer than three have been chosen", () => {
    expect(() => assertDailyOutcomeCapacity(2)).not.toThrow();
  });

  it("validates calendar dates instead of only their shape", () => {
    expect(LocalDateSchema.safeParse("2026-02-29").success).toBe(false);
    expect(LocalDateSchema.safeParse("2028-02-29").success).toBe(true);
  });

  it("requires an explicit target for schedule decisions", () => {
    expect(OutcomeDecisionInputSchema.safeParse({ decision: "schedule" }).success).toBe(false);
  });

  it("advances dates across month and year boundaries", () => {
    expect(nextLocalDate("2026-12-31")).toBe("2027-01-01");
    expect(shiftLocalDate("2026-01-01", -7)).toBe("2025-12-25");
  });

  it("keeps a daily capacity explicit and bounded", () => {
    expect(SetDailyCapacityInputSchema.safeParse({ capacityMinutes: 120 }).success).toBe(true);
    expect(SetDailyCapacityInputSchema.safeParse({ capacityMinutes: null }).success).toBe(true);
    expect(SetDailyCapacityInputSchema.safeParse({ capacityMinutes: 0 }).success).toBe(false);
    expect(SetDailyCapacityInputSchema.safeParse({ capacityMinutes: 1_441 }).success).toBe(false);
  });

  it("requires a concrete next move before focus begins", () => {
    expect(StartFocusInputSchema.safeParse({ nextAction: "" }).success).toBe(false);
    expect(StartFocusInputSchema.safeParse({ nextAction: "Open the failing trace" }).success).toBe(
      true,
    );
  });

  it("requires the next move when a progress check-in continues focus", () => {
    expect(
      ProgressCheckInInputSchema.safeParse({ state: "continue", note: "Found the failing hop" })
        .success,
    ).toBe(false);
    expect(
      ProgressCheckInInputSchema.safeParse({
        state: "continue",
        note: "Found the failing hop",
        nextAction: "Add the regression test",
      }).success,
    ).toBe(true);
    expect(
      ProgressCheckInInputSchema.safeParse({ state: "blocked", note: "Waiting for approval" })
        .success,
    ).toBe(true);
  });
});

describe("daily reality checks", () => {
  it("shows whether today's commitments fit the room a person actually has", () => {
    const check = buildDailyRealityCheck({
      localDate: "2026-08-03",
      capacityMinutes: 180,
      outcomes: [60, 90, null],
      scheduledCandidates: [30, null],
      recentDecisions: [
        { date: "2026-08-01", decision: "completed" },
        { date: "2026-08-01", decision: "released" },
        { date: "2026-08-02", decision: "completed" },
        { date: "2026-08-02", decision: "rescheduled" },
      ],
    });

    expect(check).toEqual({
      localDate: "2026-08-03",
      capacityMinutes: 180,
      plannedMinutes: 150,
      unestimatedOutcomes: 1,
      remainingMinutes: 30,
      status: "within_capacity",
      due: { count: 2, estimatedMinutes: 30, unestimatedOutcomes: 1 },
      recent: {
        lookbackDays: 7,
        daysReviewed: 2,
        completed: 2,
        released: 1,
        rescheduled: 1,
        completionRate: 50,
      },
    });
  });

  it("names an overloaded contract without pretending unestimated work is free", () => {
    const check = buildDailyRealityCheck({
      localDate: "2026-08-03",
      capacityMinutes: 120,
      outcomes: [90, 60],
      scheduledCandidates: [],
      recentDecisions: [],
    });

    expect(check.status).toBe("over_capacity");
    expect(check.remainingMinutes).toBe(-30);
    expect(check.recent.completionRate).toBeNull();
  });
});

describe("AI context packets", () => {
  it("shares only explicit outcome context and permissions", () => {
    const packet = buildContextPacket(
      {
        id: "0c7bd70c-a465-41d9-9490-5c97f5339ab6",
        contractId: "25f6f38d-9a5c-4b66-ae44-f95202cebd92",
        title: "Prepare launch note",
        desiredOutcome: "A concise draft ready for review",
        context: "Launch is Thursday.",
        constraints: "Do not publish.",
        nextAction: "Draft the opening paragraph",
        estimateMinutes: 40,
        aiPermissions: ["read_context", "draft"],
        status: "planned",
        scheduledFor: null,
        position: 0,
        focusStartedAt: "2026-08-03T12:05:00.000Z",
        lastProgressNote: "Reviewed the source material",
        lastProgressAt: "2026-08-03T12:04:00.000Z",
        blockedAt: null,
        completedAt: null,
        releasedAt: null,
        createdAt: "2026-08-03T12:00:00.000Z",
        updatedAt: "2026-08-03T12:00:00.000Z",
      },
      "2026-08-03",
      {
        capacityMinutes: 180,
        plannedMinutes: 150,
        remainingMinutes: 30,
        status: "within_capacity",
      },
    );

    expect(packet).toMatchObject({
      title: "Prepare launch note",
      context: "Launch is Thursday.",
      constraints: "Do not publish.",
      nextAction: "Draft the opening paragraph",
      lastProgressNote: "Reviewed the source material",
      permissions: ["read_context", "draft"],
      day: {
        capacityMinutes: 180,
        plannedMinutes: 150,
        remainingMinutes: 30,
        status: "within_capacity",
      },
    });
    expect(packet.instruction).toContain("ask before any external side effect");
  });
});
