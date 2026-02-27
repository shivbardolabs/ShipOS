/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/super-admin/billing
 * Returns billing and performance reporting data.
 * Supports: ?period=current|previous|custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'current';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range based on period
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;

    if (period === 'custom' && startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
    } else if (period === 'previous') {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clients = tenants.map((t: any) => {
      const activeSub = t.subscriptions[0];
      const subscriptionFee = activeSub?.plan?.priceMonthly ?? 125;
      const storeCount = t.stores.length;
      const monthlyRevenue = subscriptionFee * storeCount;

      // Determine payment status
      let paymentStatus: 'paid' | 'pending' | 'overdue' = 'paid';
      if (activeSub?.status === 'past_due') {
        paymentStatus = 'overdue';
      } else {
        const hasPending = t.paymentRecords.some((p: any) => p.status === 'pending');
        const hasFailed = t.paymentRecords.some((p: any) => p.status === 'failed');
        if (hasFailed) paymentStatus = 'overdue';
        else if (hasPending) paymentStatus = 'pending';
      }

      const lastPaid = t.paymentRecords.find((p: any) => p.status === 'succeeded');

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
        stores: t.stores.map((s: any) => ({
          name: s.name,
          status: 'active' as const,
          revenueContribution: subscriptionFee,
        })),
      };
    });

    // Compute summary
    const activeClients = clients.filter((c: any) => c.accountStatus === 'active').length;
    const inactiveClients = clients.length - activeClients;
    const totalStores = clients.reduce((s: number, c: any) => s + c.totalStores, 0);
    const activeStores = clients.reduce((s: number, c: any) => s + c.activeStores, 0);
    const totalMRR = clients.reduce((s: number, c: any) => s + c.monthlyRevenue, 0);
    const paidCount = clients.filter((c: any) => c.paymentStatus === 'paid').length;
    const pendingCount = clients.filter((c: any) => c.paymentStatus === 'pending').length;
    const overdueCount = clients.filter((c: any) => c.paymentStatus === 'overdue').length;

    return NextResponse.json({
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
  } catch (err) {
    console.error('[GET /api/super-admin/billing]', err);
    return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 });
  }
}
