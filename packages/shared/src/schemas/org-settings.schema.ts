import { z } from "zod";

export const orgSettingsSchema = z.object({
  companyName: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  directorName: z.string().min(1),
  hrName: z.string().min(1),
  hrEmail: z.string().email(),
});
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;
