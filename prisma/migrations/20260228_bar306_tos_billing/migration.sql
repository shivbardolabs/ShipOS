-- BAR-306: Time-of-Service Billing — Schema additions
-- PaymentMethod, InvoiceLineItem, InvoiceSchedule models + enhancements to Invoice & TosCharge

-- CreateTable: PaymentMethod
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'card',
    "label" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "bankName" TEXT,
    "accountLast4" TEXT,
    "routingLast4" TEXT,
    "paypalEmail" TEXT,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvoiceLineItem
CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "serviceType" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chargeEventId" TEXT,
    "tosChargeId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvoiceSchedule
CREATE TABLE IF NOT EXISTS "InvoiceSchedule" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceSchedule_pkey" PRIMARY KEY ("id")
);

-- Enhance Invoice table
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentMethodId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paymentRef" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sentVia" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3);

-- Enhance TosCharge table
ALTER TABLE "TosCharge" ADD COLUMN IF NOT EXISTS "paymentMethodId" TEXT;
ALTER TABLE "TosCharge" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TosCharge" ADD COLUMN IF NOT EXISTS "lastRetryAt" TIMESTAMP(3);
ALTER TABLE "TosCharge" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "TosCharge" ADD COLUMN IF NOT EXISTS "chargeEventId" TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "PaymentMethod_customerId_idx" ON "PaymentMethod"("customerId");
CREATE INDEX IF NOT EXISTS "PaymentMethod_tenantId_idx" ON "PaymentMethod"("tenantId");
CREATE INDEX IF NOT EXISTS "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "TosCharge_mode_status_idx" ON "TosCharge"("mode", "status");

-- Unique constraint for InvoiceSchedule
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSchedule_tenantId_customerId_key" ON "InvoiceSchedule"("tenantId", COALESCE("customerId", ''));

-- Foreign Keys
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
