import prisma from '@/lib/prisma';

/**
 * BAR-321: Auto-create RTS records for all active packages belonging to a customer
 * when their PMB is closed or expired.
 *
 * Called from customer status update endpoints when status changes to 'closed' or 'expired'.
 */
export async function autoRtsForCustomer({
  customerId,
  tenantId,
  reason,
  reasonDetail,
  initiatedById,
}: {
  customerId: string;
  tenantId: string;
  reason: 'closed_pmb' | 'expired_pmb';
  reasonDetail?: string;
  initiatedById: string;
}) {
  // Find all active (non-released, non-returned, non-RTS) packages for this customer
  const activePackages = await prisma.package.findMany({
    where: {
      customerId,
      customer: { tenantId },
      status: {
        notIn: ['released', 'returned', 'rts_initiated', 'rts_labeled', 'rts_completed'],
      },
    },
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      customer: {
        select: { pmbNumber: true },
      },
    },
  });

  if (activePackages.length === 0) return { created: 0 };

  // Check for existing active RTS records to avoid duplicates
  const existingRts = await prisma.returnToSender.findMany({
    where: {
      packageId: { in: activePackages.map((p) => p.id) },
      step: { notIn: ['completed', 'cancelled'] },
    },
    select: { packageId: true },
  });
  const existingPackageIds = new Set(existingRts.map((r) => r.packageId));

  const packagesToRts = activePackages.filter(
    (p) => !existingPackageIds.has(p.id)
  );

  if (packagesToRts.length === 0) return { created: 0 };

  // Create RTS records in batch
  const rtsRecords = await prisma.$transaction(
    packagesToRts.map((pkg) =>
      prisma.returnToSender.create({
        data: {
          tenantId,
          packageId: pkg.id,
          reason,
          reasonDetail:
            reasonDetail ||
            `PMB ${reason === 'closed_pmb' ? 'closed' : 'expired'} — auto-RTS triggered`,
          step: 'initiated',
          carrier: pkg.carrier || null,
          initiatedById,
          customerId,
          pmbNumber: pkg.customer.pmbNumber,
        },
      })
    )
  );

  // Update package statuses to rts_initiated
  await prisma.package.updateMany({
    where: {
      id: { in: packagesToRts.map((p) => p.id) },
    },
    data: {
      status: 'rts_initiated',
    },
  });

  // Create audit log entries
  await prisma.$transaction(
    packagesToRts.map((pkg) =>
      prisma.auditLog.create({
        data: {
          action: 'auto_rts_initiated',
          entityType: 'package',
          entityId: pkg.id,
          details: JSON.stringify({
            reason,
            customerId,
            pmbNumber: pkg.customer.pmbNumber,
            trackingNumber: pkg.trackingNumber,
            autoTriggered: true,
          }),
          userId: initiatedById,
        },
      })
    )
  );

  return { created: rtsRecords.length };
}
