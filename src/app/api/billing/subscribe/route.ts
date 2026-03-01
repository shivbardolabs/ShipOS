import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, forbidden, notFound } from '@/lib/api-utils';
import { z } from 'zod';
import { isStripeConfigured } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const SubscribeBodySchema = z.object({
  planSlug: z.string().min(1, 'planSlug is required'),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

/**
 * POST /api/billing/subscribe
 * Create or change a subscription. Uses Stripe if configured, otherwise marks as "manual".
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    forbidden('Admin role required');
  }
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const { planSlug, billingCycle } = await validateBody(request, SubscribeBodySchema);

  // Find the plan
  let plan = await prisma.billingPlan.findUnique({ where: { slug: planSlug } });

  // If not in DB, seed it from defaults
  if (!plan) {
    const { PLAN_DEFINITIONS } = await import('@/lib/billing');
    const def = PLAN_DEFINITIONS.find((p) => p.slug === planSlug);
    if (!def) {
      notFound('Plan not found');
    }
    plan = await prisma.billingPlan.create({
      data: {
        name: def.name,
        slug: def.slug,
        priceMonthly: def.priceMonthly,
        priceYearly: def.priceYearly,
        maxMailboxes: def.maxMailboxes,
        maxUsers: def.maxUsers,
        maxStores: def.maxStores,
        features: JSON.stringify(def.features),
        sortOrder: PLAN_DEFINITIONS.indexOf(def),
      },
    });
  }

  // If Stripe is configured and plan has a Stripe price, redirect to checkout
  if (isStripeConfigured() && plan.stripePriceId) {
    return ok({
      mode: 'stripe',
      message: 'Use /api/stripe/checkout to create a Stripe Checkout session',
      priceId: plan.stripePriceId,
      planId: plan.id,
    });
  }

  // Otherwise, create a manual subscription
  // Cancel any existing active subscription
  await prisma.subscription.updateMany({
    where: { tenantId: user.tenantId!, status: 'active' },
    data: { status: 'canceled' },
  });

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const subscription = await prisma.subscription.create({
    data: {
      tenantId: user.tenantId!,
      planId: plan.id,
      status: 'manual',
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    include: { plan: true },
  });

  return ok({
    mode: 'manual',
    subscription: {
      id: subscription.id,
      planName: subscription.plan.name,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
  });
});
