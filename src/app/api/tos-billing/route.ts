import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import {
  chargeImmediately,
  deferCharge,
  autoCharge,
  retryCharge,
  getTosBillingSummary,
} from '@/lib/tos-billing-service';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetTosBillingQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const TosBillingBodySchema = z.object({
  action: z.enum(['immediate', 'deferred', 'auto', 'retry']),
  // For immediate / deferred / auto
  customerId: z.string().optional(),
  chargeEventId: z.string().optional(),
  amount: z.number().optional(),
  paymentMethodId: z.string().optional(),
  deferUntil: z.string().optional(), // ISO date for deferred
  // For retry
  billingAttemptId: z.string().optional(),
});

/**
 * GET /api/tos-billing
 * List billing records with filtering, pagination, and summary stats.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetTosBillingQuerySchema);
  const tenantId = user.tenantId!;
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.BillingAttemptWhereInput = { tenantId };
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;

  const [records, total] = await Promise.all([
    prisma.billingAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
        chargeEvent: { select: { id: true, type: true, description: true, amount: true } },
      },
    }),
    prisma.billingAttempt.count({ where }),
  ]);

  const summary = await getTosBillingSummary(tenantId);

  return ok({ records, total, page: query.page, limit: query.limit, summary });
});

/**
 * POST /api/tos-billing
 * Process a billing action: immediate charge, deferred, auto, or retry.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const body = await validateBody(request, TosBillingBodySchema);
  const tenantId = user.tenantId!;

  if (body.action === 'immediate') {
    if (!body.customerId || !body.chargeEventId) {
      return badRequest('customerId and chargeEventId required for immediate charge');
    }
    const result = await chargeImmediately({
      tenantId,
      customerId: body.customerId,
      chargeEventId: body.chargeEventId,
      amount: body.amount,
      paymentMethodId: body.paymentMethodId,
      processedById: user.id,
    });
    return created({ billing: result });
  }

  if (body.action === 'deferred') {
    if (!body.customerId || !body.chargeEventId) {
      return badRequest('customerId and chargeEventId required for deferred charge');
    }
    const result = await deferCharge({
      tenantId,
      customerId: body.customerId,
      chargeEventId: body.chargeEventId,
      deferUntil: body.deferUntil ? new Date(body.deferUntil) : undefined,
      processedById: user.id,
    });
    return created({ billing: result });
  }

  if (body.action === 'auto') {
    if (!body.customerId || !body.chargeEventId) {
      return badRequest('customerId and chargeEventId required for auto charge');
    }
    const result = await autoCharge({
      tenantId,
      customerId: body.customerId,
      chargeEventId: body.chargeEventId,
      processedById: user.id,
    });
    return created({ billing: result });
  }

  if (body.action === 'retry') {
    if (!body.billingAttemptId) {
      return badRequest('billingAttemptId required for retry');
    }
    const result = await retryCharge({
      billingAttemptId: body.billingAttemptId,
      processedById: user.id,
    });
    return ok({ billing: result });
  }

  return badRequest('Unknown action');
});
