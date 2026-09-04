import type {
  BillingCycle,
  CommissionStatus,
  DeliveryChannel,
  DocumentCategory,
  GeneratedDocumentStatus,
  InvoiceStatus,
  PartnerOrderStatus,
  RecallStatus,
  RequestStatus,
  RequestType,
  TemplateCategory,
} from "@omboo/shared";

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
  managerId: string | null;
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

export interface OrgSettingsView {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  directorName: string;
  directorSignatureKey: string | null;
  directorSignatureUrl: string | null;
  hrName: string;
  hrEmail: string;
  officeLat: number | null;
  officeLng: number | null;
  geofenceRadiusMeters: number;
}

export interface AttendanceLogView {
  id: string;
  employeeId: string;
  checkInAt: string;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInWithinGeofence: boolean | null;
  checkOutAt: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutWithinGeofence: boolean | null;
  editedByUserId: string | null;
  editedAt: string | null;
  note: string | null;
  employee: { id: string; name: string; position: string };
}

export interface AttendanceReportRowView {
  employeeId: string;
  name: string;
  position: string;
  totalHours: number;
  entryCount: number;
}

export interface NotificationView {
  id: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface PendingUserView {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export interface DocumentView {
  id: string;
  employeeId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  createdAt: string;
  employee?: { id: string; name: string; position: string };
}

export interface DocumentTemplateView {
  id: string;
  name: string;
  category: TemplateCategory;
  contentHtml: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocumentView {
  id: string;
  templateId: string;
  employeeId: string;
  title: string;
  category: TemplateCategory;
  contentHtml: string;
  status: GeneratedDocumentStatus;
  employeeSignedAt: string | null;
  directorSignedAt: string | null;
  createdAt: string;
  employee?: { id: string; name: string; position: string };
  template?: { name: string };
}

// ---- B2B Partner Portal ----

export interface PackagePriceView {
  id: string;
  billingCycle: BillingCycle;
  amountAmd: number;
}

export interface PackageView {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  prices: PackagePriceView[];
}

export interface CommissionRateView {
  id: string;
  packageId: string;
  billingCycle: BillingCycle;
  contractYearTier: "YEAR_1" | "YEAR_2_PLUS";
  ratePercent: number;
  package?: { id: string; key: string; name: string };
}

export interface InvoiceView {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amountAmd: number;
  currency: string;
  status: InvoiceStatus;
  deliveryChannel: DeliveryChannel;
  pdfFileKey: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface OrderView {
  id: string;
  packageId: string;
  billingCycle: BillingCycle;
  contractYear: number;
  customerCompanyName: string;
  customerContactName: string;
  customerEmail: string;
  customerPhone: string;
  priceAmountAmd: number;
  commissionRatePercent: number;
  commissionAmountAmd: number;
  status: PartnerOrderStatus;
  commissionStatus: CommissionStatus;
  commissionPaidAt: string | null;
  notes: string | null;
  createdAt: string;
  package: { id: string; name: string };
  invoice: InvoiceView | null;
  partner?: { id: string; companyName: string };
}

export interface PartnerOverviewView {
  thisMonthSalesAmd: number;
  pendingCommissionAmd: number;
  paidCommissionAmd: number;
  nextPayoutDate: string | null;
  assignedContactName: string | null;
  assignedContactEmail: string | null;
}

export interface PartnerView {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  assignedContactName: string | null;
  assignedContactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingAssetView {
  id: string;
  title: string;
  description: string | null;
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedByUserId: string;
  createdAt: string;
}
