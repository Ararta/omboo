import { describe, expect, it } from "vitest";
import { businessDays, calendarDaysBetween, fmtDateHY, workYearBounds } from "./date-utils.js";

describe("businessDays", () => {
  it("counts a single weekday as 1", () => {
    expect(businessDays("2026-01-12", "2026-01-12")).toBe(1); // Monday
  });

  it("counts a full Mon-Fri span as 5", () => {
    expect(businessDays("2026-01-12", "2026-01-16")).toBe(5);
  });

  it("counts a Mon-Sun span as 5 (weekend excluded)", () => {
    expect(businessDays("2026-01-12", "2026-01-18")).toBe(5);
  });

  it("returns 0 when end is before start", () => {
    expect(businessDays("2026-01-16", "2026-01-12")).toBe(0);
  });

  it("returns 0 for a range that is a single Saturday", () => {
    expect(businessDays("2026-01-17", "2026-01-17")).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(businessDays("", "2026-01-12")).toBe(0);
    expect(businessDays("2026-01-12", "")).toBe(0);
  });

  it("counts correctly across a leap-year Feb 29 (2028)", () => {
    // 2028-02-27 Sun, 28 Mon, 29 Tue (leap day), 03-01 Wed, 03-02 Thu -> 4 business days
    expect(businessDays("2028-02-27", "2028-03-02")).toBe(4);
  });
});

describe("calendarDaysBetween", () => {
  it("counts across a year boundary", () => {
    expect(calendarDaysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("is negative when b precedes a", () => {
    expect(calendarDaysBetween("2027-01-02", "2026-12-30")).toBe(-3);
  });
});

describe("workYearBounds", () => {
  it("treats an exact hire anniversary as the first day of the new work year", () => {
    // Highest-risk off-by-one: ref falls exactly on the anniversary of hireDate.
    const { start, end } = workYearBounds("2022-04-01", "2026-04-01");
    expect(start).toBe("2026-04-01");
    expect(end).toBe("2027-03-31");
  });

  it("keeps the prior work year for a ref one day before the anniversary", () => {
    const { start, end } = workYearBounds("2022-04-01", "2026-03-31");
    expect(start).toBe("2025-04-01");
    expect(end).toBe("2026-03-31");
  });

  it("lands the work-year end on Feb 29 in a leap year", () => {
    const { start, end } = workYearBounds("2023-03-01", "2023-06-01");
    expect(start).toBe("2023-03-01");
    expect(end).toBe("2024-02-29");
  });
});

describe("fmtDateHY", () => {
  it("formats as '<day> <armenian month> <year>'", () => {
    expect(fmtDateHY("2026-08-24")).toBe("24 օգոստոսի 2026");
  });
});
