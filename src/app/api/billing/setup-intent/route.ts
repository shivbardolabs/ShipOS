import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/billing/setup-intent
 *
 * Creates a Stripe SetupIntent for securely adding a payment method.
 * Returns the client_secret needed by the frontend to collect card details
 * via Stripe Elements (PCI-compliant — card data never touches our servers).
 */
export async function POST() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.' },
        { status: 503 },
      );
    }

    const stripe = getStripe()!;

    // Get or create Stripe customer for this tenant
    let tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let stripeCustomerId = tenant.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: tenant.name,
        metadata: {
          tenantId: tenant.id,
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        tenantId: tenant.id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    });
  } catch (err) {
    console.error('[POST /api/billing/setup-intent]', err);
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 });
  }
}
