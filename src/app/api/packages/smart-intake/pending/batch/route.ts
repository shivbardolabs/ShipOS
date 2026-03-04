import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/smart-intake/pending/batch                             */
/*  Batch approve or reject multiple pending items at once.                   */
/* -------------------------------------------------------------------------- */
export const POST = withApiHandler(async (request, { user }) => {
  try {

    const body = await request.json();
    const { action, ids, rejectionReason } = body as {
      action: 'approve' | 'reject';
      ids: string[];
      rejectionReason?: string;
    };

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action — must be "approve" or "reject"' }, { status: 400 });
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No item IDs provided' }, { status: 400 });
    }

    // Fetch all items that are still pending
    const items = await prisma.smartIntakePending.findMany({
      where: { id: { in: ids }, status: 'pending' },
    });

    if (items.length === 0) {
      return NextResponse.json({ error: 'No pending items found for provided IDs' }, { status: 404 });
    }

    const results: Array<{ id: string; status: string; packageId?: string; warning?: string }> = [];

    if (action === 'approve') {
      // BAR-347: Process each approval — require matching customer before
      // creating Package records. Items without a customer match are skipped
      // with a clear error so they don't silently disappear.
      const skippedItems: Array<{ id: string; pmbNumber: string | null; reason: string }> = [];

      for (const item of items) {
        let customerId: string | null = null;

        if (item.pmbNumber) {
          const customer = await prisma.customer.findFirst({
            where: { pmbNumber: item.pmbNumber, status: 'active' },
          });
          customerId = customer?.id ?? null;
        }

        if (!customerId) {
          skippedItems.push({
            id: item.id,
            pmbNumber: item.pmbNumber,
            reason: `No active customer found for PMB "${item.pmbNumber || '(none)'}"`,
          });
          results.push({
            id: item.id,
            status: 'skipped',
            warning: `No active customer for PMB "${item.pmbNumber || '(none)'}" — edit PMB or create customer first`,
          });
          continue;
        }

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

        await prisma.smartIntakePending.update({
          where: { id: item.id },
          data: {
            status: 'approved',
            reviewedById: user.id,
            reviewedAt: new Date(),
            checkedInPackageId: pkg.id,
          },
        });

        results.push({ id: item.id, status: 'approved', packageId: pkg.id });
      }

      const approved = results.filter((r) => r.status === 'approved').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;

      return NextResponse.json({
        success: true,
        action,
        processed: approved,
        skipped: skipped + (ids.length - items.length),
        skippedItems,
        results,
      });
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

    return NextResponse.json({
      success: true,
      action,
      processed: results.length,
      skipped: ids.length - items.length,
      results,
    });
  } catch (err) {
    console.error('POST /api/packages/smart-intake/pending/batch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
