import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/renewals
 * Returns renewal pipeline data for the current tenant.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const where = {
      ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
      deletedAt: null,
      renewalDate: { not: null as null },
    };

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { renewalDate: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pmbNumber: true,
        email: true,
        phone: true,
        renewalDate: true,
        renewalStatus: true,
        lastRenewalNotice: true,
        status: true,
      },
    });

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = customers.map((c: any) => {
      const daysUntilRenewal = c.renewalDate
        ? Math.ceil((c.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...c,
        renewalDate: c.renewalDate?.toISOString() ?? null,
        lastRenewalNotice: c.lastRenewalNotice?.toISOString() ?? null,
        daysUntilRenewal,
      };
    });

    return NextResponse.json({ customers: enriched });
  } catch (err) {
    console.error('[GET /api/renewals]', err);
    return NextResponse.json({ error: 'Failed to fetch renewals' }, { status: 500 });
  }
}
