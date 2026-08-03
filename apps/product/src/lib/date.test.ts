import { describe, expect, it } from "vitest";
import { todayLocalDate } from "./date";

describe("todayLocalDate", () => {
  it("formats the device-local day", () => {
    expect(todayLocalDate(new Date(2026, 7, 3, 8))).toBe("2026-08-03");
  });
});
