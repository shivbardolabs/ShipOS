import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/super-admin/billing
 * Returns billing and performance reporting data.
 * Supports: ?period=current|previous|custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
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

  // TODO: Query real data from Prisma
  // Revenue calculation:
  //   Monthly revenue per client = (per-store subscription fee) × (number of active stores)
  //   Pro-rated for mid-month activations:
  //     activatedDay = day of activation
  //     daysInMonth = total calendar days
  //     proRatedFee = ((daysInMonth - activatedDay + 1) / daysInMonth) * feePerStore * activeStores
  //   Pro-rated for mid-month deactivations:
  //     deactivatedDay = day of deactivation
  //     proRatedFee = (deactivatedDay / daysInMonth) * feePerStore * activeStores

  return NextResponse.json({
    period: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    summary: {
      totalClients: 8,
      activeClients: 7,
      inactiveClients: 1,
      totalStores: 33,
      activeStores: 26,
      totalMRR: 3175.0,
      paidCount: 4,
      pendingCount: 1,
      overdueCount: 3,
    },
    clients: [],
    message: 'Endpoint ready — connect to Prisma for live data',
  });
}
