import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/invoices
 *
 * Returns payment history / invoices.
 *
 * - Super admin: can view all tenants' invoices (pass ?all=true or ?tenantId=xxx)
 * - Client admin: sees only their own tenant's invoices
 *
 * Query params:
 *   - all: "true" — super admin only, returns all tenants' invoices
 *   - tenantId: string — super admin only, filter to a specific tenant
 *   - limit: number (defaults to 50, max 200)
 *   - period: "YYYY-MM" — filter to a specific billing period
 */
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
    const all = searchParams.get('all') === 'true';
    const filterTenantId = searchParams.get('tenantId');
    const period = searchParams.get('period');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const isSuperAdmin = user.role === 'superadmin';

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (isSuperAdmin && all) {
      // Super admin sees all
      if (filterTenantId) {
        where.tenantId = filterTenantId;
      }
    } else if (isSuperAdmin && filterTenantId) {
      where.tenantId = filterTenantId;
    } else {
      // Client admin — own tenant only
      where.tenantId = user.tenantId;
    }

    if (period) {
      where.billingPeriod = period;
    }

    const payments = await prisma.paymentRecord.findMany({
      where,
      include: isSuperAdmin
        ? { tenant: { select: { id: true, name: true, slug: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      invoices: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        description: p.description,
        invoiceUrl: p.invoiceUrl,
        billingPeriod: p.billingPeriod,
        periodStart: p.periodStart?.toISOString() ?? null,
        periodEnd: p.periodEnd?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        // Include tenant info for super admin
        ...((p as unknown as Record<string, unknown>).tenant
          ? {
              tenant: (p as unknown as Record<string, { id: string; name: string; slug: string }>)
                .tenant,
            }
          : {}),
      })),
    });
  } catch (err) {
    console.error('[GET /api/billing/invoices]', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
