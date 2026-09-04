import { z } from "zod";

export const BILLING_CYCLES = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
export const BILLING_CYCLE_LABELS: Record<(typeof BILLING_CYCLES)[number], string> = {
  MONTHLY: "Ամսական",
  QUARTERLY: "Եռամսյակային",
  YEARLY: "Տարեկան",
};

export const CONTRACT_YEAR_TIERS = ["YEAR_1", "YEAR_2_PLUS"] as const;
export const CONTRACT_YEAR_TIER_LABELS: Record<(typeof CONTRACT_YEAR_TIERS)[number], string> = {
  YEAR_1: "1-ին տարի",
  YEAR_2_PLUS: "2-րդ տարուց սկսած",
};

export const PARTNER_ORDER_STATUS_LABELS: Record<"PENDING_PAYMENT" | "PAID" | "CANCELLED", string> = {
  PENDING_PAYMENT: "Սպասում է վճարման",
  PAID: "Վճարված է",
  CANCELLED: "Չեղարկված է",
};

export const INVOICE_STATUS_LABELS: Record<"DRAFT" | "SENT" | "PAID" | "CANCELLED", string> = {
  DRAFT: "Նախագիծ",
  SENT: "Ուղարկված է",
  PAID: "Վճարված է",
  CANCELLED: "Չեղարկված է",
};

export const COMMISSION_STATUS_LABELS: Record<"PENDING" | "PAID", string> = {
  PENDING: "Սպասվում է",
  PAID: "Վճարված է",
};

// Maps an order's plain contractYear (1, 2, 3, ...) to the two-tier rate lookup key.
export function contractYearToTier(contractYear: number): (typeof CONTRACT_YEAR_TIERS)[number] {
  return contractYear <= 1 ? "YEAR_1" : "YEAR_2_PLUS";
}

// ---- Partner-facing: New Deal (order) creation ----
export const createOrderSchema = z.object({
  packageId: z.string().min(1),
  billingCycle: z.enum(BILLING_CYCLES),
  contractYear: z.coerce.number().int().min(1).default(1),
  customerCompanyName: z.string().min(1, "Կազմակերպության անվանումը պարտադիր է։"),
  customerContactName: z.string().min(1, "Կոնտակտային անձի անունը պարտադիր է։"),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1, "Հեռախոսահամարը պարտադիր է։"),
  notes: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ---- Platform Admin: Packages + prices ----
const packagePriceInputSchema = z.object({
  billingCycle: z.enum(BILLING_CYCLES),
  amountAmd: z.coerce.number().int().min(0),
});

export const createPackageSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Միայն մեծատառ լատինատառեր, թվեր և ընդգծում (_)։"),
  name: z.string().min(1, "Անվանումը պարտադիր է։"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  prices: z.array(packagePriceInputSchema).min(1, "Առնվազն մեկ գին պարտադիր է։"),
});
export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  prices: z.array(packagePriceInputSchema).optional(),
});
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

// ---- Platform Admin: Commission rates ----
export const setCommissionRatesSchema = z.object({
  packageId: z.string().min(1),
  rates: z
    .array(
      z.object({
        billingCycle: z.enum(BILLING_CYCLES),
        contractYearTier: z.enum(CONTRACT_YEAR_TIERS),
        ratePercent: z.coerce.number().min(0).max(100),
      }),
    )
    .min(1),
});
export type SetCommissionRatesInput = z.infer<typeof setCommissionRatesSchema>;

// ---- Platform Admin: marketing asset upload metadata ----
export const marketingAssetUploadMetaSchema = z.object({
  title: z.string().min(1, "Վերնագիրը պարտադիր է։"),
  description: z.string().optional(),
});
export type MarketingAssetUploadMetaInput = z.infer<typeof marketingAssetUploadMetaSchema>;
