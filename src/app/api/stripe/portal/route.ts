import { NextRequest } from 'next/server';
import { withApiHandler, ok, badRequest, ApiError } from '@/lib/api-utils';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { isDemoMode } from '@/lib/payment-mode';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session for managing billing.
 *
 * In demo mode, redirects back to the billing settings page.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  // Demo mode: redirect back to billing settings (no Stripe portal)
  if (isDemoMode()) {
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    return ok({
      url: `${origin}/dashboard/settings/billing?demo_portal=true`,
      demo: true,
      message: 'Demo mode — Stripe Customer Portal is not available. Manage billing in-app.',
    });
  }

  if (!isStripeConfigured()) {
    throw new ApiError('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.', 503);
  }

  const stripe = getStripe()!;

  const tenant = user.tenantId
    ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
    : null;

  if (!tenant?.stripeCustomerId) {
    badRequest('No Stripe customer found. Please subscribe to a plan first.');
  }

  const origin = request.headers.get('origin') || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${origin}/dashboard/settings/billing`,
  });

  return ok({ url: session.url });
});
