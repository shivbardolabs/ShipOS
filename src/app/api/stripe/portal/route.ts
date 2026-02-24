import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session for managing billing.
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

    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;

    if (!tenant?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 400 },
      );
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${origin}/dashboard/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[POST /api/stripe/portal]', err);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
