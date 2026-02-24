import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { PLAN_DEFINITIONS } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/products
 * Sync local billing plans with Stripe products and prices.
 * Admin-only operation.
 */
export async function POST() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.' },
        { status: 503 },
      );
    }

    const stripe = getStripe()!;
    const results = [];

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

    return NextResponse.json({ synced: results });
  } catch (err) {
    console.error('[POST /api/stripe/products]', err);
    return NextResponse.json({ error: 'Failed to sync products' }, { status: 500 });
  }
}
