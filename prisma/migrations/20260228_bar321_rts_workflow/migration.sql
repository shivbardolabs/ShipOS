-- BAR-321: Return to Sender (RTS) Workflow
-- Creates the ReturnToSender table and its enums for tracking RTS actions.

-- CreateEnum
CREATE TYPE "RtsReason" AS ENUM (
  'no_matching_customer',
  'closed_pmb',
  'expired_pmb',
  'customer_request',
  'storage_policy_expiry',
  'refused',
  'unclaimed',
  'other'
);

-- CreateEnum
CREATE TYPE "RtsStep" AS ENUM (
  'initiated',
  'label_printed',
  'carrier_handoff',
  'completed',
  'cancelled'
);

-- CreateTable
CREATE TABLE "ReturnToSender" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" TEXT,
    "mailPieceId" TEXT,
    "reason" "RtsReason" NOT NULL,
    "reasonDetail" TEXT,
    "step" "RtsStep" NOT NULL DEFAULT 'initiated',
    "carrier" TEXT,
    "returnTrackingNumber" TEXT,
    "carrierNotes" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "labelPrintedAt" TIMESTAMP(3),
    "carrierHandoffAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "initiatedById" TEXT NOT NULL,
    "labelPrintedById" TEXT,
    "carrierHandoffById" TEXT,
    "completedById" TEXT,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "customerId" TEXT,
    "pmbNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnToSender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnToSender_tenantId_idx" ON "ReturnToSender"("tenantId");
CREATE INDEX "ReturnToSender_step_idx" ON "ReturnToSender"("step");
CREATE INDEX "ReturnToSender_reason_idx" ON "ReturnToSender"("reason");
CREATE INDEX "ReturnToSender_packageId_idx" ON "ReturnToSender"("packageId");
CREATE INDEX "ReturnToSender_mailPieceId_idx" ON "ReturnToSender"("mailPieceId");
CREATE INDEX "ReturnToSender_tenantId_step_idx" ON "ReturnToSender"("tenantId", "step");
CREATE INDEX "ReturnToSender_tenantId_createdAt_idx" ON "ReturnToSender"("tenantId", "createdAt");
