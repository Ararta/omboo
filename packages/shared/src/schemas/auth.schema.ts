import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

const slugSchema = z
  .string()
  .min(2, "Առնվազն 2 նիշ։")
  .max(63)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Միայն փոքրատառ լատինատառեր, թվեր և գծիկ։");

// Requesting HR access to an organization that already exists on Omboo.
export const registerSchema = z.object({
  name: z.string().min(1, "Անունը պարտադիր է։"),
  email: z.string().email(),
  password: z.string().min(8, "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"),
  orgSlug: slugSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Founding a brand-new organization on Omboo — creates the org and its first (auto-approved)
// DIRECTOR account in one step.
export const registerOrganizationSchema = z.object({
  organizationName: z.string().min(1, "Կազմակերպության անվանումը պարտադիր է։"),
  orgSlug: slugSchema,
  directorName: z.string().min(1, "Անունը պարտադիր է։"),
  email: z.string().email(),
  password: z.string().min(8, "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"),
});
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;

export const totpSetupConfirmSchema = z.object({
  setupToken: z.string().min(1),
  code: z.string().length(6),
});
export type TotpSetupConfirmInput = z.infer<typeof totpSetupConfirmSchema>;

export const totpVerifySchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6),
});
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;
