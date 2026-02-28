import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/billing
 *
 * Super admin endpoint — returns billing overview across ALL tenants.
 * Includes subscription status, payment history, and revenue summaries.
 *
 * Query params:
 *   - period: "YYYY-MM" (defaults to current month)
 *   - limit: number (defaults to 50)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden — superadmin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const period =
      searchParams.get('period') ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    // Get all active subscriptions with tenant & plan info
    const subscriptions = await prisma.subscription.findMany({
      where: { status: { in: ['active', 'manual', 'trialing', 'past_due'] } },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true, stripeCustomerId: true } },
        plan: { select: { id: true, name: true, slug: true, priceMonthly: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all payments for the requested period
    const periodPayments = await prisma.paymentRecord.findMany({
      where: { billingPeriod: period },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get recent payments across all tenants
    const recentPayments = await prisma.paymentRecord.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Revenue summary
    const succeededPayments = periodPayments.filter((p) => p.status === 'succeeded');
    const failedPayments = periodPayments.filter((p) => p.status === 'failed');
    const pendingPayments = periodPayments.filter((p) => p.status === 'pending');

    const totalRevenue = succeededPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFailed = failedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // MRR calculation (from active subscriptions)
    const mrr = subscriptions.reduce((sum, s) => sum + s.plan.priceMonthly, 0);

    return NextResponse.json({
      period,
      summary: {
        mrr: Math.round(mrr * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalFailed: Math.round(totalFailed * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        activeSubscriptions: subscriptions.length,
        paymentsThisPeriod: periodPayments.length,
      },
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        tenantId: s.tenant.id,
        tenantName: s.tenant.name,
        tenantSlug: s.tenant.slug,
        planName: s.plan.name,
        planSlug: s.plan.slug,
        priceMonthly: s.plan.priceMonthly,
        status: s.status,
        billingCycle: s.billingCycle,
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
        hasStripe: !!s.tenant.stripeCustomerId,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        tenantId: p.tenant.id,
        tenantName: p.tenant.name,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        description: p.description,
        billingPeriod: p.billingPeriod,
        invoiceUrl: p.invoiceUrl,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[GET /api/admin/billing]', err);
    return NextResponse.json({ error: 'Failed to fetch billing overview' }, { status: 500 });
  }
}
