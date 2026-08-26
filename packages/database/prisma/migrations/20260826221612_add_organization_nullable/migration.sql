-- DropIndex
DROP INDEX "employees_email_key";

-- AlterTable
ALTER TABLE "attendance_logs" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "balance_adjustment_log" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "employee_documents" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "order_sequences" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "org_settings" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "recalls" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "request_history" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "requests" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "attendance_logs_organizationId_idx" ON "attendance_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_log_organizationId_idx" ON "audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "balance_adjustment_log_organizationId_idx" ON "balance_adjustment_log"("organizationId");

-- CreateIndex
CREATE INDEX "employee_documents_organizationId_idx" ON "employee_documents"("organizationId");

-- CreateIndex
CREATE INDEX "employees_organizationId_idx" ON "employees"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "order_sequences_organizationId_idx" ON "order_sequences"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_settings_organizationId_key" ON "org_settings"("organizationId");

-- CreateIndex
CREATE INDEX "recalls_organizationId_idx" ON "recalls"("organizationId");

-- CreateIndex
CREATE INDEX "refresh_tokens_organizationId_idx" ON "refresh_tokens"("organizationId");

-- CreateIndex
CREATE INDEX "request_history_organizationId_idx" ON "request_history"("organizationId");

-- CreateIndex
CREATE INDEX "requests_organizationId_idx" ON "requests"("organizationId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_sequences" ADD CONSTRAINT "order_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_adjustment_log" ADD CONSTRAINT "balance_adjustment_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

