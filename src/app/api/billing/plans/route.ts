import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { PLAN_DEFINITIONS } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/plans
 * Returns available billing plans (from DB if seeded, otherwise defaults).
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Try to get plans from DB first
    const dbPlans = await prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (dbPlans.length > 0) {
      const plans = dbPlans.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        maxMailboxes: p.maxMailboxes,
        maxUsers: p.maxUsers,
        maxStores: p.maxStores,
        features: p.features ? JSON.parse(p.features) : [],
        stripePriceId: p.stripePriceId,
      }));
      return NextResponse.json({ plans });
    }

    // Fallback to hardcoded defaults
    return NextResponse.json({ plans: PLAN_DEFINITIONS });
  } catch (err) {
    console.error('[GET /api/billing/plans]', err);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
