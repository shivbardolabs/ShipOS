import { withApiHandler, validateBody, validateQuery, ok, created, badRequest, notFound, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import {
  processImmediateCharge,
  processDeferredCharge,
  processChargeViaTos,
  retryFailedCharge,
} from '@/lib/tos-billing-service';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/**
 * GET /api/tos-billing
 *
 * List TOS charges for the tenant with filtering.
 */

const GetQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.string().optional(),
  mode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const GET = withApiHandler(async (request, { user }) => {
  const { customerId, status, mode, limit, offset } = validateQuery(request, GetQuerySchema);

  const where: Prisma.TosChargeWhereInput = { tenantId: user.tenantId! };
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (mode) where.mode = mode;

  const [charges, total] = await Promise.all([
    prisma.tosCharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.tosCharge.count({ where }),
  ]);

  // Summary stats
  const summary = await prisma.tosCharge.aggregate({
    where: { tenantId: user.tenantId! },
    _sum: { total: true },
    _count: true,
  });

  const pendingDeferred = await prisma.tosCharge.aggregate({
    where: { tenantId: user.tenantId!, mode: 'deferred', status: 'pending' },
    _sum: { total: true },
    _count: true,
  });

  const paidImmediate = await prisma.tosCharge.aggregate({
    where: { tenantId: user.tenantId!, mode: 'immediate', status: 'paid' },
    _sum: { total: true },
    _count: true,
  });

  return ok({
    charges,
    total,
    limit,
    offset,
    summary: {
      totalCharges: summary._count,
      totalAmount: summary._sum.total ?? 0,
      pendingDeferredCount: pendingDeferred._count,
      pendingDeferredAmount: pendingDeferred._sum.total ?? 0,
      paidImmediateCount: paidImmediate._count,
      paidImmediateAmount: paidImmediate._sum.total ?? 0,
    },
  });
});

/**
 * POST /api/tos-billing
 *
 * Create a new TOS charge. Automatically routes to immediate or deferred path.
 */

const PostBodySchema = z.object({
  customerId: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().min(0),
  tax: z.number().min(0).optional(),
  mode: z.enum(['immediate', 'deferred', 'auto']).optional(),
  serviceType: z.string().optional(),
  chargeEventId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  action: z.literal('retry').optional(),
  tosChargeId: z.string().optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const body = await validateBody(request, PostBodySchema);

  // Handle retry
  if (body.action === 'retry' && body.tosChargeId) {
    const result = await retryFailedCharge(body.tosChargeId);
    return ok({ result });
  }

  const { customerId, description, amount, tax, mode, serviceType, chargeEventId, paymentMethodId, referenceType, referenceId } = body;

  // Validate customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId! },
  });
  if (!customer) {
    notFound('Customer not found');
  }

  if (mode === 'immediate') {
    const result = await processImmediateCharge({
      tenantId: user.tenantId!,
      customerId,
      description,
      amount,
      tax,
      serviceType,
      chargeEventId,
      paymentMethodId,
      referenceType,
      referenceId,
    });
    return created({ result });
  }

  if (mode === 'deferred') {
    const result = await processDeferredCharge({
      tenantId: user.tenantId!,
      customerId,
      description,
      amount,
      tax,
      serviceType,
      chargeEventId,
      referenceType,
      referenceId,
    });
    return created({ result });
  }

  // Auto mode — let the service decide
  const result = await processChargeViaTos({
    tenantId: user.tenantId!,
    customerId,
    description,
    amount,
    tax,
    serviceType,
    chargeEventId,
    referenceType,
    referenceId,
  });
  return created({ result });
});
