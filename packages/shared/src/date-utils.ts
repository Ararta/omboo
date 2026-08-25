import { DateTime } from "luxon";

/**
 * All functions here operate on plain ISO calendar dates ("YYYY-MM-DD"), never on
 * time-of-day. We always parse in the UTC zone purely to get consistent calendar-date
 * arithmetic (avoids any local-timezone/DST drift inside the library) — this is distinct
 * from `todayInYerevan`, which is the one place actual wall-clock "what day is it right
 * now in Armenia" matters.
 */
function parseISO(dateISO: string): DateTime {
  return DateTime.fromISO(dateISO, { zone: "utc" });
}

/** "What day is it in Armenia right now" — the only correct source of "today" for every
 * legal-deadline computation (notice period, past-date check, reminder cadence). The
 * prototype used `new Date().toISOString().slice(0,10)`, which is UTC and can be off by
 * a day near midnight in Armenia (UTC+4) — do not reintroduce that bug server-side. */
export function todayInYerevan(): string {
  const d = DateTime.now().setZone("Asia/Yerevan").toISODate();
  if (!d) throw new Error("Failed to compute today's date in Asia/Yerevan");
  return d;
}

/** Count of Mon-Fri days (inclusive) between two ISO dates. Mirrors the prototype's
 * `businessDays`: invalid/empty input or end < start returns 0. */
export function businessDays(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (!start.isValid || !end.isValid || end < start) return 0;
  let count = 0;
  let d = start;
  while (d <= end) {
    const weekday = d.weekday; // Luxon: 1=Monday .. 7=Sunday
    if (weekday !== 6 && weekday !== 7) count++;
    d = d.plus({ days: 1 });
  }
  return count;
}

/** Signed count of calendar days from `aISO` to `bISO` (negative if b is before a). */
export function calendarDaysBetween(aISO: string, bISO: string): number {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  return Math.round(b.diff(a, "days").days);
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return parseISO(aStart) <= parseISO(bEnd) && parseISO(bStart) <= parseISO(aEnd);
}

export function addDaysISO(dateISO: string, n: number): string {
  const d = parseISO(dateISO);
  const base = d.isValid ? d : DateTime.utc();
  const result = base.plus({ days: n }).toISODate();
  if (!result) throw new Error(`addDaysISO: failed to compute date for ${dateISO} + ${n}`);
  return result;
}

/**
 * Individual (non-calendar) work-year bounds — հոդված 164.1. Finds the anniversary-based
 * 1-year window, anchored to `hireDateISO`, that contains `refISO`.
 *
 * Semantics are intentionally strict (`next > ref`, not `>=`): when `refISO` falls exactly
 * on a hire anniversary, that anniversary is treated as the FIRST day of the new work year
 * (matches the validated prototype behavior — this is the single highest-risk off-by-one in
 * the whole rule set, since it gates the հոդված 163 chunk-satisfaction window).
 */
export function workYearBounds(hireDateISO: string, refISO: string): { start: string; end: string } {
  const hire = parseISO(hireDateISO || refISO);
  const ref = parseISO(refISO);
  if (!hire.isValid || !ref.isValid) {
    return { start: refISO, end: refISO };
  }
  let start = hire;
  // Guard matches the prototype's `guard < 80` runaway-loop protection.
  for (let i = 0; i < 80; i++) {
    const next = start.plus({ years: 1 });
    if (next > ref) break;
    start = next;
  }
  const end = start.plus({ years: 1 }).minus({ days: 1 });
  const startISO = start.toISODate();
  const endISO = end.toISODate();
  if (!startISO || !endISO) throw new Error("workYearBounds: failed to compute bounds");
  return { start: startISO, end: endISO };
}

export const HY_MONTHS = [
  "հունվարի",
  "փետրվարի",
  "մարտի",
  "ապրիլի",
  "մայիսի",
  "հունիսի",
  "հուլիսի",
  "օգոստոսի",
  "սեպտեմբերի",
  "հոկտեմբերի",
  "նոյեմբերի",
  "դեկտեմբերի",
] as const;

/** "24 օգոստոսի 2026" — matches the prototype's `fmtDate`. */
export function fmtDateHY(dateISO: string): string {
  const d = parseISO(dateISO);
  if (!d.isValid) return dateISO;
  return `${d.day} ${HY_MONTHS[d.month - 1]} ${d.year}`;
}
