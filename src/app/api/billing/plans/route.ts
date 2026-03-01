import { withApiHandler, ok } from '@/lib/api-utils';
import { PLAN_DEFINITIONS } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/plans
 * Returns available billing plans (from DB if seeded, otherwise defaults).
 */
export const GET = withApiHandler(async (_request, { user: _user }) => {
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
    return ok({ plans });
  }

  // Fallback to hardcoded defaults
  return ok({ plans: PLAN_DEFINITIONS });
});
