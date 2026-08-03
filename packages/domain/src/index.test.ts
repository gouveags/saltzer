import { describe, expect, it } from "vitest";
import {
  assertDailyOutcomeCapacity,
  buildContextPacket,
  DailyOutcomeLimitError,
  LocalDateSchema,
  MAX_DAILY_OUTCOMES,
  nextLocalDate,
  OutcomeDecisionInputSchema,
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
        estimateMinutes: 40,
        aiPermissions: ["read_context", "draft"],
        status: "planned",
        scheduledFor: null,
        position: 0,
        completedAt: null,
        releasedAt: null,
        createdAt: "2026-08-03T12:00:00.000Z",
        updatedAt: "2026-08-03T12:00:00.000Z",
      },
      "2026-08-03",
    );

    expect(packet).toMatchObject({
      title: "Prepare launch note",
      context: "Launch is Thursday.",
      constraints: "Do not publish.",
      permissions: ["read_context", "draft"],
    });
    expect(packet.instruction).toContain("ask before any external side effect");
  });
});
