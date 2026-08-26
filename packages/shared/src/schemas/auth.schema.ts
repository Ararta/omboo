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

export const registerSchema = z.object({
  name: z.string().min(1, "Անունը պարտադիր է։"),
  email: z.string().email(),
  password: z.string().min(8, "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

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
