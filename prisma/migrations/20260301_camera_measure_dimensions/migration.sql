-- Camera-based package dimension measurement
-- Adds dimension fields to Package model for storing L × W × H measurements
-- captured via AI camera measurement or manual entry.

ALTER TABLE "Package" ADD COLUMN "lengthIn" REAL;
ALTER TABLE "Package" ADD COLUMN "widthIn" REAL;
ALTER TABLE "Package" ADD COLUMN "heightIn" REAL;
ALTER TABLE "Package" ADD COLUMN "weightLbs" REAL;
ALTER TABLE "Package" ADD COLUMN "dimensionSource" TEXT;
ALTER TABLE "Package" ADD COLUMN "measurePhoto" TEXT;
