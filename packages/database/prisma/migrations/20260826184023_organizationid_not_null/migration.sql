-- DropForeignKey
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "balance_adjustment_log" DROP CONSTRAINT "balance_adjustment_log_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "employee_documents" DROP CONSTRAINT "employee_documents_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "order_sequences" DROP CONSTRAINT "order_sequences_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "org_settings" DROP CONSTRAINT "org_settings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "recalls" DROP CONSTRAINT "recalls_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "request_history" DROP CONSTRAINT "request_history_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organizationId_fkey";

-- DropIndex
DROP INDEX "order_sequences_year_series_key";

-- DropIndex
DROP INDEX "org_settings_organizationId_key";

-- AlterTable
ALTER TABLE "attendance_logs" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "balance_adjustment_log" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_documents" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_sequences" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "org_settings" DROP CONSTRAINT "org_settings_pkey",
DROP COLUMN "id",
ALTER COLUMN "organizationId" SET NOT NULL,
ADD CONSTRAINT "org_settings_pkey" PRIMARY KEY ("organizationId");

-- AlterTable
ALTER TABLE "recalls" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "refresh_tokens" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "request_history" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "requests" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "employees_organizationId_email_key" ON "employees"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "order_sequences_organizationId_year_series_key" ON "order_sequences"("organizationId", "year", "series");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sequences" ADD CONSTRAINT "order_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustment_log" ADD CONSTRAINT "balance_adjustment_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

