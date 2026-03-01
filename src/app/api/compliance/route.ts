import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/compliance
 * BAR-20: CMRA Compliance Dashboard data.
 * Returns compliance summary, customer compliance details, and alerts.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, expired, critical, warning, ok
    const exportFormat = searchParams.get('export'); // csv, json

    // Fetch all active customers with compliance-relevant fields
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['active', 'suspended'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pmbNumber: true,
        email: true,
        phone: true,
        status: true,
        idType: true,
        idNumber: true,
        idExpiration: true,
        form1583Status: true,
        form1583Date: true,
        createdAt: true,
        updatedAt: true,
        proofOfAddressType: true,
        proofOfAddressDate: true,
        secondaryIdType: true,
        secondaryIdExpiry: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 86400000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 86400000);

    // Compute compliance status for each customer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const complianceRecords = customers.map((c: any) => {
      const idExpDate = c.idExpiration ? new Date(c.idExpiration) : null;
      const secondaryExpDate = c.secondaryIdExpiry ? new Date(c.secondaryIdExpiry) : null;

      // Days until primary ID expires
      const daysUntilIdExpiry = idExpDate
        ? Math.ceil((idExpDate.getTime() - now.getTime()) / 86400000)
        : null;

      // Days until secondary ID expires
      const daysUntilSecondaryExpiry = secondaryExpDate
        ? Math.ceil((secondaryExpDate.getTime() - now.getTime()) / 86400000)
        : null;

      // Overall compliance status
      let complianceStatus: 'compliant' | 'warning' | 'critical' | 'expired' | 'missing';

      const hasForm1583 = c.form1583Status === 'approved' || c.form1583Status === 'completed';
      const hasValidId = idExpDate ? idExpDate > now : false;
      const idMissing = !c.idType || !c.idExpiration;

      if (idMissing || !hasForm1583) {
        complianceStatus = 'missing';
      } else if (daysUntilIdExpiry !== null && daysUntilIdExpiry <= 0) {
        complianceStatus = 'expired';
      } else if (daysUntilIdExpiry !== null && daysUntilIdExpiry <= 30) {
        complianceStatus = 'critical';
      } else if (daysUntilIdExpiry !== null && daysUntilIdExpiry <= 90) {
        complianceStatus = 'warning';
      } else {
        complianceStatus = 'compliant';
      }

      // Compliance issues list
      const issues: string[] = [];
      if (!hasForm1583) issues.push('Form 1583 not approved');
      if (idMissing) issues.push('Primary ID missing');
      if (daysUntilIdExpiry !== null && daysUntilIdExpiry <= 0) issues.push('Primary ID expired');
      if (daysUntilIdExpiry !== null && daysUntilIdExpiry > 0 && daysUntilIdExpiry <= 30) issues.push('Primary ID expiring within 30 days');
      if (daysUntilSecondaryExpiry !== null && daysUntilSecondaryExpiry <= 0) issues.push('Secondary ID expired');
      if (!c.proofOfAddressType) issues.push('No proof of address on file');

      return {
        customerId: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        pmbNumber: c.pmbNumber,
        email: c.email,
        phone: c.phone,
        customerStatus: c.status,
        idType: c.idType,
        idExpiration: c.idExpiration,
        daysUntilIdExpiry,
        secondaryIdType: c.secondaryIdType,
        secondaryIdExpiry: c.secondaryIdExpiry,
        daysUntilSecondaryExpiry,
        form1583Status: c.form1583Status || 'missing',
        form1583Date: c.form1583Date,
        proofOfAddressType: c.proofOfAddressType,
        proofOfAddressDate: c.proofOfAddressDate,
        complianceStatus,
        issues,
        createdAt: c.createdAt.toISOString(),
      };
    });

    // Apply filter
    let filtered = complianceRecords;
    if (filter !== 'all') {
      filtered = complianceRecords.filter((r) => r.complianceStatus === filter);
    }

    // Sort by urgency (expired → critical → warning → missing → compliant)
    const statusOrder = { expired: 0, critical: 1, missing: 2, warning: 3, compliant: 4 };
    filtered.sort(
      (a, b) =>
        (statusOrder[a.complianceStatus] ?? 5) - (statusOrder[b.complianceStatus] ?? 5)
    );

    // Summary stats
    const summary = {
      total: complianceRecords.length,
      compliant: complianceRecords.filter((r) => r.complianceStatus === 'compliant').length,
      warning: complianceRecords.filter((r) => r.complianceStatus === 'warning').length,
      critical: complianceRecords.filter((r) => r.complianceStatus === 'critical').length,
      expired: complianceRecords.filter((r) => r.complianceStatus === 'expired').length,
      missing: complianceRecords.filter((r) => r.complianceStatus === 'missing').length,
      complianceScore: complianceRecords.length > 0
        ? Math.round(
            (complianceRecords.filter((r) => r.complianceStatus === 'compliant').length /
              complianceRecords.length) *
              100
          )
        : 100,
      expiringNext30: complianceRecords.filter(
        (r) => r.daysUntilIdExpiry !== null && r.daysUntilIdExpiry > 0 && r.daysUntilIdExpiry <= 30
      ).length,
      expiringNext60: complianceRecords.filter(
        (r) => r.daysUntilIdExpiry !== null && r.daysUntilIdExpiry > 0 && r.daysUntilIdExpiry <= 60
      ).length,
      expiringNext90: complianceRecords.filter(
        (r) => r.daysUntilIdExpiry !== null && r.daysUntilIdExpiry > 0 && r.daysUntilIdExpiry <= 90
      ).length,
    };

    // Export support
    if (exportFormat === 'csv') {
      const headers = [
        'PMB', 'Name', 'Email', 'Status', 'ID Type', 'ID Expiration',
        'Days Until Expiry', 'Form 1583', 'Compliance Status', 'Issues',
      ];
      const rows = filtered.map((r) => [
        r.pmbNumber, `${r.firstName} ${r.lastName}`, r.email || '',
        r.customerStatus, r.idType || '', r.idExpiration || '',
        r.daysUntilIdExpiry ?? '', r.form1583Status, r.complianceStatus,
        r.issues.join('; '),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ summary, records: filtered });
  } catch (err) {
    console.error('[GET /api/compliance]', err);
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
  }
}
