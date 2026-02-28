import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  Helper: date range from granularity                                       */
/* -------------------------------------------------------------------------- */
function dateRangeFromGranularity(granularity: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  let from: Date;

  switch (granularity) {
    case 'day':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week': {
      const day = now.getDay();
      from = new Date(now);
      from.setDate(now.getDate() - day);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), q, 1);
      break;
    }
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from, to };
}

/* -------------------------------------------------------------------------- */
/*  GET /api/billing/dashboard                                                */
/*                                                                            */
/*  Returns aggregated billing data for the CLIENT billing dashboard.         */
/*                                                                            */
/*  Query params:                                                             */
/*    - period: day | week | month | quarter | year (default: month)          */
/*    - from: ISO date (overrides period)                                     */
/*    - to: ISO date (overrides period)                                       */
/*    - customerId: filter to specific customer                               */
/*    - serviceType: filter by service type                                   */
/*    - billingModel: subscription | usage | tos                              */
/* -------------------------------------------------------------------------- */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const customerId = searchParams.get('customerId');
    const serviceType = searchParams.get('serviceType');

    // Resolve date range
    let dateFrom: Date;
    let dateTo: Date;
    if (fromParam && toParam) {
      dateFrom = new Date(fromParam);
      dateTo = new Date(toParam);
    } else {
      const range = dateRangeFromGranularity(period);
      dateFrom = range.from;
      dateTo = range.to;
    }

    // Previous period for comparison
    const periodMs = dateTo.getTime() - dateFrom.getTime();
    const prevFrom = new Date(dateFrom.getTime() - periodMs);
    const prevTo = new Date(dateFrom);

    const tenantId = user.tenantId;

    // Base where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: Record<string, any> = { tenantId };
    if (customerId) baseWhere.customerId = customerId;
    if (serviceType) baseWhere.serviceType = serviceType;

    const currentWhere = {
      ...baseWhere,
      createdAt: { gte: dateFrom, lte: dateTo },
    };

    const prevWhere = {
      ...baseWhere,
      createdAt: { gte: prevFrom, lte: prevTo },
    };

    // ── 1. Overview stats ──────────────────────────────────────────────────
    const [currentAgg, prevAgg, outstandingAgg, totalCharges, paidCharges] = await Promise.all([
      prisma.chargeEvent.aggregate({
        where: { ...currentWhere, status: { not: 'void' } },
        _sum: { totalCharge: true, costBasis: true, markup: true },
        _count: true,
      }),
      prisma.chargeEvent.aggregate({
        where: { ...prevWhere, status: { not: 'void' } },
        _sum: { totalCharge: true, costBasis: true, markup: true },
        _count: true,
      }),
      // Outstanding = pending + posted (not yet paid/invoiced)
      prisma.chargeEvent.aggregate({
        where: { ...baseWhere, status: { in: ['pending', 'posted'] } },
        _sum: { totalCharge: true },
        _count: true,
      }),
      prisma.chargeEvent.count({
        where: { ...currentWhere, status: { not: 'void' } },
      }),
      prisma.chargeEvent.count({
        where: { ...currentWhere, status: 'paid' },
      }),
    ]);

    const currentRevenue = currentAgg._sum.totalCharge || 0;
    const prevRevenue = prevAgg._sum.totalCharge || 0;
    const revenueChange = prevRevenue > 0
      ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 1000) / 10
      : 0;

    const outstanding = outstandingAgg._sum.totalCharge || 0;
    const outstandingCount = outstandingAgg._count;
    const collectionRate = totalCharges > 0
      ? Math.round((paidCharges / totalCharges) * 1000) / 10
      : 0;

    // ── 2. Revenue by service type ─────────────────────────────────────────
    const revenueByService = await prisma.chargeEvent.groupBy({
      by: ['serviceType'],
      where: { ...currentWhere, status: { not: 'void' } },
      _sum: { totalCharge: true, costBasis: true, markup: true },
      _count: true,
    });

    // ── 3. Revenue by billing model ────────────────────────────────────────
    // We derive billing model from CustomerBillingProfile
    const customerProfiles = await prisma.customerBillingProfile.findMany({
      where: { customer: { tenantId } },
      select: { customerId: true, billingModel: true },
    });

    const profileMap = new Map(customerProfiles.map((p) => [p.customerId, p.billingModel]));

    // Group charges by billing model
    const chargesForModel = await prisma.chargeEvent.findMany({
      where: { ...currentWhere, status: { not: 'void' } },
      select: { customerId: true, totalCharge: true, costBasis: true, markup: true },
    });

    const modelBuckets: Record<string, { revenue: number; cost: number; markup: number; count: number }> = {
      subscription: { revenue: 0, cost: 0, markup: 0, count: 0 },
      usage: { revenue: 0, cost: 0, markup: 0, count: 0 },
      tos: { revenue: 0, cost: 0, markup: 0, count: 0 },
      other: { revenue: 0, cost: 0, markup: 0, count: 0 },
    };

    for (const charge of chargesForModel) {
      const model = profileMap.get(charge.customerId) || 'subscription';
      let bucket = 'other';
      if (model.includes('subscription')) bucket = 'subscription';
      else if (model.includes('usage')) bucket = 'usage';
      else if (model.includes('tos')) bucket = 'tos';

      modelBuckets[bucket].revenue += charge.totalCharge;
      modelBuckets[bucket].cost += charge.costBasis;
      modelBuckets[bucket].markup += charge.markup;
      modelBuckets[bucket].count += 1;
    }

    // ── 4. Customer billing summary (top customers) ────────────────────────
    const customerSummary = await prisma.chargeEvent.groupBy({
      by: ['customerId', 'pmbNumber'],
      where: { ...currentWhere, status: { not: 'void' } },
      _sum: { totalCharge: true, costBasis: true, markup: true },
      _count: true,
      orderBy: { _sum: { totalCharge: 'desc' } },
      take: 20,
    });

    // Fetch customer names for the top customers
    const customerIds = customerSummary.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true, status: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const customerBilling = customerSummary.map((cs) => {
      const cust = customerMap.get(cs.customerId);
      return {
        customerId: cs.customerId,
        pmbNumber: cs.pmbNumber,
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Unknown',
        email: cust?.email || null,
        status: cust?.status || 'unknown',
        totalCharge: cs._sum.totalCharge || 0,
        totalCost: cs._sum.costBasis || 0,
        totalMarkup: cs._sum.markup || 0,
        chargeCount: cs._count,
      };
    });

    // ── 5. Aging report (outstanding balances by age bucket) ───────────────
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [aging0to30, aging31to60, aging61to90, aging90plus] = await Promise.all([
      prisma.chargeEvent.aggregate({
        where: { ...baseWhere, status: { in: ['pending', 'posted'] }, createdAt: { gte: d30 } },
        _sum: { totalCharge: true },
        _count: true,
      }),
      prisma.chargeEvent.aggregate({
        where: { ...baseWhere, status: { in: ['pending', 'posted'] }, createdAt: { gte: d60, lt: d30 } },
        _sum: { totalCharge: true },
        _count: true,
      }),
      prisma.chargeEvent.aggregate({
        where: { ...baseWhere, status: { in: ['pending', 'posted'] }, createdAt: { gte: d90, lt: d60 } },
        _sum: { totalCharge: true },
        _count: true,
      }),
      prisma.chargeEvent.aggregate({
        where: { ...baseWhere, status: { in: ['pending', 'posted'] }, createdAt: { lt: d90 } },
        _sum: { totalCharge: true },
        _count: true,
      }),
    ]);

    const agingReport = [
      { bucket: '0-30 days', amount: aging0to30._sum.totalCharge || 0, count: aging0to30._count },
      { bucket: '31-60 days', amount: aging31to60._sum.totalCharge || 0, count: aging31to60._count },
      { bucket: '61-90 days', amount: aging61to90._sum.totalCharge || 0, count: aging61to90._count },
      { bucket: '90+ days', amount: aging90plus._sum.totalCharge || 0, count: aging90plus._count },
    ];

    // ── 6. Trend data (charges per day in period) ──────────────────────────
    const trendCharges = await prisma.chargeEvent.findMany({
      where: { ...currentWhere, status: { not: 'void' } },
      select: { createdAt: true, totalCharge: true, costBasis: true, serviceType: true },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate by date
    const trendMap = new Map<string, { revenue: number; cost: number; count: number }>();
    for (const c of trendCharges) {
      const dateKey = c.createdAt.toISOString().slice(0, 10);
      const existing = trendMap.get(dateKey) || { revenue: 0, cost: 0, count: 0 };
      existing.revenue += c.totalCharge;
      existing.cost += c.costBasis;
      existing.count += 1;
      trendMap.set(dateKey, existing);
    }

    const trendData = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        profit: Math.round((data.revenue - data.cost) * 100) / 100,
        count: data.count,
      }));

    // ── 7. Optimization insights ───────────────────────────────────────────
    const optimizations: Array<{ type: string; severity: string; title: string; description: string; customerId?: string; pmbNumber?: string; value?: number }> = [];

    // 7a. High-usage customers who could benefit from tier upgrades
    const highUsageCustomers = await prisma.chargeEvent.groupBy({
      by: ['customerId', 'pmbNumber'],
      where: { ...baseWhere, status: { not: 'void' }, createdAt: { gte: d30 } },
      _sum: { totalCharge: true },
      _count: true,
      having: { id: { _count: { gt: 10 } } },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    for (const huc of highUsageCustomers) {
      const cust = customerMap.get(huc.customerId);
      optimizations.push({
        type: 'tier_upgrade',
        severity: 'info',
        title: 'Potential Tier Upgrade',
        description: `${cust ? `${cust.firstName} ${cust.lastName}` : huc.pmbNumber} had ${huc._count} charges ($${(huc._sum.totalCharge || 0).toFixed(2)}) in the last 30 days — may benefit from a higher-tier plan.`,
        customerId: huc.customerId,
        pmbNumber: huc.pmbNumber,
        value: huc._sum.totalCharge || 0,
      });
    }

    // 7b. Revenue leakage — pending charges older than 30 days
    const staleCharges = await prisma.chargeEvent.findMany({
      where: {
        ...baseWhere,
        status: 'pending',
        createdAt: { lt: d30 },
      },
      select: { id: true, customerId: true, pmbNumber: true, totalCharge: true, description: true, createdAt: true },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    if (staleCharges.length > 0) {
      const leakageTotal = staleCharges.reduce((sum, sc) => sum + sc.totalCharge, 0);
      optimizations.push({
        type: 'revenue_leakage',
        severity: 'warning',
        title: 'Revenue Leakage Alert',
        description: `${staleCharges.length} charges totaling $${leakageTotal.toFixed(2)} have been pending for over 30 days. Review and post or void these charges.`,
        value: leakageTotal,
      });
    }

    // 7c. Underperforming PMBs — low charge volume relative to others
    const allPmbCharges = await prisma.chargeEvent.groupBy({
      by: ['pmbNumber'],
      where: { ...baseWhere, status: { not: 'void' }, createdAt: { gte: d30 } },
      _sum: { totalCharge: true },
      _count: true,
    });

    if (allPmbCharges.length > 3) {
      const avgRevenue = allPmbCharges.reduce((s, p) => s + (p._sum.totalCharge || 0), 0) / allPmbCharges.length;
      const underperforming = allPmbCharges.filter((p) => (p._sum.totalCharge || 0) < avgRevenue * 0.25);
      if (underperforming.length > 0) {
        optimizations.push({
          type: 'underperforming',
          severity: 'info',
          title: 'Underperforming PMBs',
          description: `${underperforming.length} PMB(s) generated less than 25% of average revenue ($${avgRevenue.toFixed(2)}/PMB). Consider plan reviews or outreach.`,
          value: underperforming.reduce((s, p) => s + (p._sum.totalCharge || 0), 0),
        });
      }
    }

    // 7d. Disputed charges alert
    const disputedCount = await prisma.chargeEvent.count({
      where: { ...baseWhere, status: 'disputed' },
    });
    if (disputedCount > 0) {
      optimizations.push({
        type: 'disputed',
        severity: 'danger',
        title: 'Disputed Charges',
        description: `${disputedCount} charge(s) are currently disputed and require resolution.`,
      });
    }

    // ── 8. Status breakdown ────────────────────────────────────────────────
    const statusBreakdown = await prisma.chargeEvent.groupBy({
      by: ['status'],
      where: { ...baseWhere, createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { totalCharge: true },
      _count: true,
    });

    return NextResponse.json({
      overview: {
        totalRevenue: Math.round(currentRevenue * 100) / 100,
        totalCost: Math.round((currentAgg._sum.costBasis || 0) * 100) / 100,
        totalMarkup: Math.round((currentAgg._sum.markup || 0) * 100) / 100,
        chargeCount: totalCharges,
        revenueChange,
        outstanding: Math.round(outstanding * 100) / 100,
        outstandingCount,
        collectionRate,
        period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      },
      revenueByService: revenueByService.map((r) => ({
        serviceType: r.serviceType,
        revenue: Math.round((r._sum.totalCharge || 0) * 100) / 100,
        cost: Math.round((r._sum.costBasis || 0) * 100) / 100,
        markup: Math.round((r._sum.markup || 0) * 100) / 100,
        count: r._count,
      })),
      revenueByModel: Object.entries(modelBuckets)
        .filter(([, v]) => v.count > 0)
        .map(([model, data]) => ({
          model,
          revenue: Math.round(data.revenue * 100) / 100,
          cost: Math.round(data.cost * 100) / 100,
          markup: Math.round(data.markup * 100) / 100,
          count: data.count,
        })),
      customerBilling,
      agingReport,
      trendData,
      optimizations,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        amount: Math.round((s._sum.totalCharge || 0) * 100) / 100,
        count: s._count,
      })),
    });
  } catch (error) {
    console.error('[Billing Dashboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load billing dashboard data' },
      { status: 500 }
    );
  }
}
