import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, ApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { isDemoMode } from '@/lib/payment-mode';
import { DemoPaymentProcessor } from '@/lib/demo-payment';
import prisma from '@/lib/prisma';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const CheckoutBodySchema = z.object({
  priceId: z.string().min(1, 'priceId is required'),
  planId: z.string().min(1, 'planId is required'),
});

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for a plan subscription.
 *
 * In demo mode, redirects directly to the success URL with a mock session ID.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  // ── Demo mode: skip Stripe, redirect to success ─────────────────────────
  if (isDemoMode()) {
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const demoSessionId = `demo_cs_${Date.now()}`;
    const { planId } = await validateBody(request, CheckoutBodySchema);

    // Create a payment record for the demo checkout
    if (user.tenantId) {
      const plan = await prisma.billingPlan.findUnique({ where: { id: planId } });
      if (plan) {
        const demoCharge = DemoPaymentProcessor.charge(plan.priceMonthly);
        const now = new Date();
        const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        await prisma.paymentRecord.upsert({
          where: {
            unique_tenant_billing_period: {
              tenantId: user.tenantId,
              billingPeriod,
            },
          },
          update: {
            amount: plan.priceMonthly,
            status: 'succeeded',
            method: 'demo',
            description: `Demo checkout — ${plan.name}`,
            stripePaymentId: demoCharge.transactionId,
          },
          create: {
            tenantId: user.tenantId,
            amount: plan.priceMonthly,
            currency: 'usd',
            status: 'succeeded',
            method: 'demo',
            description: `Demo checkout — ${plan.name}`,
            stripePaymentId: demoCharge.transactionId,
            billingPeriod,
            periodStart: now,
            periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
          },
        });
      }
    }

    return ok({
      url: `${origin}/dashboard/settings/billing?success=true&session_id=${demoSessionId}`,
      demo: true,
    });
  }

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
