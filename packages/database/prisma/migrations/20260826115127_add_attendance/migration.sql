-- AlterTable
ALTER TABLE "org_settings" ADD COLUMN     "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN     "officeLat" DOUBLE PRECISION,
ADD COLUMN     "officeLng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkInLat" DOUBLE PRECISION NOT NULL,
    "checkInLng" DOUBLE PRECISION NOT NULL,
    "checkInWithinGeofence" BOOLEAN NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "checkOutWithinGeofence" BOOLEAN,
    "editedByUserId" TEXT,
    "editedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_logs_employeeId_checkInAt_idx" ON "attendance_logs"("employeeId", "checkInAt");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
