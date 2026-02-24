import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { stringify } from 'csv-stringify/sync';
import prisma from '@/lib/prisma';

/**
 * GET /api/reports/export?type=packages|customers|revenue&format=csv
 * Export report data as CSV.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'packages';
    const format = searchParams.get('format') || 'csv';

    if (format !== 'csv') {
      return NextResponse.json({ error: 'Only CSV format is currently supported' }, { status: 400 });
    }

    let csvContent: string;
    let filename: string;

    switch (type) {
      case 'packages': {
        const packages = await prisma.package.findMany({
          where: { customer: { tenantId: user.tenantId } },
          include: { customer: true, checkedInBy: true, checkedOutBy: true },
          orderBy: { checkedInAt: 'desc' },
          take: 5000,
        });

        csvContent = stringify(
          packages.map((p) => ({
            'Tracking Number': p.trackingNumber || '',
            Carrier: p.carrier,
            Status: p.status,
            Customer: `${p.customer.firstName} ${p.customer.lastName}`,
            'PMB Number': p.customer.pmbNumber,
            'Package Type': p.packageType,
            'Storage Fee': p.storageFee,
            'Receiving Fee': p.receivingFee,
            'Checked In': p.checkedInAt?.toISOString() || '',
            'Released': p.releasedAt?.toISOString() || '',
            'Checked In By': p.checkedInBy?.name || '',
            'Checked Out By': p.checkedOutBy?.name || '',
          })),
          { header: true },
        );
        filename = `packages-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'customers': {
        const customers = await prisma.customer.findMany({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });

        csvContent = stringify(
          customers.map((c) => ({
            'PMB Number': c.pmbNumber,
            'First Name': c.firstName,
            'Last Name': c.lastName,
            Email: c.email || '',
            Phone: c.phone || '',
            Business: c.businessName || '',
            Platform: c.platform,
            Status: c.status,
            'Date Opened': c.dateOpened?.toISOString() || '',
            'Form 1583 Status': c.form1583Status || '',
          })),
          { header: true },
        );
        filename = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'revenue': {
        const payments = await prisma.paymentRecord.findMany({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });

        csvContent = stringify(
          payments.map((p) => ({
            Date: p.createdAt.toISOString(),
            Amount: p.amount,
            Currency: p.currency,
            Status: p.status,
            Method: p.method,
            Description: p.description || '',
          })),
          { header: true },
        );
        filename = `revenue-export-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/reports/export]', err);
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}
