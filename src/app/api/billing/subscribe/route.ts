import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { isStripeConfigured } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/billing/subscribe
 * Create or change a subscription. Uses Stripe if configured, otherwise marks as "manual".
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { planSlug, billingCycle = 'monthly' } = await req.json();

    if (!planSlug) {
      return NextResponse.json({ error: 'planSlug is required' }, { status: 400 });
    }

    // Find the plan
    let plan = await prisma.billingPlan.findUnique({ where: { slug: planSlug } });

    // If not in DB, seed it from defaults
    if (!plan) {
      const { PLAN_DEFINITIONS } = await import('@/lib/billing');
      const def = PLAN_DEFINITIONS.find((p) => p.slug === planSlug);
      if (!def) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
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
      return NextResponse.json({
        mode: 'stripe',
        message: 'Use /api/stripe/checkout to create a Stripe Checkout session',
        priceId: plan.stripePriceId,
        planId: plan.id,
      });
    }

    // Otherwise, create a manual subscription
    // Cancel any existing active subscription
    await prisma.subscription.updateMany({
      where: { tenantId: user.tenantId, status: 'active' },
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
        tenantId: user.tenantId,
        planId: plan.id,
        status: 'manual',
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });

    return NextResponse.json({
      mode: 'manual',
      subscription: {
        id: subscription.id,
        planName: subscription.plan.name,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (err) {
    console.error('[POST /api/billing/subscribe]', err);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
