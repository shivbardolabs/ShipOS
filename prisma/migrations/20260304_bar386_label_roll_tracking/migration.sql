-- BAR-386: Label Roll Usage Tracking
-- Adds fields to PrinterConfig for tracking labels printed per roll,
-- configurable roll capacity, low-supply warning threshold, and roll load timestamp.

-- Add label roll tracking columns to PrinterConfig
ALTER TABLE "PrinterConfig" ADD COLUMN IF NOT EXISTS "labelsPrinted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PrinterConfig" ADD COLUMN IF NOT EXISTS "rollCapacity" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "PrinterConfig" ADD COLUMN IF NOT EXISTS "lowSupplyThreshold" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "PrinterConfig" ADD COLUMN IF NOT EXISTS "rollLoadedAt" TIMESTAMP(3);
