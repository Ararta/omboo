import { z } from "zod";
import { isoDateSchema } from "./common.js";

export const priorityFlagsSchema = z.object({
  under18: z.boolean().default(false),
  parentOrPregnant: z.boolean().default(false),
  teacher: z.boolean().default(false),
  caregiver: z.boolean().default(false),
  violenceVictim: z.boolean().default(false),
});
export type PriorityFlagsInput = z.infer<typeof priorityFlagsSchema>;

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Անունը պարտադիր է։"),
  position: z.string().min(1).default("—"),
  email: z.string().email().optional().or(z.literal("")),
  hireDate: isoDateSchema,
  minimumDays: z.number().int().min(0).default(0),
  extendedDays: z.number().int().min(0).default(0),
  additionalDays: z.number().int().min(0).default(0),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  email: z.string().email().optional(),
  hireDate: isoDateSchema.optional(),
  minimumDays: z.number().int().min(0).optional(),
  extendedDays: z.number().int().min(0).optional(),
  additionalDays: z.number().int().min(0).optional(),
  dayOffBalance: z.number().int().min(0).optional(),
  tenDayChunkConfirmed: z.boolean().optional(),
  priorityUnder18: z.boolean().optional(),
  priorityParentOrPregnant: z.boolean().optional(),
  priorityTeacher: z.boolean().optional(),
  priorityCaregiver: z.boolean().optional(),
  priorityViolenceVictim: z.boolean().optional(),
  managerId: z.string().nullable().optional(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
