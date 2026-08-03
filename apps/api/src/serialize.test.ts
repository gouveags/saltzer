import { describe, expect, it } from "vitest";
import { serializeToday } from "./serialize.js";

describe("API serialization", () => {
  it("keeps an empty day empty without inventing a persisted contract", () => {
    expect(
      serializeToday("2026-08-03", {
        contract: null,
        outcomes: [],
        scheduledCandidates: [],
      }),
    ).toEqual({
      localDate: "2026-08-03",
      contract: null,
      scheduledCandidates: [],
    });
  });
});
