import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for a plan subscription.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.' },
        { status: 503 },
      );
    }

    const stripe = getStripe()!;
    const { priceId, planId } = await req.json();

    if (!priceId || !planId) {
      return NextResponse.json({ error: 'priceId and planId are required' }, { status: 400 });
    }

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

    const origin = req.headers.get('origin') || 'http://localhost:3000';

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

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[POST /api/stripe/checkout]', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
