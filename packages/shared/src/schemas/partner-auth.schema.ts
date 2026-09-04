import { z } from "zod";

// B2B Partner Portal registration — fully self-service, immediately active (no approval gate,
// unlike the HR self-registration flow). loginSchema/refreshSchema from auth.schema.ts are
// reused as-is for partner login/refresh (identical email+password / refreshToken shape).
export const partnerRegisterSchema = z.object({
  companyName: z.string().min(1, "Կազմակերպության անվանումը պարտադիր է։"),
  contactName: z.string().min(1, "Կոնտակտային անձի անունը պարտադիր է։"),
  email: z.string().email(),
  phone: z.string().min(1, "Հեռախոսահամարը պարտադիր է։"),
  password: z.string().min(8, "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"),
});
export type PartnerRegisterInput = z.infer<typeof partnerRegisterSchema>;
