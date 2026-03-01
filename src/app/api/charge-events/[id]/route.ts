import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const PatchChargeEventBodySchema = z.object({
  action: z.enum(['approve', 'void', 'mark_paid']),
  notes: z.string().optional(),
  paymentRef: z.string().optional(),
});

/**
 * GET /api/charge-events/[id]
 * Get a single charge event by ID.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const { id } = await params;

  const chargeEvent = await prisma.chargeEvent.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, pmbNumber: true },
      },
    },
  });

  if (!chargeEvent) return notFound('Charge event not found');

  return ok({ chargeEvent });
});

/**
 * PATCH /api/charge-events/[id]
 * Update charge event status (approve, void, mark_paid).
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user, params }) => {
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const { id } = await params;
  const body = await validateBody(request, PatchChargeEventBodySchema);

  const chargeEvent = await prisma.chargeEvent.findFirst({
    where: { id, tenantId: user.tenantId! },
  });

  if (!chargeEvent) return notFound('Charge event not found');

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ['approved', 'voided'],
    approved: ['paid', 'voided'],
    paid: ['voided'],
    voided: [],
  };

  const targetStatus = body.action === 'approve' ? 'approved' : body.action === 'void' ? 'voided' : 'paid';
  const allowed = validTransitions[chargeEvent.status] ?? [];

  if (!allowed.includes(targetStatus)) {
    return badRequest(`Cannot transition from ${chargeEvent.status} to ${targetStatus}`);
  }

  const updated = await prisma.chargeEvent.update({
    where: { id },
    data: {
      status: targetStatus,
      notes: body.notes ?? chargeEvent.notes,
      ...(body.action === 'void' && { voidedAt: new Date(), voidedBy: user.id }),
      ...(body.action === 'mark_paid' && { paidAt: new Date(), paymentRef: body.paymentRef ?? null }),
    },
  });

  return ok({ chargeEvent: updated });
});
