import { describe, expect, it } from "vitest";
import { computeRecallFinalization, formatOrderNumber, isValidRecallRequestedEnd } from "./orders.js";

describe("formatOrderNumber", () => {
  it("formats the primary series", () => {
    expect(formatOrderNumber(2026, "PRIMARY", 1)).toBe("Հրց-2026-101");
    expect(formatOrderNumber(2026, "PRIMARY", 7)).toBe("Հրց-2026-107");
  });

  it("formats the recall series with a distinct base", () => {
    expect(formatOrderNumber(2026, "RECALL", 1)).toBe("Հրց-2026-201");
  });
});

describe("isValidRecallRequestedEnd", () => {
  it("accepts a date strictly before the original end", () => {
    expect(isValidRecallRequestedEnd("2026-01-30", "2026-01-23")).toBe(true);
  });

  it("rejects the same date as the original end", () => {
    expect(isValidRecallRequestedEnd("2026-01-30", "2026-01-30")).toBe(false);
  });

  it("rejects a date after the original end", () => {
    expect(isValidRecallRequestedEnd("2026-01-30", "2026-02-01")).toBe(false);
  });
});

describe("computeRecallFinalization", () => {
  it("recomputes business days for the shortened range and restores the delta", () => {
    // 2026-01-19..30 = 10 business days; shortened to end on 2026-01-23 = 5 business days.
    const result = computeRecallFinalization({ start: "2026-01-19", end: "2026-01-30", days: 10 }, "2026-01-23");
    expect(result).toEqual({ newDays: 5, delta: 5 });
  });

  it("delta is 0 when the shortened range happens to keep the same business-day count", () => {
    const result = computeRecallFinalization({ start: "2026-01-19", end: "2026-01-19", days: 1 }, "2026-01-19");
    expect(result).toEqual({ newDays: 1, delta: 0 });
  });
});
