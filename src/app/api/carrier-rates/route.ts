import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const UpdateRateBodySchema = z.object({
  id: z.string().min(1),
  retailMarkup: z.number().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/carrier-rates
 * List carrier rates for the current tenant.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  const tenantId = user.tenantId!;

  const rates = await prisma.carrierRate.findMany({
    where: { tenantId },
    orderBy: [{ carrier: 'asc' }, { service: 'asc' }],
  });

  return ok({ rates });
});

/**
 * PUT /api/carrier-rates
 * Update a carrier rate (admin/manager only).
 */
export const PUT = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'manager', 'superadmin'].includes(user.role)) {
    return forbidden('Admin or manager role required');
  }

  const body = await validateBody(request, UpdateRateBodySchema);

  // Verify rate belongs to tenant
  const existing = await prisma.carrierRate.findFirst({
    where: { id: body.id, tenantId: user.tenantId! },
  });
  if (!existing) return badRequest('Rate not found');

  const rate = await prisma.carrierRate.update({
    where: { id: body.id },
    data: {
      ...(body.retailMarkup !== undefined && { retailMarkup: body.retailMarkup }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  return ok({ rate });
});
