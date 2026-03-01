import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, validateQuery, badRequest } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const QuerySchema = z.object({
  type: z.enum(['charges', 'customers', 'aging']).default('charges'),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * GET /api/billing/dashboard/export
 *
 * Export billing data as CSV.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const query = validateQuery(request, QuerySchema);
  const tenantId = user.tenantId!;

  const where: Prisma.ChargeEventWhereInput = { tenantId, status: { not: 'void' } };
  if (query.from || query.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    where.createdAt = createdAt;
  }

  let csvContent = '';
  let filename = 'billing-export';

  switch (query.type) {
    case 'charges': {
      const charges = await prisma.chargeEvent.findMany({
        where,
        include: {
          customer: {
            select: { firstName: true, lastName: true, pmbNumber: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      csvContent = 'Date,Customer,PMB,Service Type,Description,Qty,Unit Rate,Cost Basis,Markup,Total Charge,Status\n';
      for (const c of charges) {
        const custName = `${c.customer.firstName} ${c.customer.lastName}`.replace(/,/g, ' ');
        csvContent += `${c.createdAt.toISOString().slice(0, 10)},"${custName}",${c.pmbNumber},${c.serviceType},"${c.description.replace(/"/g, '""')}",${c.quantity},${c.unitRate},${c.costBasis},${c.markup},${c.totalCharge},${c.status}\n`;
      }
      filename = 'charge-events';
      break;
    }

    case 'customers': {
      const customerCharges = await prisma.chargeEvent.groupBy({
        by: ['customerId', 'pmbNumber'],
        where,
        _sum: { totalCharge: true, costBasis: true, markup: true },
        _count: true,
        orderBy: { _sum: { totalCharge: 'desc' } },
      });

      const customerIds = customerCharges.map((c) => c.customerId);
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true },
      });
      const custMap = new Map(customers.map((c) => [c.id, c]));

      csvContent = 'Customer,PMB,Email,Total Revenue,Total Cost,Total Markup,Charge Count\n';
      for (const cc of customerCharges) {
        const cust = custMap.get(cc.customerId);
        const custName = cust ? `${cust.firstName} ${cust.lastName}`.replace(/,/g, ' ') : 'Unknown';
        csvContent += `"${custName}",${cc.pmbNumber},${cust?.email || ''},${cc._sum.totalCharge || 0},${cc._sum.costBasis || 0},${cc._sum.markup || 0},${cc._count}\n`;
      }
      filename = 'customer-billing-summary';
      break;
    }

    case 'aging': {
      const now = new Date();
      const buckets = [
        { label: '0-30 days', from: new Date(now.getTime() - 30 * 86400000), to: now },
        { label: '31-60 days', from: new Date(now.getTime() - 60 * 86400000), to: new Date(now.getTime() - 30 * 86400000) },
        { label: '61-90 days', from: new Date(now.getTime() - 90 * 86400000), to: new Date(now.getTime() - 60 * 86400000) },
        { label: '90+ days', from: new Date(0), to: new Date(now.getTime() - 90 * 86400000) },
      ];

      csvContent = 'Age Bucket,Outstanding Amount,Charge Count\n';
      for (const b of buckets) {
        const agg = await prisma.chargeEvent.aggregate({
          where: { tenantId, status: { in: ['pending', 'posted'] }, createdAt: { gte: b.from, lt: b.to } },
          _sum: { totalCharge: true },
          _count: true,
        });
        csvContent += `${b.label},${agg._sum.totalCharge || 0},${agg._count}\n`;
      }
      filename = 'aging-report';
      break;
    }
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}_${timestamp}.csv"`,
    },
  });
});
