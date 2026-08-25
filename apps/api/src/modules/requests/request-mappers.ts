import type { Employee, Request as RequestRow } from "@omboo/database";
import type { EmployeeRuleContext, RequestRuleContext } from "@omboo/shared";

export function toEmployeeRuleContext(e: Employee): EmployeeRuleContext {
  return {
    id: e.id,
    hireDate: e.hireDate.toISOString().slice(0, 10),
    balance: e.balance,
    dayOffBalance: e.dayOffBalance,
    tenDayChunkConfirmed: e.tenDayChunkConfirmed,
  };
}

export function toRequestRuleContext(r: RequestRow): RequestRuleContext {
  return {
    employeeId: r.employeeId,
    type: r.type,
    start: r.start.toISOString().slice(0, 10),
    end: r.end.toISOString().slice(0, 10),
    days: r.days,
    status: r.status,
  };
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
