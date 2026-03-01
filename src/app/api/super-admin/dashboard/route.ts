import { withApiHandler, ok, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/super-admin/dashboard
 * Returns summary metrics for the super admin dashboard.
 * Only accessible to superadmin users.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const [
    totalClients,
    activeClients,
    totalStores,
    totalSuperAdmins,
    activeSuperAdmins,
    subscriptions,
    overduePayments,
    pendingPayments,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'active' } }),
    prisma.store.count(),
    prisma.user.count({ where: { role: 'superadmin', deletedAt: null } }),
    prisma.user.count({ where: { role: 'superadmin', status: 'active', deletedAt: null } }),
    prisma.subscription.findMany({
      where: { status: { in: ['active', 'past_due'] } },
      include: { plan: true },
    }),
    prisma.subscription.count({ where: { status: 'past_due' } }),
    prisma.paymentRecord.count({ where: { status: 'pending' } }),
  ]);

  // Calculate active stores (stores belonging to active tenants)
  const activeStores = await prisma.store.count({
    where: { tenant: { status: 'active' } },
  });

  // Calculate MRR from active subscriptions
  const totalMRR = subscriptions.reduce((sum, sub) => {
    const monthlyPrice = sub.billingCycle === 'yearly' && sub.plan.priceYearly
      ? sub.plan.priceYearly / 12
      : sub.plan.priceMonthly;
    return sum + monthlyPrice;
  }, 0);

  const inactiveClients = totalClients - activeClients;
  const inactiveStores = totalStores - activeStores;

  return ok({
    totalClients,
    activeClients,
    inactiveClients,
    totalStores,
    activeStores,
    inactiveStores,
    totalMRR: Math.round(totalMRR * 100) / 100,
    overduePayments,
    pendingPayments,
    totalSuperAdmins,
    activeSuperAdmins,
  });
});
