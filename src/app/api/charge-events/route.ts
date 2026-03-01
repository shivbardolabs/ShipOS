import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetChargeEventsQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const CreateChargeEventBodySchema = z.object({
  customerId: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().min(0),
  tax: z.number().optional().default(0),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/charge-events
 * List charge events with filtering, pagination, and summary aggregates.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetChargeEventsQuerySchema);
  const tenantId = user.tenantId!;
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.ChargeEventWhereInput = { tenantId };
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;

  const [chargeEvents, total] = await Promise.all([
    prisma.chargeEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    }),
    prisma.chargeEvent.count({ where }),
  ]);

  // Summary aggregates
  const summary = await prisma.chargeEvent.aggregate({
    where: { tenantId },
    _sum: { amount: true, tax: true },
    _count: true,
  });

  const pendingSummary = await prisma.chargeEvent.aggregate({
    where: { tenantId, status: 'pending' },
    _sum: { amount: true },
    _count: true,
  });

  return ok({
    chargeEvents,
    total,
    page: query.page,
    limit: query.limit,
    summary: {
      totalCount: summary._count,
      totalAmount: summary._sum.amount ?? 0,
      totalTax: summary._sum.tax ?? 0,
      pendingCount: pendingSummary._count,
      pendingAmount: pendingSummary._sum.amount ?? 0,
    },
  });
});

/**
 * POST /api/charge-events
 * Create a new charge event (admin only).
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const body = await validateBody(request, CreateChargeEventBodySchema);
  const tenantId = user.tenantId!;

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
      metadata: body.metadata ?? {},
      createdById: user.id,
    },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, pmbNumber: true },
      },
    },
  });

  return created({ chargeEvent });
});
