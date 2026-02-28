import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCurrentPeriod, buildQuotaSnapshot } from '@/lib/pmb-billing/quotas';

/**
 * GET /api/pmb/quotas?customerId=...
 * Get quota usage for a customer in the current billing period.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const customerId = req.nextUrl.searchParams.get('customerId');
    const period = req.nextUrl.searchParams.get('period') ?? getCurrentPeriod();

    if (customerId) {
      // Single customer quota
      const usage = await prisma.pmbQuotaUsage.findUnique({
        where: {
          tenantId_customerId_period: {
            tenantId: user.tenantId,
            customerId,
            period,
          },
        },
      });

      if (!usage) {
        return NextResponse.json({ quota: null, period });
      }

      const snapshot = buildQuotaSnapshot(usage);
      return NextResponse.json({ quota: snapshot });
    }

    // All customers for the period
    const usages = await prisma.pmbQuotaUsage.findMany({
      where: { tenantId: user.tenantId, period },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const snapshots = usages.map(buildQuotaSnapshot);
    return NextResponse.json({ quotas: snapshots, period });
  } catch (err) {
    console.error('[GET /api/pmb/quotas]', err);
    return NextResponse.json({ error: 'Failed to fetch quotas' }, { status: 500 });
  }
}

/**
 * POST /api/pmb/quotas
 * Record quota consumption (increment usage counters).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const { customerId, service, quantity = 1 } = await req.json();
    if (!customerId || !service) {
      return NextResponse.json({ error: 'customerId and service are required' }, { status: 400 });
    }

    const period = getCurrentPeriod();
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Map service type to field
    const fieldMap: Record<string, string> = {
      mailItems: 'mailItemsUsed',
      scans: 'scansUsed',
      storageDays: 'storageDaysUsed',
      forwarding: 'forwardingUsed',
      shredding: 'shreddingUsed',
      packages: 'packagesReceived',
    };

    const field = fieldMap[service];
    if (!field) {
      return NextResponse.json({ error: `Unknown service type: ${service}` }, { status: 400 });
    }

    // Upsert quota usage
    const usage = await prisma.pmbQuotaUsage.upsert({
      where: {
        tenantId_customerId_period: {
          tenantId: user.tenantId,
          customerId,
          period,
        },
      },
      create: {
        tenantId: user.tenantId,
        customerId,
        period,
        periodStart,
        periodEnd,
        [field]: quantity,
      },
      update: {
        [field]: { increment: quantity },
      },
    });

    return NextResponse.json({ usage });
  } catch (err) {
    console.error('[POST /api/pmb/quotas]', err);
    return NextResponse.json({ error: 'Failed to record quota usage' }, { status: 500 });
  }
}
