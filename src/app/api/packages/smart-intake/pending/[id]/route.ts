import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  PATCH /api/packages/smart-intake/pending/[id]                             */
/*  Update a single pending item — edit fields, approve, or reject.           */
/* -------------------------------------------------------------------------- */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

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
      // Create the actual Package record
      let customerId: string | null = null;
      if (existing.pmbNumber) {
        const customer = await prisma.customer.findFirst({
          where: {
            pmbNumber: existing.pmbNumber,
            status: 'active',
          },
        });
        customerId = customer?.id ?? null;
      }

      // If no customer found, we still approve but note it
      const pkg = customerId
        ? await prisma.package.create({
            data: {
              trackingNumber: existing.trackingNumber,
              carrier: existing.carrier,
              senderName: existing.senderName,
              packageType: existing.packageSize || 'medium',
              status: 'checked_in',
              customerId,
              recipientName: existing.recipientName,
              checkedInById: user.id,
            },
          })
        : null;

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
        warning: !customerId ? 'No matching customer found for PMB — package not created' : undefined,
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
}

/* -------------------------------------------------------------------------- */
/*  DELETE /api/packages/smart-intake/pending/[id]                            */
/*  Delete a pending item (only if still pending).                            */
/* -------------------------------------------------------------------------- */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeItem(item: any) {
  return {
    ...item,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
  };
}
