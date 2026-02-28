import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/loyalty
 * Returns loyalty program config, tiers, rewards, and member accounts.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const tenantFilter =
      user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {};

    const [program, tiers, rewards, accounts] = await Promise.all([
      prisma.loyaltyProgram.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loyaltyTier.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.loyaltyReward.findMany({
        where: { isActive: true },
        orderBy: { pointsCost: 'asc' },
      }),
      prisma.loyaltyAccount.findMany({
        where: { customer: { ...tenantFilter, deletedAt: null } },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true, status: true } },
          currentTier: true,
        },
        orderBy: { lifetimePoints: 'desc' },
        take: 200,
      }),
    ]);

    // Compute dashboard stats
    const totalMembers = accounts.length;
    const activeMembers = accounts.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a.customer?.status === 'active',
    ).length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPoints = accounts.reduce((sum: number, a: any) => sum + a.currentPoints, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lifetimePoints = accounts.reduce((sum: number, a: any) => sum + a.lifetimePoints, 0);

    const tierDistribution = tiers.map((t) => ({
      tier: t.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: accounts.filter((a: any) => a.currentTierId === t.id).length,
    }));

    // Top customers by lifetime points
    const topCustomers = accounts
      .slice(0, 10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => ({
        name: a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : 'Unknown',
        points: a.lifetimePoints,
        tier: a.currentTier?.name ?? 'Bronze',
      }));

    // Count this month's transactions and get recent activity
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [pointsIssued, redemptions, recentActivity] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({
        where: { createdAt: { gte: startOfMonth }, type: 'earn' },
        _sum: { points: true },
      }),
      prisma.loyaltyTransaction.count({
        where: { createdAt: { gte: startOfMonth }, type: 'redeem' },
      }),
      prisma.loyaltyTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      program,
      tiers,
      rewards,
      accounts,
      stats: {
        totalMembers,
        activeMembers,
        totalPointsInCirculation: totalPoints,
        lifetimePointsEarned: lifetimePoints,
        tierDistribution,
        topCustomers,
        pointsIssuedThisMonth: pointsIssued._sum.points ?? 0,
        redemptionsThisMonth: redemptions,
        recentActivity,
      },
    });
  } catch (err) {
    console.error('[GET /api/loyalty]', err);
    return NextResponse.json({ error: 'Failed to fetch loyalty data' }, { status: 500 });
  }
}
