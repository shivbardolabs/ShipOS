import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * PATCH /api/payment-methods/[id]
 *
 * Update a payment method (set default, update card expiry, etc.)
 *
 * Body:
 *   - isDefault?: boolean
 *   - cardExpMonth?: number
 *   - cardExpYear?: number
 *   - label?: string
 *   - status?: 'active' | 'expired' | 'removed'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify payment method belongs to tenant
    const existing = await prisma.paymentMethod.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // If setting as default, unset others
    if (body.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { customerId: existing.customerId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (body.cardExpMonth !== undefined) updateData.cardExpMonth = body.cardExpMonth;
    if (body.cardExpYear !== undefined) updateData.cardExpYear = body.cardExpYear;
    if (body.label !== undefined) updateData.label = body.label;
    if (body.status !== undefined) updateData.status = body.status;

    const method = await prisma.paymentMethod.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ paymentMethod: method });
  } catch (err) {
    console.error('[PATCH /api/payment-methods/[id]]', err);
    return NextResponse.json(
      { error: 'Failed to update payment method', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/payment-methods/[id]
 *
 * Soft-remove a payment method (sets status to 'removed').
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.paymentMethod.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    await prisma.paymentMethod.update({
      where: { id },
      data: { status: 'removed', isDefault: false },
    });

    // If this was the default, promote the next active method
    if (existing.isDefault) {
      const nextDefault = await prisma.paymentMethod.findFirst({
        where: { customerId: existing.customerId, status: 'active', id: { not: id } },
        orderBy: { createdAt: 'asc' },
      });
      if (nextDefault) {
        await prisma.paymentMethod.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Payment method removed' });
  } catch (err) {
    console.error('[DELETE /api/payment-methods/[id]]', err);
    return NextResponse.json(
      { error: 'Failed to remove payment method', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
