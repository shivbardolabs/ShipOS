import { NextResponse } from 'next/server';
import { withApiHandler, validateQuery, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  period: z.enum(['current', 'previous', 'custom']).default('current'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/super-admin/billing/export
 * Exports billing report as CSV.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const query = validateQuery(request, ExportQuerySchema);

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

  if (query.format === 'csv') {
    const csvHeader = 'Client,Active Stores,Total Stores,Fee/Store,Monthly Revenue,Payment Status,Account Status';
    const rows = tenants.map((t) => {
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

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="billing-report-${query.period}.csv"`,
      },
    });
  }

  // For XLSX, we'd use a library like exceljs
  return NextResponse.json(
    { error: 'XLSX export coming soon. Use CSV for now.' },
    { status: 501 }
  );
});
