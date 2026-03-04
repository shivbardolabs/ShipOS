import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/dashboard/stats
 * Compute real-time dashboard statistics from Postgres.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tenantFilter = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId }
      : {};
    const customerRelationFilter = user.role !== 'superadmin' && user.tenantId
      ? { customer: { tenantId: user.tenantId } }
      : {};

    const [
      packagesCheckedInToday,
      packagesReleasedToday,
      packagesHeld,
      activeCustomers,
      idExpiringSoon,
      shipmentsToday,
      revenueTodayResult,
      notificationsSent,
    ] = await Promise.all([
      prisma.package.count({
        where: { ...customerRelationFilter, checkedInAt: { gte: startOfToday } },
      }),
      prisma.package.count({
        where: { ...customerRelationFilter, releasedAt: { gte: startOfToday } },
      }),
      prisma.package.count({
        where: { ...customerRelationFilter, status: { in: ['checked_in', 'notified', 'ready'] } },
      }),
      prisma.customer.count({
        where: { ...tenantFilter, status: 'active', deletedAt: null },
      }),
      prisma.customer.count({
        where: {
          ...tenantFilter,
          deletedAt: null,
          idExpiration: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.shipment.count({
        where: { ...customerRelationFilter, createdAt: { gte: startOfToday } },
      }),
      prisma.shipment.aggregate({
        where: { ...customerRelationFilter, createdAt: { gte: startOfToday } },
        _sum: { retailPrice: true },
      }),
      prisma.notification.count({
        where: { ...customerRelationFilter, sentAt: { gte: startOfToday } },
      }),
    ]);

    return NextResponse.json({
      packagesCheckedInToday,
      packagesReleasedToday,
      packagesHeld,
      activeCustomers,
      idExpiringSoon,
      shipmentsToday,
      revenueToday: revenueTodayResult._sum.retailPrice ?? 0,
      notificationsSent,
    });
  } catch (err) {
    console.error('[GET /api/dashboard/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
});
