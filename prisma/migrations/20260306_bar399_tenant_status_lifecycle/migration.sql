-- BAR-399: Tenant Status Field & Lifecycle States
-- Add status lifecycle tracking fields to Tenant

-- Add status-change tracking columns
ALTER TABLE "Tenant" ADD COLUMN "statusChangedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "statusChangedBy" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "statusReason" TEXT;

-- Migrate existing 'pending' status to 'pending_approval'
UPDATE "Tenant" SET "status" = 'pending_approval' WHERE "status" = 'pending';

-- Set statusChangedAt for existing records that don't have it
UPDATE "Tenant" SET "statusChangedAt" = "updatedAt" WHERE "statusChangedAt" IS NULL;

-- Add index on status for filtering (approval queue, dashboard queries)
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
