-- CreateEnum
CREATE TYPE "GeneratedDocumentStatus" AS ENUM ('PENDING_EMPLOYEE_SIGNATURE', 'PENDING_DIRECTOR_SIGNATURE', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentCategory" ADD VALUE 'AGREEMENT';
ALTER TYPE "DocumentCategory" ADD VALUE 'STATEMENT';
ALTER TYPE "DocumentCategory" ADD VALUE 'CLAIM';

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'PENDING_EMPLOYEE_SIGNATURE',
    "createdByUserId" TEXT NOT NULL,
    "employeeSignedAt" TIMESTAMP(3),
    "employeeSignedByUserId" TEXT,
    "directorSignedAt" TIMESTAMP(3),
    "directorSignedByUserId" TEXT,
    "finalDocumentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_organizationId_category_idx" ON "document_templates"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_finalDocumentId_key" ON "generated_documents"("finalDocumentId");

-- CreateIndex
CREATE INDEX "generated_documents_organizationId_status_idx" ON "generated_documents"("organizationId", "status");

-- CreateIndex
CREATE INDEX "generated_documents_employeeId_idx" ON "generated_documents"("employeeId");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_finalDocumentId_fkey" FOREIGN KEY ("finalDocumentId") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

