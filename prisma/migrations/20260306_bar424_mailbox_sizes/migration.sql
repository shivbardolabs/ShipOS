-- BAR-424: Mailbox sizes with multiple discontinuous ranges
-- Physical mailboxes can now have multiple sizes (e.g. "Small Box", "Large Box"),
-- each with one or more number ranges.

-- CreateTable
CREATE TABLE "MailboxSize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxSize_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add sizeId FK to MailboxRange
ALTER TABLE "MailboxRange" ADD COLUMN "sizeId" TEXT;

-- CreateIndex
CREATE INDEX "MailboxRange_sizeId_idx" ON "MailboxRange"("sizeId");
CREATE INDEX "MailboxRange_platform_idx" ON "MailboxRange"("platform");

-- AddForeignKey
ALTER TABLE "MailboxRange" ADD CONSTRAINT "MailboxRange_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "MailboxSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Migration: if any physical MailboxRange rows exist, create a default
-- "Standard Box" size and link them so they appear in the new sizes UI.
INSERT INTO "MailboxSize" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
  'default-standard-box',
  'Standard Box',
  true,
  0,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "MailboxRange" WHERE platform = 'physical');

UPDATE "MailboxRange"
SET "sizeId" = 'default-standard-box'
WHERE platform = 'physical'
  AND EXISTS (SELECT 1 FROM "MailboxSize" WHERE id = 'default-standard-box');
