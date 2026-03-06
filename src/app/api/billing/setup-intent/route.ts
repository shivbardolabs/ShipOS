import { withApiHandler, ok, badRequest, forbidden, notFound, ApiError } from '@/lib/api-utils';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { isDemoMode } from '@/lib/payment-mode';
import { DemoPaymentProcessor } from '@/lib/demo-payment';
import prisma from '@/lib/prisma';

/**
 * POST /api/billing/setup-intent
 *
 * Creates a Stripe SetupIntent for securely adding a payment method.
 * Returns the client_secret needed by the frontend to collect card details
 * via Stripe Elements (PCI-compliant — card data never touches our servers).
 *
 * In demo mode, returns a mock client_secret without calling Stripe.
 */
export const POST = withApiHandler(async (_request, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    forbidden('Admin role required');
  }

  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  // ── Demo mode: return mock SetupIntent ──────────────────────────────────
  if (isDemoMode()) {
    const demo = DemoPaymentProcessor.createSetupIntent(user.tenantId!);
    return ok({
      clientSecret: demo.clientSecret,
      customerId: demo.customerId,
      demo: true,
    });
  }

  // ── Live mode: real Stripe ──────────────────────────────────────────────
  if (!isStripeConfigured()) {
    throw new ApiError('Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.', 503);
  }

  const stripe = getStripe()!;

  // Get or create Stripe customer for this tenant
  let tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
  });

  if (!tenant) {
    notFound('Tenant not found');
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

  return ok({
    clientSecret: setupIntent.client_secret,
    customerId: stripeCustomerId,
  });
});
