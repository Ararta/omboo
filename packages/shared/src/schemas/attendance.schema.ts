import { z } from "zod";

export const gpsPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GpsPointInput = z.infer<typeof gpsPointSchema>;

export const attendanceUpdateSchema = z.object({
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().nullable().optional(),
  note: z.string().max(500).optional(),
});
export type AttendanceUpdateInput = z.infer<typeof attendanceUpdateSchema>;

export const attendanceManualCreateSchema = z.object({
  employeeId: z.string().min(1),
  checkInAt: z.string().datetime(),
  checkOutAt: z.string().datetime().nullable().optional(),
  note: z.string().max(500).optional(),
});
export type AttendanceManualCreateInput = z.infer<typeof attendanceManualCreateSchema>;

export const geofenceSettingsSchema = z.object({
  officeLat: z.number().min(-90).max(90).nullable(),
  officeLng: z.number().min(-180).max(180).nullable(),
  geofenceRadiusMeters: z.number().int().min(10).max(5000),
});
export type GeofenceSettingsInput = z.infer<typeof geofenceSettingsSchema>;
