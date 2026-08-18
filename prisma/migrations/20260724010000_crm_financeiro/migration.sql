-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';

-- CreateEnum
CREATE TYPE "SalePaymentMode" AS ENUM ('CASH', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "InstallmentPeriod" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentMode" "SalePaymentMode" NOT NULL,
    "installmentsCount" INTEGER NOT NULL DEFAULT 1,
    "firstDueDate" TIMESTAMP(3),
    "period" "InstallmentPeriod",
    "customPeriodDays" INTEGER,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InstallmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_companyId_deletedAt_idx" ON "Sale"("companyId", "deletedAt");
CREATE INDEX "Sale_companyId_customerId_deletedAt_idx" ON "Sale"("companyId", "customerId", "deletedAt");
CREATE INDEX "Sale_companyId_soldAt_idx" ON "Sale"("companyId", "soldAt");

CREATE UNIQUE INDEX "Installment_transactionId_key" ON "Installment"("transactionId");
CREATE UNIQUE INDEX "Installment_saleId_number_key" ON "Installment"("saleId", "number");
CREATE INDEX "Installment_companyId_deletedAt_idx" ON "Installment"("companyId", "deletedAt");
CREATE INDEX "Installment_companyId_status_dueDate_idx" ON "Installment"("companyId", "status", "dueDate");
CREATE INDEX "Installment_saleId_idx" ON "Installment"("saleId");

CREATE UNIQUE INDEX "InstallmentPayment_transactionId_key" ON "InstallmentPayment"("transactionId");
CREATE INDEX "InstallmentPayment_companyId_deletedAt_idx" ON "InstallmentPayment"("companyId", "deletedAt");
CREATE INDEX "InstallmentPayment_installmentId_idx" ON "InstallmentPayment"("installmentId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallmentPayment" ADD CONSTRAINT "InstallmentPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
