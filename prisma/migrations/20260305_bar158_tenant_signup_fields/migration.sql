-- AlterTable: Add sign-up classification fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN "dba" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "website" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "affiliationType" TEXT NOT NULL DEFAULT 'independent';
ALTER TABLE "Tenant" ADD COLUMN "franchiseType" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "storeCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Tenant" ADD COLUMN "planId" TEXT;

-- AlterTable: Add sign-up fields to User
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "title" TEXT;
