import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/* -------------------------------------------------------------------------- */
/*  PATCH /api/packages/smart-intake/pending/[id]                             */
/*  Update a single pending item — edit fields, approve, or reject.           */
/* -------------------------------------------------------------------------- */
export const PATCH = withApiHandler(async (request, { user, params }) => {
  try {

    const { id } = await params;

    const existing = await prisma.smartIntakePending.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pending item not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      action,
      trackingNumber,
      carrier,
      senderName,
      senderAddress,
      recipientName,
      pmbNumber,
      packageSize,
      serviceType,
      rejectionReason,
    } = body as {
      action?: 'approve' | 'reject' | 'edit';
      trackingNumber?: string;
      carrier?: string;
      senderName?: string;
      senderAddress?: string;
      recipientName?: string;
      pmbNumber?: string;
      packageSize?: string;
      serviceType?: string;
      rejectionReason?: string;
    };

    // ── Handle approval ──────────────────────────────────────────────────
    if (action === 'approve') {
      // BAR-382: Create the actual Package record with proper tenant scoping
      let customerId: string | null = null;
      let warning: string | undefined;

      if (existing.pmbNumber) {
        const customer = await prisma.customer.findFirst({
          where: {
            pmbNumber: existing.pmbNumber,
            status: 'active',
            // BAR-382: Scope to tenant to prevent cross-tenant matches
            ...(user.tenantId ? { tenantId: user.tenantId } : {}),
          },
        });
        customerId = customer?.id ?? null;

        // BAR-382: Check if mailbox exists but is closed/suspended
        if (!customerId) {
          const closedCustomer = await prisma.customer.findFirst({
            where: {
              pmbNumber: existing.pmbNumber,
              status: { not: 'active' },
              ...(user.tenantId ? { tenantId: user.tenantId } : {}),
            },
            select: { pmbNumber: true, status: true },
          });
          if (closedCustomer) {
            warning = `Mailbox ${closedCustomer.pmbNumber} is ${closedCustomer.status} — package not created`;
          }
        }
      }

      // BAR-382: Check for duplicate tracking number
      if (customerId && existing.trackingNumber?.trim()) {
        const duplicate = await prisma.package.findFirst({
          where: {
            trackingNumber: existing.trackingNumber.trim(),
            customer: { tenantId: user.tenantId },
            status: { notIn: ['released', 'returned'] },
          },
          select: { id: true },
        });
        if (duplicate) {
          warning = `Duplicate tracking number — already exists as package ${duplicate.id}`;
        }
      }

      // Create the Package with storeId for proper inventory scoping
      let pkg = null;
      if (customerId) {
        const defaultStore = user.tenantId
          ? await prisma.store.findFirst({ where: { tenantId: user.tenantId, isDefault: true } })
          : null;

        pkg = await prisma.package.create({
          data: {
            trackingNumber: existing.trackingNumber,
            carrier: existing.carrier,
            senderName: existing.senderName,
            packageType: existing.packageSize || 'medium',
            status: 'checked_in',
            customerId,
            recipientName: existing.recipientName,
            checkedInById: user.id,
            storeId: defaultStore?.id ?? null,
          },
        });
      } else if (!warning) {
        warning = 'No matching customer found for PMB — package not created';
      }

      const updated = await prisma.smartIntakePending.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedById: user.id,
          reviewedAt: new Date(),
          checkedInPackageId: pkg?.id ?? null,
        },
      });

      return NextResponse.json({
        success: true,
        item: serializeItem(updated),
        packageId: pkg?.id ?? null,
        warning,
      });
    }

    // ── Handle rejection ─────────────────────────────────────────────────
    if (action === 'reject') {
      const updated = await prisma.smartIntakePending.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedById: user.id,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason || null,
        },
      });

      return NextResponse.json({ success: true, item: serializeItem(updated) });
    }

    // ── Handle edit (update fields without changing status) ───────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    if (carrier !== undefined) data.carrier = carrier;
    if (senderName !== undefined) data.senderName = senderName;
    if (senderAddress !== undefined) data.senderAddress = senderAddress;
    if (recipientName !== undefined) data.recipientName = recipientName;
    if (pmbNumber !== undefined) data.pmbNumber = pmbNumber;
    if (packageSize !== undefined) data.packageSize = packageSize;
    if (serviceType !== undefined) data.serviceType = serviceType;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await prisma.smartIntakePending.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, item: serializeItem(updated) });
  } catch (err) {
    console.error('PATCH /api/packages/smart-intake/pending/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/packages/smart-intake/pending/[id]                            */
/*  Delete a pending item (only if still pending).                            */
/* -------------------------------------------------------------------------- */
export const DELETE = withApiHandler(async (request, { user, params }) => {
  try {

    const { id } = await params;

    const existing = await prisma.smartIntakePending.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pending item not found' }, { status: 404 });
    }

    await prisma.smartIntakePending.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/packages/smart-intake/pending/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeItem(item: any) {
  return {
    ...item,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
  };
}
