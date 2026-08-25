import { addDaysISO, businessDays, calendarDaysBetween, rangesOverlap, workYearBounds } from "./date-utils.js";
import { validationMessages } from "./messages.js";
import { MIN_CHUNK_DAYS, REMINDER_NOTIFY_SET, REMINDER_THRESHOLD_DAYS } from "./constants.js";
import type { EmployeeRuleContext, RequestRuleContext, RequestType } from "./types.js";

export { MIN_CHUNK_DAYS, REMINDER_NOTIFY_SET, REMINDER_THRESHOLD_DAYS };

const ACTIVE_STATUSES_FOR_OVERLAP = new Set(["SUBMITTED", "APPROVED", "ORDER_CREATED"]);

function isActiveRequest(status: RequestRuleContext["status"]): boolean {
  return ACTIVE_STATUSES_FOR_OVERLAP.has(status);
}

/** հոդված 163 — has this employee already taken a >=10-business-day single vacation chunk
 * inside the given work year (via a non-rejected/non-cancelled request)? */
export function chunkSatisfied(
  existingRequests: RequestRuleContext[],
  employeeId: string,
  workYear: { start: string; end: string },
): boolean {
  return existingRequests.some(
    (r) =>
      r.employeeId === employeeId &&
      r.type === "VACATION" &&
      isActiveRequest(r.status) &&
      r.days >= MIN_CHUNK_DAYS &&
      r.start >= workYear.start &&
      r.start <= workYear.end,
  );
}

export interface ReminderInfo {
  deadlineDate: string;
  daysRemaining: number;
}

/** հոդված 164.10 countdown: days remaining until the 2.5-year silent-employee deadline
 * (negative once overdue). */
export function getReminderInfo(lastVacationRequestDate: string | null, hireDate: string, refISO: string): ReminderInfo {
  const last = lastVacationRequestDate || hireDate;
  const deadlineDate = addDaysISO(last, REMINDER_THRESHOLD_DAYS);
  const daysRemaining = calendarDaysBetween(refISO, deadlineDate);
  return { deadlineDate, daysRemaining };
}

/** Fires once per distinct `daysRemaining` threshold value (dedupe via `lastReminderFired`),
 * matching the prototype's cron-safe re-run behavior. */
export function shouldFireReminder(daysRemaining: number, lastReminderFired: number | null): boolean {
  return REMINDER_NOTIFY_SET.has(daysRemaining) && lastReminderFired !== daysRemaining;
}

export const VALIDATION_ERRORS = {
  INVALID_DATES: "INVALID_DATES",
  START_IN_PAST: "START_IN_PAST",
  OVERLAP: "OVERLAP",
  NOTICE_TOO_SHORT: "NOTICE_TOO_SHORT",
  PROCESSING_WINDOW_TOO_SHORT: "PROCESSING_WINDOW_TOO_SHORT",
  CHUNK_RULE_VIOLATION: "CHUNK_RULE_VIOLATION",
} as const;

export type ValidationErrorCode = (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS];

export type ValidateSubmitRequestResult =
  | { ok: true; days: number }
  | { ok: false; code: ValidationErrorCode; message: string };

/**
 * Full server-side (and client-side pre-validation) rule engine for submitting a new
 * request. Implements, in order: valid dates + days>0 -> start not in the past -> no overlap
 * with the employee's own active requests -> (vacation only) >=5-day notice (հոդված 169) ->
 * >=2 business days between tomorrow and (start-3 days) for payment processing (հոդված 169)
 * -> հոդված 163 chunk rule.
 *
 * This is the single source of truth used by both the API (authoritative) and web/mobile
 * (instant inline-error UX) — never trust a client-computed result server-side.
 */
export function validateSubmitRequest(
  input: { type: RequestType; start: string; end: string },
  employee: EmployeeRuleContext,
  existingRequests: RequestRuleContext[],
  todayISO: string,
): ValidateSubmitRequestResult {
  if (!input.start || !input.end) {
    return { ok: false, code: VALIDATION_ERRORS.INVALID_DATES, message: validationMessages.invalidDates };
  }
  const days = businessDays(input.start, input.end);
  if (days <= 0) {
    return { ok: false, code: VALIDATION_ERRORS.INVALID_DATES, message: validationMessages.invalidDates };
  }
  if (input.start < todayISO) {
    return { ok: false, code: VALIDATION_ERRORS.START_IN_PAST, message: validationMessages.startInPast };
  }

  const activeOwn = existingRequests.filter((r) => r.employeeId === employee.id && isActiveRequest(r.status));
  if (activeOwn.some((r) => rangesOverlap(input.start, input.end, r.start, r.end))) {
    return { ok: false, code: VALIDATION_ERRORS.OVERLAP, message: validationMessages.overlap };
  }

  if (input.type === "VACATION") {
    const notice = calendarDaysBetween(todayISO, input.start);
    if (notice < 5) {
      return { ok: false, code: VALIDATION_ERRORS.NOTICE_TOO_SHORT, message: validationMessages.noticeTooShort };
    }

    const paymentDeadline = addDaysISO(input.start, -3);
    const processStart = addDaysISO(todayISO, 1);
    const availableWorkDays = businessDays(processStart, paymentDeadline);
    if (availableWorkDays < 2) {
      return {
        ok: false,
        code: VALIDATION_ERRORS.PROCESSING_WINDOW_TOO_SHORT,
        message: validationMessages.processingWindowTooShort,
      };
    }

    const wy = workYearBounds(employee.hireDate, todayISO);
    const chunkAlreadyUsed = chunkSatisfied(existingRequests, employee.id, wy) || employee.tenDayChunkConfirmed;
    const remainingAfter = employee.balance - days;
    const chunkRuleOk = days >= MIN_CHUNK_DAYS || chunkAlreadyUsed || remainingAfter <= 0 || remainingAfter > MIN_CHUNK_DAYS;
    if (!chunkRuleOk) {
      return {
        ok: false,
        code: VALIDATION_ERRORS.CHUNK_RULE_VIOLATION,
        message: validationMessages.chunkRuleViolation(remainingAfter),
      };
    }
  }

  return { ok: true, days };
}
