import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, badRequest, forbidden, notFound } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ────────────────────────────────────────────────────────────────── */

const GetQuerySchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
});

const PostBodySchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  type: z.enum(['card', 'ach', 'paypal']),
  label: z.string().min(1, 'label is required').max(200),
  isDefault: z.boolean().optional(),
  cardBrand: z.string().nullable().optional(),
  cardLast4: z.string().max(4).nullable().optional(),
  cardExpMonth: z.number().int().min(1).max(12).nullable().optional(),
  cardExpYear: z.number().int().min(2000).max(2100).nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountLast4: z.string().max(4).nullable().optional(),
  routingLast4: z.string().max(4).nullable().optional(),
  paypalEmail: z.string().email().nullable().optional(),
  externalId: z.string().nullable().optional(),
});

/**
 * GET /api/payment-methods
 *
 * List payment methods. Filter by customerId.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const { customerId } = validateQuery(request, GetQuerySchema);

  // Validate customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId },
    select: { id: true, firstName: true, lastName: true, pmbNumber: true },
  });

  if (!customer) {
    notFound('Customer not found');
  }

  const methods = await prisma.paymentMethod.findMany({
    where: { customerId, tenantId: user.tenantId!, status: { not: 'removed' } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return ok({ paymentMethods: methods, customer });
});

/**
 * POST /api/payment-methods
 *
 * Add a new payment method for a customer.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const body = await validateBody(request, PostBodySchema);
  const { customerId, type, label, isDefault, ...rest } = body;

  // Validate customer
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId },
  });
  if (!customer) {
    notFound('Customer not found');
  }

  // If setting as default, unset other defaults first
  if (isDefault) {
    await prisma.paymentMethod.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // Check if this is the first method — auto-set as default
  const existingCount = await prisma.paymentMethod.count({
    where: { customerId, status: 'active' },
  });
  const shouldBeDefault = isDefault || existingCount === 0;

  const method = await prisma.paymentMethod.create({
    data: {
      tenantId: user.tenantId!,
      customerId,
      type,
      label,
      isDefault: shouldBeDefault,
      status: 'active',
      verifiedAt: new Date(),
      cardBrand: rest.cardBrand || null,
      cardLast4: rest.cardLast4 || null,
      cardExpMonth: rest.cardExpMonth || null,
      cardExpYear: rest.cardExpYear || null,
      bankName: rest.bankName || null,
      accountLast4: rest.accountLast4 || null,
      routingLast4: rest.routingLast4 || null,
      paypalEmail: rest.paypalEmail || null,
      externalId: rest.externalId || null,
    },
  });

  return created({ paymentMethod: method });
});
