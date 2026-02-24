/**
 * Stripe client initialization.
 *
 * Gracefully degrades when STRIPE_SECRET_KEY is not set — every caller
 * should check for null before using the client.
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Returns a configured Stripe client, or null if the secret key is not set.
 * Always check the return value before calling Stripe APIs.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Whether Stripe is configured and ready to use.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * The Stripe webhook signing secret.
 */
export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}
