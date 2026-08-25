/**
 * Pure legal-threshold constants with no dependencies on other modules in this package —
 * kept separate from vacation-rules.ts specifically so messages.ts can reference
 * MIN_CHUNK_DAYS without creating a vacation-rules.ts <-> messages.ts import cycle (Metro
 * flags require cycles as a real "can result in uninitialized values" risk, unlike some
 * bundlers that tolerate them silently).
 */

/** հոդված 163 — a partial vacation must include at least one chunk of >= this many business days. */
export const MIN_CHUNK_DAYS = 10;

/** հոդված 164.10 — ~2.5 years, the silent-employee auto-notify threshold. */
export const REMINDER_THRESHOLD_DAYS = 913;

/** daysRemaining values (relative to the 164.10 deadline) that trigger a reminder: 30, 20, then every day of the final 10. */
export const REMINDER_NOTIFY_SET: ReadonlySet<number> = new Set([30, 20, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
