-- BAR-307: PMB Plan Features
-- Creates tables for plan tiers, add-ons, quota usage, promo codes, and franchise pricing.

-- PmbPlanTier
CREATE TABLE "PmbPlanTier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceAnnual" DOUBLE PRECISION NOT NULL,
    "annualDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "includedMailItems" INTEGER NOT NULL DEFAULT 30,
    "includedScans" INTEGER NOT NULL DEFAULT 5,
    "freeStorageDays" INTEGER NOT NULL DEFAULT 30,
    "includedForwarding" INTEGER NOT NULL DEFAULT 0,
    "includedShredding" INTEGER NOT NULL DEFAULT 0,
    "maxRecipients" INTEGER NOT NULL DEFAULT 1,
    "maxPackagesPerMonth" INTEGER NOT NULL DEFAULT 0,
    "overageMailRate" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "overageScanRate" DOUBLE PRECISION NOT NULL DEFAULT 1.00,
    "overageStorageRate" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "overageForwardingRate" DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "overagePackageRate" DOUBLE PRECISION NOT NULL DEFAULT 2.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PmbPlanTier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PmbPlanTier_tenantId_slug_key" ON "PmbPlanTier"("tenantId", "slug");
CREATE INDEX "PmbPlanTier_tenantId_isActive_idx" ON "PmbPlanTier"("tenantId", "isActive");

-- PmbAddOn
CREATE TABLE "PmbAddOn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceAnnual" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'month',
    "quotaType" TEXT,
    "quotaAmount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PmbAddOn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PmbAddOn_tenantId_slug_key" ON "PmbAddOn"("tenantId", "slug");
CREATE INDEX "PmbAddOn_tenantId_idx" ON "PmbAddOn"("tenantId");

-- PmbCustomerAddOn
CREATE TABLE "PmbCustomerAddOn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "planTierId" TEXT,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "price" DOUBLE PRECISION NOT NULL,
    "prorated" BOOLEAN NOT NULL DEFAULT false,
    "proratedFrom" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PmbCustomerAddOn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PmbCustomerAddOn_tenantId_customerId_idx" ON "PmbCustomerAddOn"("tenantId", "customerId");
CREATE INDEX "PmbCustomerAddOn_customerId_status_idx" ON "PmbCustomerAddOn"("customerId", "status");
ALTER TABLE "PmbCustomerAddOn" ADD CONSTRAINT "PmbCustomerAddOn_addOnId_fkey"
    FOREIGN KEY ("addOnId") REFERENCES "PmbAddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PmbCustomerAddOn" ADD CONSTRAINT "PmbCustomerAddOn_planTierId_fkey"
    FOREIGN KEY ("planTierId") REFERENCES "PmbPlanTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PmbQuotaUsage
CREATE TABLE "PmbQuotaUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "mailItemsUsed" INTEGER NOT NULL DEFAULT 0,
    "scansUsed" INTEGER NOT NULL DEFAULT 0,
    "storageDaysUsed" INTEGER NOT NULL DEFAULT 0,
    "forwardingUsed" INTEGER NOT NULL DEFAULT 0,
    "shreddingUsed" INTEGER NOT NULL DEFAULT 0,
    "packagesReceived" INTEGER NOT NULL DEFAULT 0,
    "mailItemsIncluded" INTEGER NOT NULL DEFAULT 0,
    "scansIncluded" INTEGER NOT NULL DEFAULT 0,
    "storageDaysIncluded" INTEGER NOT NULL DEFAULT 0,
    "forwardingIncluded" INTEGER NOT NULL DEFAULT 0,
    "shreddingIncluded" INTEGER NOT NULL DEFAULT 0,
    "packagesIncluded" INTEGER NOT NULL DEFAULT 0,
    "overageCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overageInvoiced" BOOLEAN NOT NULL DEFAULT false,
    "alertSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PmbQuotaUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PmbQuotaUsage_tenantId_customerId_period_key" ON "PmbQuotaUsage"("tenantId", "customerId", "period");
CREATE INDEX "PmbQuotaUsage_tenantId_period_idx" ON "PmbQuotaUsage"("tenantId", "period");
CREATE INDEX "PmbQuotaUsage_customerId_idx" ON "PmbQuotaUsage"("customerId");

-- PromoCode
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "discountAppliesTo" TEXT NOT NULL DEFAULT 'all',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER NOT NULL DEFAULT 0,
    "maxPerCustomer" INTEGER NOT NULL DEFAULT 1,
    "applicableTierSlugs" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromoCode_tenantId_code_key" ON "PromoCode"("tenantId", "code");
CREATE INDEX "PromoCode_tenantId_isActive_idx" ON "PromoCode"("tenantId", "isActive");
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

-- PromoRedemption
CREATE TABLE "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planTierId" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PromoRedemption_promoCodeId_idx" ON "PromoRedemption"("promoCodeId");
CREATE INDEX "PromoRedemption_customerId_idx" ON "PromoRedemption"("customerId");
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_planTierId_fkey"
    FOREIGN KEY ("planTierId") REFERENCES "PmbPlanTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FranchiseGroup
CREATE TABLE "FranchiseGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "adminEmail" TEXT,
    "adminName" TEXT,
    "phone" TEXT,
    "defaultPricingJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FranchiseGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FranchiseGroup_slug_key" ON "FranchiseGroup"("slug");

-- FranchiseLocation
CREATE TABLE "FranchiseLocation" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customPricingJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FranchiseLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FranchiseLocation_tenantId_key" ON "FranchiseLocation"("tenantId");
CREATE INDEX "FranchiseLocation_franchiseId_idx" ON "FranchiseLocation"("franchiseId");
ALTER TABLE "FranchiseLocation" ADD CONSTRAINT "FranchiseLocation_franchiseId_fkey"
    FOREIGN KEY ("franchiseId") REFERENCES "FranchiseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FranchisePricingOverride
CREATE TABLE "FranchisePricingOverride" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "tenantId" TEXT,
    "tierSlug" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FranchisePricingOverride_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FranchisePricingOverride_franchiseId_idx" ON "FranchisePricingOverride"("franchiseId");
CREATE INDEX "FranchisePricingOverride_tenantId_idx" ON "FranchisePricingOverride"("tenantId");
CREATE INDEX "FranchisePricingOverride_changedAt_idx" ON "FranchisePricingOverride"("changedAt");
ALTER TABLE "FranchisePricingOverride" ADD CONSTRAINT "FranchisePricingOverride_franchiseId_fkey"
    FOREIGN KEY ("franchiseId") REFERENCES "FranchiseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
