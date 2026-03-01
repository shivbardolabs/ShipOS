import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, badRequest, notFound } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ────────────────────────────────────────────────────────────────── */

const GetQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const PostBodySchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  description: z.string().min(1, 'description is required').max(1000),
  amount: z.number().min(0, 'amount must be non-negative'),
  tax: z.number().min(0).default(0),
  mode: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceType: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
});

/**
 * GET /api/billing/tos-charges
 *
 * Returns time-of-service charges.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const query = validateQuery(request, GetQuerySchema);

  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;

  const charges = await prisma.tosCharge.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
  });

  // Calculate summary
  const pendingTotal = charges
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.total, 0);

  return ok({
    charges: charges.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      description: c.description,
      amount: c.amount,
      tax: c.tax,
      total: c.total,
      status: c.status,
      mode: c.mode,
      paymentMethod: c.paymentMethod,
      paymentRef: c.paymentRef,
      paidAt: c.paidAt?.toISOString() ?? null,
      dueDate: c.dueDate?.toISOString() ?? null,
      referenceType: c.referenceType,
      referenceId: c.referenceId,
      createdAt: c.createdAt.toISOString(),
    })),
    summary: {
      total: charges.length,
      pendingTotal: Math.round(pendingTotal * 100) / 100,
    },
  });
});

/**
 * POST /api/billing/tos-charges
 *
 * Create a time-of-service charge.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const body = await validateBody(request, PostBodySchema);
  const { customerId, description, amount, tax, mode, paymentMethod, referenceType, referenceId } = body;

  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId },
  });
  if (!customer) {
    notFound('Customer not found');
  }

  // Determine mode from customer profile or tenant config
  let chargeMode = mode;
  if (!chargeMode) {
    const profile = await prisma.customerBillingProfile.findUnique({
      where: { customerId },
    });
    if (profile?.tosMode) {
      chargeMode = profile.tosMode;
    } else {
      const config = await prisma.billingModelConfig.findUnique({
        where: { tenantId: user.tenantId! },
      });
      chargeMode = config?.tosDefaultMode || 'immediate';
    }
  }

  const total = Math.round((amount + tax) * 100) / 100;
  const isImmediate = chargeMode === 'immediate' && paymentMethod;

  // Calculate due date for deferred charges
  let dueDate: Date | null = null;
  if (chargeMode === 'deferred') {
    const profile = await prisma.customerBillingProfile.findUnique({
      where: { customerId },
    });
    const config = await prisma.billingModelConfig.findUnique({
      where: { tenantId: user.tenantId! },
    });
    const paymentDays = profile?.paymentTermDays ?? config?.tosPaymentWindow ?? 30;
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentDays);

    // Check credit limit
    if (profile && profile.creditLimit > 0) {
      const outstandingCharges = await prisma.tosCharge.aggregate({
        where: { customerId, status: { in: ['pending', 'invoiced'] } },
        _sum: { total: true },
      });
      const outstanding = outstandingCharges._sum.total ?? 0;
      if (outstanding + total > profile.creditLimit) {
        return NextResponse.json(
          {
            error: 'Credit limit exceeded',
            outstanding,
            creditLimit: profile.creditLimit,
            chargeAmount: total,
          },
          { status: 422 },
        );
      }
    }

    // Update account balance
    if (profile) {
      await prisma.customerBillingProfile.update({
        where: { customerId },
        data: { accountBalance: { increment: total } },
      });
    }
  }

  const charge = await prisma.tosCharge.create({
    data: {
      tenantId: user.tenantId!,
      customerId,
      description,
      amount,
      tax,
      total,
      status: isImmediate ? 'paid' : 'pending',
      mode: chargeMode,
      paymentMethod: isImmediate ? paymentMethod : null,
      paidAt: isImmediate ? new Date() : null,
      dueDate,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
    },
  });

  return ok({
    charge: {
      id: charge.id,
      description: charge.description,
      total: charge.total,
      status: charge.status,
      mode: charge.mode,
      createdAt: charge.createdAt.toISOString(),
      dueDate: charge.dueDate?.toISOString() ?? null,
    },
  });
});
