import { DateTime } from "luxon";
import type { BillingCycle } from "./types.js";

/** `sequenceValue` is the 1-based value of the per-partner/per-year counter AFTER it has been
 * atomically incremented (see packages/database `PartnerInvoiceSequence`). */
export function formatInvoiceNumber(year: number, sequenceValue: number): string {
  return `INV-${year}-${String(sequenceValue).padStart(4, "0")}`;
}

const CYCLE_MONTHS: Record<BillingCycle, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

/** The "next payout date" shown on a partner's Overview — decided (see the plan) to be the
 * invoice date plus however long the billing cycle the customer paid for actually covers
 * (monthly -> +1 month, quarterly -> +3, yearly -> +12), not a fixed calendar day. Takes/returns
 * ISO ("YYYY-MM-DD") dates, consistent with date-utils.ts's convention. */
export function computePayoutEligibleDate(invoiceCreatedAtISO: string, billingCycle: BillingCycle): string {
  const base = DateTime.fromISO(invoiceCreatedAtISO, { zone: "utc" });
  const result = (base.isValid ? base : DateTime.utc()).plus({ months: CYCLE_MONTHS[billingCycle] });
  return result.toISODate() ?? invoiceCreatedAtISO;
}
