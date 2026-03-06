import { withApiHandler, validateBody, ok, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/smart-intake/pending/batch                             */
/*  Batch approve or reject multiple pending items at once.                   */
/* -------------------------------------------------------------------------- */

const BatchActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  ids: z.array(z.string()).min(1, 'No item IDs provided'),
  rejectionReason: z.string().optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  const { action, ids, rejectionReason } = await validateBody(request, BatchActionSchema);

  // Fetch all items that are still pending
  const items = await prisma.smartIntakePending.findMany({
    where: { id: { in: ids }, status: 'pending' },
  });

  if (items.length === 0) {
    notFound('No pending items found for provided IDs');
  }

  const results: Array<{ id: string; status: string; packageId?: string; warning?: string }> = [];

  if (action === 'approve') {
    // Process each approval — create Package records
    for (const item of items) {
      let customerId: string | null = null;
      let warning: string | undefined;

      if (item.pmbNumber) {
        const customer = await prisma.customer.findFirst({
          where: { pmbNumber: item.pmbNumber, status: 'active' },
        });
        customerId = customer?.id ?? null;
      }

      let packageId: string | null = null;
      if (customerId) {
        const pkg = await prisma.package.create({
          data: {
            trackingNumber: item.trackingNumber,
            carrier: item.carrier,
            senderName: item.senderName,
            packageType: item.packageSize || 'medium',
            status: 'checked_in',
            customerId,
            recipientName: item.recipientName,
            checkedInById: user.id,
          },
        });
        packageId = pkg.id;
      } else {
        warning = 'No matching customer found — package not created';
      }

      await prisma.smartIntakePending.update({
        where: { id: item.id },
        data: {
          status: 'approved',
          reviewedById: user.id,
          reviewedAt: new Date(),
          checkedInPackageId: packageId,
        },
      });

      results.push({ id: item.id, status: 'approved', packageId: packageId ?? undefined, warning });
    }
  } else {
    // Batch reject
    await prisma.smartIntakePending.updateMany({
      where: { id: { in: items.map((i) => i.id) } },
      data: {
        status: 'rejected',
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });

    for (const item of items) {
      results.push({ id: item.id, status: 'rejected' });
    }
  }

  return ok({
    success: true,
    action,
    processed: results.length,
    skipped: ids.length - items.length,
    results,
  });
});
