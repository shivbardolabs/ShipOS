import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/super-admin/billing/export
 * Exports billing report as CSV.
 * Query params: ?format=csv|xlsx&period=current|previous|custom&startDate=&endDate=
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';
    const period = searchParams.get('period') || 'current';

    // Fetch tenants with stores and subscriptions
    const tenants = await prisma.tenant.findMany({
      include: {
        stores: true,
        subscriptions: {
          where: { status: { in: ['active', 'past_due', 'trialing'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    if (format === 'csv') {
      const csvHeader = 'Client,Active Stores,Total Stores,Fee/Store,Monthly Revenue,Payment Status,Account Status';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = tenants.map((t: any) => {
        const activeSub = t.subscriptions[0];
        const fee = activeSub?.plan?.priceMonthly ?? 125;
        const storeCount = t.stores.length;
        const revenue = fee * storeCount;
        const paymentStatus = activeSub?.status === 'past_due' ? 'Overdue' : 'Paid';

        return [
          `"${t.name}"`,
          storeCount,
          storeCount,
          `$${fee.toFixed(2)}`,
          `$${revenue.toFixed(2)}`,
          paymentStatus,
          t.status.charAt(0).toUpperCase() + t.status.slice(1),
        ].join(',');
      });

      const csvData = [csvHeader, ...rows].join('\n');

      return new Response(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="billing-report-${period}.csv"`,
        },
      });
    }

    // For XLSX, we'd use a library like exceljs
    return NextResponse.json(
      { error: 'XLSX export coming soon. Use CSV for now.' },
      { status: 501 }
    );
  } catch (err) {
    console.error('[GET /api/super-admin/billing/export]', err);
    return NextResponse.json({ error: 'Failed to export billing data' }, { status: 500 });
  }
}
