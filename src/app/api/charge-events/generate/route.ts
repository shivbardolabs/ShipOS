import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GenerateSingleSchema = z.object({
  mode: z.literal('single'),
  customerId: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().min(0),
  tax: z.number().optional().default(0),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

const GenerateBatchStorageSchema = z.object({
  mode: z.literal('batch_storage'),
  cutoffDays: z.number().int().min(1).default(5),
  dailyRate: z.number().min(0).default(1.0),
});

const GenerateChargeEventBodySchema = z.discriminatedUnion('mode', [
  GenerateSingleSchema,
  GenerateBatchStorageSchema,
]);

/**
 * POST /api/charge-events/generate
 * Generate charge events. Two modes:
 *   - single: Create a charge for a specific customer
 *   - batch_storage: Auto-generate storage charges for packages held past cutoff
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const tenantId = user.tenantId!;
  const body = await validateBody(request, GenerateChargeEventBodySchema);

  if (body.mode === 'single') {
    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, tenantId },
    });
    if (!customer) return badRequest('Customer not found');

    const chargeEvent = await prisma.chargeEvent.create({
      data: {
        tenantId,
        customerId: body.customerId,
        type: body.type,
        description: body.description,
        amount: body.amount,
        tax: body.tax,
        status: 'pending',
        referenceType: body.referenceType ?? null,
        referenceId: body.referenceId ?? null,
        createdById: user.id,
      },
    });

    return created({ chargeEvent });
  }

  // batch_storage mode
  const cutoffDate = new Date(Date.now() - body.cutoffDays * 24 * 60 * 60 * 1000);

  const packages = await prisma.package.findMany({
    where: {
      customer: { tenantId },
      status: { in: ['checked_in', 'notified', 'ready'] },
      checkedInAt: { lte: cutoffDate },
    },
    include: {
      customer: { select: { id: true, pmbNumber: true } },
    },
  });

  const events: Array<{ customerId: string; amount: number; days: number }> = [];

  for (const pkg of packages) {
    const daysHeld = Math.floor((Date.now() - pkg.checkedInAt!.getTime()) / (1000 * 60 * 60 * 24));
    const chargeableDays = daysHeld - body.cutoffDays;
    if (chargeableDays <= 0) continue;

    const amount = parseFloat((chargeableDays * body.dailyRate).toFixed(2));

    await prisma.chargeEvent.create({
      data: {
        tenantId,
        customerId: pkg.customer.id,
        type: 'storage_fee',
        description: `Storage fee: ${chargeableDays} days beyond ${body.cutoffDays}-day hold period`,
        amount,
        status: 'pending',
        referenceType: 'package',
        referenceId: pkg.id,
        createdById: user.id,
      },
    });

    events.push({ customerId: pkg.customer.id, amount, days: chargeableDays });
  }

  return created({
    generated: events.length,
    totalAmount: events.reduce((s, e) => s + e.amount, 0),
    events,
  });
});
