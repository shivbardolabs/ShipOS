import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, ApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const CheckoutBodySchema = z.object({
  priceId: z.string().min(1, 'priceId is required'),
  planId: z.string().min(1, 'planId is required'),
});

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for a plan subscription.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!isStripeConfigured()) {
    throw new ApiError('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.', 503);
  }

  const stripe = getStripe()!;
  const { priceId, planId } = await validateBody(request, CheckoutBodySchema);

  // Get or create Stripe customer
  let stripeCustomerId = user.tenant?.id
    ? (await prisma.tenant.findUnique({ where: { id: user.tenant.id } }))?.stripeCustomerId
    : null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.tenant?.name || user.name,
      metadata: {
        tenantId: user.tenantId || '',
        userId: user.id,
      },
    });
    stripeCustomerId = customer.id;

    if (user.tenantId) {
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { stripeCustomerId: customer.id },
      });
    }
  }

  const origin = request.headers.get('origin') || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard/settings/billing?canceled=true`,
    metadata: {
      tenantId: user.tenantId || '',
      planId,
    },
  });

  return ok({ url: session.url });
});
