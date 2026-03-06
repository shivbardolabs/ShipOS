import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, badRequest, notFound, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ────────────────────────────────────────────────────────────────── */

const GetQuerySchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
});

const PutBodySchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  billingModel: z.string().optional(),
  customPlanId: z.string().nullable().optional(),
  customRate: z.number().min(0).nullable().optional(),
  billingCycle: z.string().optional(),
  customUsageCap: z.number().int().min(0).nullable().optional(),
  usageDiscount: z.number().min(0).max(100).nullable().optional(),
  tosMode: z.string().optional(),
  creditLimit: z.number().min(0).nullable().optional(),
  accountBalance: z.number().nullable().optional(),
  paymentTermDays: z.number().int().min(0).nullable().optional(),
  autoPayEnabled: z.boolean().optional(),
  autoPayDay: z.number().int().min(1).max(31).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

/**
 * GET /api/billing/customer-profile?customerId=xxx
 *
 * Returns the billing profile for a specific customer.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const { customerId } = validateQuery(request, GetQuerySchema);

  // Verify customer belongs to this tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId },
  });

  if (!customer) {
    notFound('Customer not found');
  }

  const profile = await prisma.customerBillingProfile.findUnique({
    where: { customerId },
  });

  // Get tenant billing config for defaults
  const tenantConfig = await prisma.billingModelConfig.findUnique({
    where: { tenantId: user.tenantId! },
  });

  // Get any outstanding ToS charges
  const tosCharges = await prisma.tosCharge.findMany({
    where: { customerId, status: { in: ['pending', 'invoiced'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const outstandingBalance = tosCharges
    .filter((c) => c.status === 'pending' || c.status === 'invoiced')
    .reduce((sum, c) => sum + c.total, 0);

  return ok({
    profile: profile
      ? {
          id: profile.id,
          customerId: profile.customerId,
          billingModel: profile.billingModel,
          customPlanId: profile.customPlanId,
          customRate: profile.customRate,
          billingCycle: profile.billingCycle,
          customUsageCap: profile.customUsageCap,
          usageDiscount: profile.usageDiscount,
          tosMode: profile.tosMode,
          creditLimit: profile.creditLimit,
          accountBalance: profile.accountBalance,
          paymentTermDays: profile.paymentTermDays,
          autoPayEnabled: profile.autoPayEnabled,
          autoPayDay: profile.autoPayDay,
          notes: profile.notes,
        }
      : null,
    tenantConfig: tenantConfig
      ? {
          subscriptionEnabled: tenantConfig.subscriptionEnabled,
          usageBasedEnabled: tenantConfig.usageBasedEnabled,
          timeOfServiceEnabled: tenantConfig.timeOfServiceEnabled,
          tosDefaultMode: tenantConfig.tosDefaultMode,
        }
      : null,
    outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    recentCharges: tosCharges.map((c) => ({
      id: c.id,
      description: c.description,
      amount: c.amount,
      tax: c.tax,
      total: c.total,
      status: c.status,
      mode: c.mode,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
      dueDate: c.dueDate?.toISOString() ?? null,
    })),
  });
});

/**
 * PUT /api/billing/customer-profile
 *
 * Create or update a customer's billing profile.
 */
export const PUT = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    forbidden('Admin role required');
  }
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const body = await validateBody(request, PutBodySchema);
  const { customerId, ...profileFields } = body;

  // Verify customer belongs to this tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId },
  });

  if (!customer) {
    notFound('Customer not found');
  }

  const profile = await prisma.customerBillingProfile.upsert({
    where: { customerId },
    create: { customerId, ...profileFields },
    update: profileFields,
  });

  return ok({ profile });
});
