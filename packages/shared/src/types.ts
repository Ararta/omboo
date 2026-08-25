// Domain types mirrored from packages/database/prisma/schema.prisma as plain string-literal
// unions (not imported from @prisma/client) so this package stays dependency-free of Prisma —
// it must be safely importable from apps/web and apps/mobile bundles.

export type Role = "EMPLOYEE" | "DIRECTOR" | "HR";

export type RequestType = "VACATION" | "UNPAID" | "SICK" | "DAYOFF";

export type RequestStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "ORDER_CREATED";

export type RecallStatus = "PENDING_EMPLOYEE" | "ACCEPTED" | "DECLINED" | "FINALIZED";

export type OrderSeries = "PRIMARY" | "RECALL";

/** Minimal employee shape the vacation-rule engine needs. All dates are ISO ("YYYY-MM-DD") strings. */
export interface EmployeeRuleContext {
  id: string;
  hireDate: string;
  balance: number;
  dayOffBalance: number;
  tenDayChunkConfirmed: boolean;
}

/** Minimal request shape the rule engine needs for overlap/chunk checks. */
export interface RequestRuleContext {
  employeeId: string;
  type: RequestType;
  start: string;
  end: string;
  days: number;
  status: RequestStatus;
}

export interface PriorityFlags {
  under18: boolean;
  parentOrPregnant: boolean;
  teacher: boolean;
  caregiver: boolean;
  violenceVictim: boolean;
}
