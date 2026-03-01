import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, forbidden, notFound } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const PatchBodySchema = z.object({
  isDefault: z.boolean().optional(),
  cardExpMonth: z.number().int().min(1).max(12).optional(),
  cardExpYear: z.number().int().min(2000).max(2100).optional(),
  label: z.string().max(200).optional(),
  status: z.enum(['active', 'expired', 'removed']).optional(),
});

/**
 * PATCH /api/payment-methods/[id]
 *
 * Update a payment method (set default, update card expiry, etc.)
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user, params }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const id = params?.id;
  if (!id) {
    badRequest('Missing id');
  }

  const body = await validateBody(request, PatchBodySchema);

  // Verify payment method belongs to tenant
  const existing = await prisma.paymentMethod.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) {
    notFound('Payment method not found');
  }

  // If setting as default, unset others
  if (body.isDefault) {
    await prisma.paymentMethod.updateMany({
      where: { customerId: existing.customerId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updateData: Prisma.PaymentMethodUpdateInput = {};
  if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
  if (body.cardExpMonth !== undefined) updateData.cardExpMonth = body.cardExpMonth;
  if (body.cardExpYear !== undefined) updateData.cardExpYear = body.cardExpYear;
  if (body.label !== undefined) updateData.label = body.label;
  if (body.status !== undefined) updateData.status = body.status;

  const method = await prisma.paymentMethod.update({
    where: { id },
    data: updateData,
  });

  return ok({ paymentMethod: method });
});

/**
 * DELETE /api/payment-methods/[id]
 *
 * Soft-remove a payment method (sets status to 'removed').
 */
export const DELETE = withApiHandler(async (_request: NextRequest, { user, params }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const id = params?.id;
  if (!id) {
    badRequest('Missing id');
  }

  const existing = await prisma.paymentMethod.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!existing) {
    notFound('Payment method not found');
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

  return ok({ success: true, message: 'Payment method removed' });
});
