import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, validateQuery, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const ExportQuerySchema = z.object({
  type: z.enum(['packages', 'customers', 'revenue']),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

/**
 * GET /api/reports/export?type=packages|customers|revenue
 * Returns a CSV download.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return forbidden('Admin role required');
  }
  if (!user.tenantId) return badRequest('No tenant');

  const query = validateQuery(request, ExportQuerySchema);
  const tenantId = user.tenantId;

  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
  const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

  let csvContent: string;
  let filename: string;

  if (query.type === 'packages') {
    const packages = await prisma.package.findMany({
      where: {
        customer: { tenantId },
        ...(dateFrom || dateTo ? {
          checkedInAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
      },
      include: { customer: { select: { firstName: true, lastName: true, pmbNumber: true } } },
      orderBy: { checkedInAt: 'desc' },
    });

    csvContent = stringify(
      packages.map((p) => ({
        'Tracking Number': p.trackingNumber,
        Carrier: p.carrier,
        Status: p.status,
        'Package Type': p.packageType,
        Customer: `${p.customer?.firstName ?? ''} ${p.customer?.lastName ?? ''}`.trim(),
        PMB: p.customer?.pmbNumber ?? '',
        'Storage Location': p.storageLocation ?? '',
        'Checked In': p.checkedInAt?.toISOString() ?? '',
        Released: p.releasedAt?.toISOString() ?? '',
      })),
      { header: true },
    );
    filename = `packages-export-${new Date().toISOString().slice(0, 10)}.csv`;
  } else if (query.type === 'customers') {
    const customers = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { lastName: 'asc' },
    });

    csvContent = stringify(
      customers.map((c) => ({
        PMB: c.pmbNumber,
        'First Name': c.firstName,
        'Last Name': c.lastName,
        Email: c.email ?? '',
        Phone: c.phone ?? '',
        Status: c.status,
        'Form 1583': c.form1583Status ?? '',
        'Renewal Date': c.renewalDate?.toISOString() ?? '',
        'Created At': c.createdAt.toISOString(),
      })),
      { header: true },
    );
    filename = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    // revenue
    const charges = await prisma.chargeEvent.findMany({
      where: {
        tenantId,
        status: { in: ['approved', 'paid'] },
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
      },
      include: { customer: { select: { firstName: true, lastName: true, pmbNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });

    csvContent = stringify(
      charges.map((c) => ({
        Date: c.createdAt.toISOString(),
        Type: c.type,
        Description: c.description,
        Customer: `${c.customer?.firstName ?? ''} ${c.customer?.lastName ?? ''}`.trim(),
        PMB: c.customer?.pmbNumber ?? '',
        Amount: c.amount.toFixed(2),
        Tax: (c.tax ?? 0).toFixed(2),
        Status: c.status,
      })),
      { header: true },
    );
    filename = `revenue-export-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
