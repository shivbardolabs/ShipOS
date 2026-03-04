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
      // BAR-382: Resolve default store once for the batch
      const defaultStore = user.tenantId
        ? await prisma.store.findFirst({ where: { tenantId: user.tenantId, isDefault: true } })
        : null;

      // Process each approval — create Package records
      for (const item of items) {
        let customerId: string | null = null;
        let warning: string | undefined;

        if (item.pmbNumber) {
          // BAR-382: Scope customer lookup to tenant
          const customer = await prisma.customer.findFirst({
            where: {
              pmbNumber: item.pmbNumber,
              status: 'active',
              ...(user.tenantId ? { tenantId: user.tenantId } : {}),
            },
          });
          customerId = customer?.id ?? null;

          // BAR-382: Check if mailbox is closed
          if (!customerId) {
            const closedCustomer = await prisma.customer.findFirst({
              where: {
                pmbNumber: item.pmbNumber,
                status: { not: 'active' },
                ...(user.tenantId ? { tenantId: user.tenantId } : {}),
              },
              select: { pmbNumber: true, status: true },
            });
            if (closedCustomer) {
              warning = `Mailbox ${closedCustomer.pmbNumber} is ${closedCustomer.status}`;
            }
          }
        }

        // BAR-382: Check for duplicate tracking number
        if (customerId && item.trackingNumber?.trim()) {
          const duplicate = await prisma.package.findFirst({
            where: {
              trackingNumber: item.trackingNumber.trim(),
              customer: { tenantId: user.tenantId },
              status: { notIn: ['released', 'returned'] },
            },
            select: { id: true },
          });
          if (duplicate) {
            warning = `Duplicate tracking number — already exists as package ${duplicate.id}`;
          }
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
              storeId: defaultStore?.id ?? null,
            },
          });
          packageId = pkg.id;
        } else if (!warning) {
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
