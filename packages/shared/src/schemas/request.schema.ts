import { z } from "zod";
import { isoDateSchema } from "./common.js";
import { validationMessages } from "../messages.js";

export const requestTypeSchema = z.enum(["VACATION", "UNPAID", "SICK", "DAYOFF"]);

export const createRequestSchema = z.object({
  type: requestTypeSchema,
  start: isoDateSchema,
  end: isoDateSchema,
  reason: z.string().max(2000).optional(),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const directorDecisionSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().max(2000).optional(),
  })
  .refine((data) => data.decision !== "REJECTED" || !!data.note?.trim(), {
    message: validationMessages.rejectionNoteRequired,
    path: ["note"],
  });
export type DirectorDecisionInput = z.infer<typeof directorDecisionSchema>;

export const hrScheduleVacationSchema = z.object({
  employeeId: z.string().min(1),
  start: isoDateSchema,
  days: z.number().int().positive(),
});
export type HrScheduleVacationInput = z.infer<typeof hrScheduleVacationSchema>;

export const recallRequestSchema = z.object({
  requestedEnd: isoDateSchema,
  reason: z.string().min(1, "Հիմնավորումը պարտադիր է։").max(2000),
});
export type RecallRequestInput = z.infer<typeof recallRequestSchema>;

export const recallRespondSchema = z.object({
  accept: z.boolean(),
});
export type RecallRespondInput = z.infer<typeof recallRespondSchema>;

export const balanceAdjustmentSchema = z.object({
  balance: z.number().int().min(0),
});
export type BalanceAdjustmentInput = z.infer<typeof balanceAdjustmentSchema>;
