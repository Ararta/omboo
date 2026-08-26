import type { RecallStatus, RequestStatus, RequestType } from "@omboo/shared";

export interface EmployeeView {
  id: string;
  name: string;
  position: string;
  email: string;
  hireDate: string;
  minimumDays: number;
  extendedDays: number;
  additionalDays: number;
  annualTotal: number;
  balance: number;
  dayOffBalance: number;
  lastVacationRequestDate: string | null;
  lastReminderFired: number | null;
  tenDayChunkConfirmed: boolean;
  priorityUnder18: boolean;
  priorityParentOrPregnant: boolean;
  priorityTeacher: boolean;
  priorityCaregiver: boolean;
  priorityViolenceVictim: boolean;
}

export interface AttendanceStatusView {
  checkedIn: boolean;
  since: string | null;
}

export interface RecallView {
  id: string;
  requestedEnd: string;
  reason: string;
  status: RecallStatus;
  orderNumber: string | null;
}

export interface RequestHistoryView {
  id: string;
  step: string;
  actorDisplayName: string;
  note: string | null;
  createdAt: string;
}

export interface RequestView {
  id: string;
  employeeId: string;
  type: RequestType;
  start: string;
  end: string;
  days: number;
  reason: string | null;
  status: RequestStatus;
  orderNumber: string | null;
  history?: RequestHistoryView[];
  recall?: RecallView | null;
  employee?: EmployeeView;
}
