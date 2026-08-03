import { describe, expect, it } from "vitest";
import { serializeToday } from "./serialize.js";

describe("API serialization", () => {
  it("keeps an empty day empty without inventing a persisted contract", () => {
    expect(
      serializeToday("2026-08-03", {
        contract: null,
        outcomes: [],
        scheduledCandidates: [],
        recentDecisions: [],
      }),
    ).toEqual({
      localDate: "2026-08-03",
      contract: null,
      scheduledCandidates: [],
      realityCheck: {
        localDate: "2026-08-03",
        capacityMinutes: null,
        plannedMinutes: 0,
        unestimatedOutcomes: 0,
        remainingMinutes: null,
        status: "unset",
        due: { count: 0, estimatedMinutes: 0, unestimatedOutcomes: 0 },
        recent: {
          lookbackDays: 7,
          daysReviewed: 0,
          completed: 0,
          released: 0,
          rescheduled: 0,
          completionRate: null,
        },
      },
    });
  });
});
