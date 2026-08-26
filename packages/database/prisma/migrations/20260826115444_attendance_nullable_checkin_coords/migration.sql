-- AlterTable
ALTER TABLE "attendance_logs" ALTER COLUMN "checkInLat" DROP NOT NULL,
ALTER COLUMN "checkInLng" DROP NOT NULL,
ALTER COLUMN "checkInWithinGeofence" DROP NOT NULL;
