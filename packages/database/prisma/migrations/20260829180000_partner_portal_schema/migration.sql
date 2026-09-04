-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ContractYearTier" AS ENUM ('YEAR_1', 'YEAR_2_PLUS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "assignedContactName" TEXT,
    "assignedContactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PartnerRole" NOT NULL DEFAULT 'OWNER',
    "partnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_refresh_tokens" (
    "id" TEXT NOT NULL,
    "partnerUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partnerId" TEXT NOT NULL,

    CONSTRAINT "partner_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_prices" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amountAmd" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rates" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "contractYearTier" "ContractYearTier" NOT NULL,
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_assets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "contractYear" INTEGER NOT NULL DEFAULT 1,
    "customerCompanyName" TEXT NOT NULL,
    "customerContactName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "priceAmountAmd" INTEGER NOT NULL,
    "commissionRatePercent" DOUBLE PRECISION NOT NULL,
    "commissionAmountAmd" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "commissionPaidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByPartnerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amountAmd" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AMD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryChannel" "DeliveryChannel" NOT NULL DEFAULT 'EMAIL',
    "pdfFileKey" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_invoice_sequences" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "partnerId" TEXT NOT NULL,

    CONSTRAINT "partner_invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partner_users_email_key" ON "partner_users"("email");

-- CreateIndex
CREATE INDEX "partner_users_partnerId_idx" ON "partner_users"("partnerId");

-- CreateIndex
CREATE INDEX "partner_refresh_tokens_partnerUserId_idx" ON "partner_refresh_tokens"("partnerUserId");

-- CreateIndex
CREATE INDEX "partner_refresh_tokens_partnerId_idx" ON "partner_refresh_tokens"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "packages_key_key" ON "packages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "package_prices_packageId_billingCycle_key" ON "package_prices"("packageId", "billingCycle");

-- CreateIndex
CREATE UNIQUE INDEX "commission_rates_packageId_billingCycle_contractYearTier_key" ON "commission_rates"("packageId", "billingCycle", "contractYearTier");

-- CreateIndex
CREATE INDEX "orders_partnerId_status_idx" ON "orders"("partnerId", "status");

-- CreateIndex
CREATE INDEX "orders_partnerId_idx" ON "orders"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_partnerId_idx" ON "invoices"("partnerId");

-- CreateIndex
CREATE INDEX "partner_invoice_sequences_partnerId_idx" ON "partner_invoice_sequences"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_invoice_sequences_partnerId_year_key" ON "partner_invoice_sequences"("partnerId", "year");

-- AddForeignKey
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_refresh_tokens" ADD CONSTRAINT "partner_refresh_tokens_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "partner_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_refresh_tokens" ADD CONSTRAINT "partner_refresh_tokens_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_prices" ADD CONSTRAINT "package_prices_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_invoice_sequences" ADD CONSTRAINT "partner_invoice_sequences_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

