import { addDaysISO, businessDays, fmtDateHY, workYearBounds } from "./date-utils.js";
import type { OrderSeries } from "./types.js";

/** Base offset per series, matching the prototype's `Հրց-<year>-<100|200 + n>` convention. */
export const ORDER_NUMBER_BASE: Record<OrderSeries, number> = { PRIMARY: 100, RECALL: 200 };

/** `sequenceValue` is the 1-based value of the per-year/per-series counter AFTER it has been
 * atomically incremented (see packages/database `OrderSequence`). */
export function formatOrderNumber(year: number, series: OrderSeries, sequenceValue: number): string {
  return `Հրց-${year}-${ORDER_NUMBER_BASE[series] + sequenceValue}`;
}

/** A recall's new end date must be strictly before the original end — otherwise it isn't an
 * early return. Not explicit in the prototype but implied; enforced here as a small hardening. */
export function isValidRecallRequestedEnd(originalEnd: string, requestedEnd: string): boolean {
  return requestedEnd < originalEnd;
}

export interface RecallFinalizationResult {
  newDays: number;
  delta: number;
}

/** Recomputes business days for the shortened range and the number of days to restore to
 * the employee's balance (հոդված 166/167). */
export function computeRecallFinalization(
  request: { start: string; end: string; days: number },
  requestedEnd: string,
): RecallFinalizationResult {
  const newDays = businessDays(request.start, requestedEnd);
  const delta = request.days - newDays;
  return { newDays, delta };
}

export interface OrderDocumentViewModel {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  directorName: string;
  hrName: string;
  orderNumber: string;
  issueDateHY: string;
  issueLocation: string;
  employeeName: string;
  workYearStartHY: string;
  workYearEndHY: string;
  days: number;
  startHY: string;
  endHY: string;
  returnDateHY: string;
  signed: boolean;
  directorSignatureUrl: string | null;
}

/** Builds the view model consumed by the order-document PDF template (see
 * apps/api/src/modules/orders/templates/order-document.hbs), ported from the prototype's
 * `OrderDocument` component (reference/mrk_prototype_1.jsx lines 313-362). */
export function buildOrderDocumentData(
  request: { start: string; end: string; days: number },
  employee: { name: string; hireDate: string },
  org: { companyName: string; address: string; phone: string; email: string; directorName: string; hrName: string },
  orderNumber: string,
  todayISO: string,
  signed: boolean,
  directorSignatureUrl: string | null = null,
): OrderDocumentViewModel {
  const wy = workYearBounds(employee.hireDate, request.start);
  const returnDate = addDaysISO(request.end, 1);
  return {
    companyName: org.companyName,
    address: org.address,
    phone: org.phone,
    email: org.email,
    directorName: org.directorName,
    hrName: org.hrName,
    orderNumber,
    issueDateHY: fmtDateHY(todayISO),
    issueLocation: "ք. Երևան",
    employeeName: employee.name,
    workYearStartHY: fmtDateHY(wy.start),
    workYearEndHY: fmtDateHY(wy.end),
    days: request.days,
    startHY: fmtDateHY(request.start),
    endHY: fmtDateHY(request.end),
    returnDateHY: fmtDateHY(returnDate),
    signed,
    directorSignatureUrl,
  };
}
