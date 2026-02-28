import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/subscription
 *
 * Returns the current active subscription for the authenticated user's tenant,
 * including plan details and billing period information.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['active', 'manual', 'trialing'] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Get the most recent payment for this tenant
    const lastPayment = await prisma.paymentRecord.findFirst({
      where: { tenantId: user.tenantId, status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          slug: subscription.plan.slug,
          priceMonthly: subscription.plan.priceMonthly,
          priceYearly: subscription.plan.priceYearly,
          maxMailboxes: subscription.plan.maxMailboxes,
          maxUsers: subscription.plan.maxUsers,
          maxStores: subscription.plan.maxStores,
          features: subscription.plan.features ? JSON.parse(subscription.plan.features) : [],
        },
        lastPayment: lastPayment
          ? {
              amount: lastPayment.amount,
              status: lastPayment.status,
              date: lastPayment.createdAt.toISOString(),
              billingPeriod: lastPayment.billingPeriod,
            }
          : null,
      },
    });
  } catch (err) {
    console.error('[GET /api/billing/subscription]', err);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
