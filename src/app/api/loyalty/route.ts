import { withApiHandler, ok, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/loyalty
 * Returns the full loyalty program state for the current tenant:
 *   - Program config + tiers + rewards
 *   - Customer accounts with balances
 *   - Stats (total points, active accounts, monthly transaction aggregates)
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const tenantId = user.tenantId;

  // Parallel fetch
  const [program, tiers, rewards, accounts, totalAccounts] = await Promise.all([
    prisma.loyaltyProgram.findFirst({ where: { tenantId, isActive: true } }),
    prisma.loyaltyTier.findMany({ where: { tenantId }, orderBy: { minPoints: 'asc' } }),
    prisma.loyaltyReward.findMany({ where: { tenantId, isActive: true }, orderBy: { pointsCost: 'asc' } }),
    prisma.loyaltyAccount.findMany({
      where: { customer: { tenantId } },
      orderBy: { pointsBalance: 'desc' },
      take: 100,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    }),
    prisma.loyaltyAccount.count({ where: { customer: { tenantId } } }),
  ]);

  // Aggregate account stats
  const totalPoints = accounts.reduce((sum, a) => sum + a.pointsBalance, 0);
  const totalLifetimePoints = accounts.reduce((sum, a) => sum + a.lifetimePoints, 0);

  // Monthly transaction aggregates (last 6 months)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const recentTransactions = await prisma.loyaltyTransaction.findMany({
    where: {
      account: { customer: { tenantId } },
      createdAt: { gte: sixMonthsAgo },
    },
    orderBy: { createdAt: 'desc' },
    select: { type: true, points: true, createdAt: true },
  });

  // Group by month
  const monthlyAggregates: Record<string, { earned: number; redeemed: number; expired: number }> = {};
  for (const tx of recentTransactions) {
    const monthKey = `${tx.createdAt.getFullYear()}-${String(tx.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyAggregates[monthKey]) {
      monthlyAggregates[monthKey] = { earned: 0, redeemed: 0, expired: 0 };
    }
    const agg = monthlyAggregates[monthKey];
    if (tx.type === 'earn') agg.earned += tx.points;
    else if (tx.type === 'redeem') agg.redeemed += Math.abs(tx.points);
    else if (tx.type === 'expire') agg.expired += Math.abs(tx.points);
  }

  return ok({
    program,
    tiers,
    rewards,
    accounts,
    stats: {
      totalAccounts,
      totalPointsOutstanding: totalPoints,
      totalLifetimePoints,
      monthlyAggregates,
    },
  });
});
