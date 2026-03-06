/**
 * Payment mode configuration.
 *
 * Controls whether ShipOS uses real Stripe processing or the demo payment
 * processor. Set via the PAYMENT_MODE environment variable.
 *
 * Values:
 *   "live"  — Real Stripe API calls (requires STRIPE_SECRET_KEY)
 *   "demo"  — Dummy payment processor, no real charges (default when Stripe not configured)
 *
 * BAR-185: Demo Mode — Dummy Payment Data
 */

export type PaymentMode = 'demo' | 'live';

/**
 * Returns the current payment mode.
 *
 * Priority:
 *   1. Explicit PAYMENT_MODE env var ("demo" or "live")
 *   2. Falls back to "demo" if STRIPE_SECRET_KEY is not set
 *   3. Falls back to "live" if STRIPE_SECRET_KEY is set
 */
export function getPaymentMode(): PaymentMode {
  const explicit = process.env.PAYMENT_MODE?.toLowerCase();
  if (explicit === 'live' || explicit === 'demo') return explicit;

  // Auto-detect: if Stripe is not configured, default to demo
  return process.env.STRIPE_SECRET_KEY ? 'live' : 'demo';
}

/**
 * Whether the system is in demo payment mode.
 */
export function isDemoMode(): boolean {
  return getPaymentMode() === 'demo';
}

/**
 * Whether the system is in live payment mode with Stripe configured.
 */
export function isLiveMode(): boolean {
  return getPaymentMode() === 'live';
}

/**
 * Client-safe payment mode flag.
 * Use NEXT_PUBLIC_PAYMENT_MODE so the badge renders on the client.
 */
export function getClientPaymentMode(): PaymentMode {
  const explicit =
    (typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_PAYMENT_MODE
      : process.env.PAYMENT_MODE
    )?.toLowerCase();

  if (explicit === 'live' || explicit === 'demo') return explicit;

  // On client we can't check STRIPE_SECRET_KEY, so default to demo
  // unless explicitly set to live
  return 'demo';
}
