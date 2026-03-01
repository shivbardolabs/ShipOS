import { withApiHandler, ok, forbidden, ApiError } from '@/lib/api-utils';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { PLAN_DEFINITIONS } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/products
 * Sync local billing plans with Stripe products and prices.
 * Admin-only operation.
 */
export const POST = withApiHandler(async (_request, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    forbidden('Admin role required');
  }

  if (!isStripeConfigured()) {
    throw new ApiError('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.', 503);
  }

  const stripe = getStripe()!;
  const results: Array<{
    plan: string;
    stripeProductId: string;
    stripePriceId: string;
    localPlanId: string;
  }> = [];

  for (const plan of PLAN_DEFINITIONS) {
    // Check if plan exists locally
    let billingPlan = await prisma.billingPlan.findUnique({
      where: { slug: plan.slug },
    });

    // Create or update Stripe product
    let product;
    const existingProducts = await stripe.products.search({
      query: `metadata["slug"]:"${plan.slug}"`,
    });

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      await stripe.products.update(product.id, {
        name: `ShipOS ${plan.name}`,
        description: plan.features.join(', '),
      });
    } else {
      product = await stripe.products.create({
        name: `ShipOS ${plan.name}`,
        description: plan.features.join(', '),
        metadata: { slug: plan.slug },
      });
    }

    // Create monthly price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.priceMonthly * 100),
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { slug: plan.slug },
    });

    // Upsert local billing plan
    if (billingPlan) {
      billingPlan = await prisma.billingPlan.update({
        where: { id: billingPlan.id },
        data: { stripePriceId: price.id },
      });
    } else {
      billingPlan = await prisma.billingPlan.create({
        data: {
          name: plan.name,
          slug: plan.slug,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          maxMailboxes: plan.maxMailboxes,
          maxUsers: plan.maxUsers,
          maxStores: plan.maxStores,
          features: JSON.stringify(plan.features),
          stripePriceId: price.id,
          sortOrder: PLAN_DEFINITIONS.indexOf(plan),
        },
      });
    }

    results.push({
      plan: plan.name,
      stripeProductId: product.id,
      stripePriceId: price.id,
      localPlanId: billingPlan.id,
    });
  }

  return ok({ synced: results });
});
