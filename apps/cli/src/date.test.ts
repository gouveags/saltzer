import { describe, expect, it } from "vitest";
import { localDateNow } from "./date.js";

describe("localDateNow", () => {
  it("returns the machine-local day in the API date format", () => {
    expect(localDateNow(new Date(2026, 7, 3, 12))).toBe("2026-08-03");
  });
});
