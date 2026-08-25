import { describe, expect, it } from "vitest";
import {
  chunkSatisfied,
  getReminderInfo,
  MIN_CHUNK_DAYS,
  REMINDER_NOTIFY_SET,
  shouldFireReminder,
  validateSubmitRequest,
  VALIDATION_ERRORS,
} from "./vacation-rules.js";
import type { EmployeeRuleContext, RequestRuleContext } from "./types.js";

const baseEmployee: EmployeeRuleContext = {
  id: "e1",
  hireDate: "2020-01-01",
  balance: 20,
  dayOffBalance: 5,
  tenDayChunkConfirmed: false,
};

function req(overrides: Partial<RequestRuleContext>): RequestRuleContext {
  return {
    employeeId: "e1",
    type: "VACATION",
    start: "2026-01-19",
    end: "2026-01-23",
    days: 5,
    status: "SUBMITTED",
    ...overrides,
  };
}

describe("chunkSatisfied", () => {
  const wy = { start: "2025-01-01", end: "2025-12-31" };

  it("is true for a >=10-day non-rejected vacation request inside the work year", () => {
    expect(chunkSatisfied([req({ days: MIN_CHUNK_DAYS, start: "2025-06-01" })], "e1", wy)).toBe(true);
  });

  it("is false when the only chunk is 9 days", () => {
    expect(chunkSatisfied([req({ days: 9, start: "2025-06-01" })], "e1", wy)).toBe(false);
  });

  it("excludes rejected requests even if >=10 days", () => {
    expect(chunkSatisfied([req({ days: 10, start: "2025-06-01", status: "REJECTED" })], "e1", wy)).toBe(false);
  });

  it("excludes cancelled requests even if >=10 days", () => {
    expect(chunkSatisfied([req({ days: 10, start: "2025-06-01", status: "CANCELLED" })], "e1", wy)).toBe(false);
  });

  it("includes a request starting exactly on the work-year boundary", () => {
    expect(chunkSatisfied([req({ days: 10, start: wy.start })], "e1", wy)).toBe(true);
    expect(chunkSatisfied([req({ days: 10, start: wy.end })], "e1", wy)).toBe(true);
  });
});

describe("getReminderInfo / shouldFireReminder", () => {
  it("fires at exactly daysRemaining === 0", () => {
    const { daysRemaining } = getReminderInfo("2020-01-01", "2020-01-01", "2022-07-02"); // deadline = 2020-01-01 + 913d = 2022-07-02
    expect(daysRemaining).toBe(0);
    expect(REMINDER_NOTIFY_SET.has(daysRemaining)).toBe(true);
    expect(shouldFireReminder(daysRemaining, null)).toBe(true);
  });

  it("does not fire once overdue (negative daysRemaining)", () => {
    const { daysRemaining } = getReminderInfo("2020-01-01", "2020-01-01", "2022-07-10");
    expect(daysRemaining).toBeLessThan(0);
    expect(shouldFireReminder(daysRemaining, null)).toBe(false);
  });

  it("does not re-fire for the same daysRemaining value twice", () => {
    expect(shouldFireReminder(30, 30)).toBe(false);
    expect(shouldFireReminder(30, 29)).toBe(true);
  });
});

describe("validateSubmitRequest", () => {
  const today = "2026-01-07"; // Wednesday

  it("passes a well-formed vacation request (notice exactly 5 days, processing window exactly 2)", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-12", end: "2026-01-12" },
      { ...baseEmployee, balance: 12 },
      [],
      today,
    );
    expect(result).toEqual({ ok: true, days: 1 });
  });

  it("rejects a start date with only 4 days notice", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-12", end: "2026-01-12" },
      baseEmployee,
      [],
      "2026-01-08", // Thursday; start is 4 calendar days later (Monday)
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(VALIDATION_ERRORS.NOTICE_TOO_SHORT);
  });

  it("rejects when the processing window is only 1 business day (crosses a weekend)", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-14", end: "2026-01-14" }, // paymentDeadline lands on a Sunday
      baseEmployee,
      [],
      "2026-01-08",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(VALIDATION_ERRORS.PROCESSING_WINDOW_TOO_SHORT);
  });

  it("հոդված 163: blocks when the post-request remainder is exactly 10 days", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-19", end: "2026-01-23" }, // 5 business days
      { ...baseEmployee, balance: 15 },
      [],
      today,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(VALIDATION_ERRORS.CHUNK_RULE_VIOLATION);
  });

  it("հոդված 163: allows when the post-request remainder is exactly 11 days", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-19", end: "2026-01-23" },
      { ...baseEmployee, balance: 16 },
      [],
      today,
    );
    expect(result).toEqual({ ok: true, days: 5 });
  });

  it("հոդված 163: always allows using up the entire remaining balance", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-19", end: "2026-01-23" },
      { ...baseEmployee, balance: 5 },
      [],
      today,
    );
    expect(result).toEqual({ ok: true, days: 5 });
  });

  it("հոդված 163: chunkAlreadyUsed (tenDayChunkConfirmed) overrides a would-be violation", () => {
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-19", end: "2026-01-23" },
      { ...baseEmployee, balance: 15, tenDayChunkConfirmed: true },
      [],
      today,
    );
    expect(result).toEqual({ ok: true, days: 5 });
  });

  it("blocks overlap with an active request of the employee's own", () => {
    const existing = [req({ status: "SUBMITTED" })];
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-19", end: "2026-01-23" },
      { ...baseEmployee, balance: 30, tenDayChunkConfirmed: true },
      existing,
      today,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(VALIDATION_ERRORS.OVERLAP);
  });

  it("does not block overlap with a rejected request", () => {
    const existing = [req({ status: "REJECTED" })];
    const result = validateSubmitRequest(
      { type: "VACATION", start: "2026-01-19", end: "2026-01-23" },
      { ...baseEmployee, balance: 30, tenDayChunkConfirmed: true },
      existing,
      today,
    );
    expect(result).toEqual({ ok: true, days: 5 });
  });

  it("rejects a start date in the past", () => {
    const result = validateSubmitRequest({ type: "SICK", start: "2026-01-01", end: "2026-01-02" }, baseEmployee, [], today);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(VALIDATION_ERRORS.START_IN_PAST);
  });

  it("does not apply the 5-day notice or chunk rule to non-vacation types", () => {
    const result = validateSubmitRequest({ type: "SICK", start: today, end: today }, baseEmployee, [], today);
    expect(result).toEqual({ ok: true, days: 1 }); // 2026-01-07 is a Wednesday
  });
});
