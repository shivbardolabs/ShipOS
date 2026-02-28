import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/charge-events/[id]
 *
 * Returns a single charge event by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { id } = await params;

    const chargeEvent = await prisma.chargeEvent.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pmbNumber: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!chargeEvent) {
      return NextResponse.json({ error: 'Charge event not found' }, { status: 404 });
    }

    return NextResponse.json({ chargeEvent });
  } catch (err) {
    console.error('[GET /api/charge-events/[id]]', err);
    return NextResponse.json(
      { error: 'Failed to fetch charge event', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/charge-events/[id]
 *
 * Update a charge event. Supports status transitions and void operations.
 *
 * Body:
 *   - status: new status
 *   - voidReason: required when voiding
 *   - notes: optional update
 *   - invoiceId: set when linking to an invoice
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Require admin or superadmin
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, voidReason, notes, invoiceId } = body;

    // Verify the charge event belongs to this tenant
    const existing = await prisma.chargeEvent.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Charge event not found' }, { status: 404 });
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (status) {
      // Validate status transition
      const validStatuses = ['pending', 'posted', 'invoiced', 'paid', 'void', 'disputed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        );
      }

      // Voiding requires a reason
      if (status === 'void') {
        if (!voidReason) {
          return NextResponse.json(
            { error: 'voidReason is required when voiding a charge event' },
            { status: 400 },
          );
        }
        updateData.voidedById = user.id;
        updateData.voidedAt = new Date();
        updateData.voidReason = voidReason;
      }

      // Cannot modify a voided charge
      if (existing.status === 'void') {
        return NextResponse.json(
          { error: 'Cannot modify a voided charge event' },
          { status: 400 },
        );
      }

      updateData.status = status;
    }

    if (notes !== undefined) updateData.notes = notes;
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId;

    const chargeEvent = await prisma.chargeEvent.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pmbNumber: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ chargeEvent });
  } catch (err) {
    console.error('[PATCH /api/charge-events/[id]]', err);
    return NextResponse.json(
      { error: 'Failed to update charge event', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
