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

      // Compute renewalStatus dynamically from daysUntilRenewal so the
      // pipeline always reflects reality, even before the cron runs.
      let renewalStatus = c.renewalStatus;
      if (c.renewalDate) {
        if (c.status === 'suspended' || renewalStatus === 'suspended') {
          renewalStatus = 'suspended';
        } else if (daysUntilRenewal < -15) {
          renewalStatus = 'suspended';
        } else if (daysUntilRenewal < 0) {
          renewalStatus = 'past_due';
        } else if (daysUntilRenewal <= 30) {
          renewalStatus = 'due_soon';
        } else {
          renewalStatus = 'current';
        }
      }

      return {
        ...c,
        renewalDate: c.renewalDate?.toISOString() ?? null,
        lastRenewalNotice: c.lastRenewalNotice?.toISOString() ?? null,
        daysUntilRenewal,
        renewalStatus,
      };
    });

    return NextResponse.json({ customers: enriched });
  } catch (err) {
    console.error('[GET /api/renewals]', err);
    return NextResponse.json({ error: 'Failed to fetch renewals' }, { status: 500 });
  }
}
