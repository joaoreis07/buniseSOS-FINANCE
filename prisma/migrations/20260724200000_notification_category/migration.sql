-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "NotificationCategory" AS ENUM ('FINANCE', 'CUSTOMERS', 'SYSTEM', 'INSTALLMENTS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM';

CREATE INDEX IF NOT EXISTS "Notification_companyId_category_deletedAt_idx" ON "Notification"("companyId", "category", "deletedAt");
