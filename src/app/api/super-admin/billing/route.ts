import { withApiHandler, validateQuery, ok, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const QuerySchema = z.object({
  period: z.enum(['current', 'previous', 'custom']).default('current'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/super-admin/billing
 * Returns billing and performance reporting data.
 * Supports: ?period=current|previous|custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const query = validateQuery(request, QuerySchema);

  // Calculate date range based on period
  const now = new Date();
  let rangeStart: Date;
  let rangeEnd: Date;

  if (query.period === 'custom' && query.startDate && query.endDate) {
    rangeStart = new Date(query.startDate);
    rangeEnd = new Date(query.endDate);
  } else if (query.period === 'previous') {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    // current month
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Fetch all tenants with stores, subscriptions, and recent payments
  const tenants = await prisma.tenant.findMany({
    include: {
      stores: true,
      subscriptions: {
        where: { status: { in: ['active', 'past_due', 'trialing'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      paymentRecords: {
        where: {
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Build per-client billing data
  const clients = tenants.map((t) => {
    const activeSub = t.subscriptions[0];
    const subscriptionFee = activeSub?.plan?.priceMonthly ?? 125;
    const storeCount = t.stores.length;
    const monthlyRevenue = subscriptionFee * storeCount;

    // Determine payment status
    let paymentStatus: 'paid' | 'pending' | 'overdue' = 'paid';
    if (activeSub?.status === 'past_due') {
      paymentStatus = 'overdue';
    } else {
      const hasPending = t.paymentRecords.some((p) => p.status === 'pending');
      const hasFailed = t.paymentRecords.some((p) => p.status === 'failed');
      if (hasFailed) paymentStatus = 'overdue';
      else if (hasPending) paymentStatus = 'pending';
    }

    const lastPaid = t.paymentRecords.find((p) => p.status === 'succeeded');

    return {
      id: t.id,
      clientName: t.name,
      totalStores: storeCount,
      activeStores: storeCount, // Store model has no status field
      subscriptionFee,
      monthlyRevenue,
      paymentStatus,
      accountStatus: t.status as 'active' | 'inactive' | 'paused',
      lastPaymentDate: lastPaid?.createdAt?.toISOString() ?? null,
      activatedDate: t.createdAt.toISOString(),
      stores: t.stores.map((s) => ({
        name: s.name,
        status: 'active' as const,
        revenueContribution: subscriptionFee,
      })),
    };
  });

  // Compute summary
  const activeClients = clients.filter((c) => c.accountStatus === 'active').length;
  const inactiveClients = clients.length - activeClients;
  const totalStores = clients.reduce((s, c) => s + c.totalStores, 0);
  const activeStores = clients.reduce((s, c) => s + c.activeStores, 0);
  const totalMRR = clients.reduce((s, c) => s + c.monthlyRevenue, 0);
  const paidCount = clients.filter((c) => c.paymentStatus === 'paid').length;
  const pendingCount = clients.filter((c) => c.paymentStatus === 'pending').length;
  const overdueCount = clients.filter((c) => c.paymentStatus === 'overdue').length;

  return ok({
    period: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    summary: {
      totalClients: clients.length,
      activeClients,
      inactiveClients,
      totalStores,
      activeStores,
      totalMRR: Math.round(totalMRR * 100) / 100,
      paidCount,
      pendingCount,
      overdueCount,
    },
    clients,
  });
});
