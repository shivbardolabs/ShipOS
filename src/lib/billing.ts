/**
 * Subscription billing engine.
 *
 * Defines plan tiers, billing cycle logic, and proration calculations.
 * Works with or without Stripe — falls back to "manual" billing mode.
 */

export interface PlanDefinition {
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxMailboxes: number;
  maxUsers: number;
  maxStores: number;
  features: string[];
  popular?: boolean;
}

/**
 * Default plan definitions. These are seeded into the BillingPlan model
 * and can be overridden in the admin panel.
 */
export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    slug: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    priceYearly: 490,
    maxMailboxes: 100,
    maxUsers: 3,
    maxStores: 1,
    features: [
      'Up to 100 mailboxes',
      'Package check-in & check-out',
      'Customer management',
      'Basic reports',
      'Email notifications',
      'CMRA compliance tools',
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 99,
    priceYearly: 990,
    maxMailboxes: 500,
    maxUsers: 10,
    maxStores: 3,
    features: [
      'Up to 500 mailboxes',
      'Everything in Starter',
      'AI Smart Intake',
      'AI Mail Sort',
      'Multi-store support (up to 3)',
      'Advanced BI reports & CSV export',
      'SMS notifications',
      'Loyalty program',
    ],
    popular: true,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 249,
    priceYearly: 2490,
    maxMailboxes: -1, // unlimited
    maxUsers: -1,
    maxStores: -1,
    features: [
      'Unlimited mailboxes',
      'Everything in Pro',
      'Unlimited stores & users',
      'Field-level encryption',
      'AI Bill Audit',
      'AI Voice Assistant',
      'Priority support',
      'Custom integrations',
      'White-label branding',
    ],
  },
];

/**
 * Calculate prorated amount when switching plans mid-cycle.
 *
 * @param currentPriceMonthly - Current plan's monthly price
 * @param newPriceMonthly - New plan's monthly price
 * @param daysRemaining - Days remaining in current billing period
 * @param totalDaysInPeriod - Total days in the billing period (30 or 365)
 * @returns Prorated credit/charge amount (positive = charge, negative = credit)
 */
export function calculateProration(
  currentPriceMonthly: number,
  newPriceMonthly: number,
  daysRemaining: number,
  totalDaysInPeriod: number = 30,
): { amount: number; description: string } {
  const dailyCurrentRate = currentPriceMonthly / totalDaysInPeriod;
  const dailyNewRate = newPriceMonthly / totalDaysInPeriod;

  // Credit for unused time on current plan
  const credit = dailyCurrentRate * daysRemaining;
  // Charge for remaining time on new plan
  const charge = dailyNewRate * daysRemaining;

  const amount = Math.round((charge - credit) * 100) / 100;

  const description =
    amount > 0
      ? `Prorated upgrade charge: $${amount.toFixed(2)} for ${daysRemaining} remaining days`
      : amount < 0
        ? `Prorated downgrade credit: $${Math.abs(amount).toFixed(2)} for ${daysRemaining} remaining days`
        : 'No proration needed — plans are the same price';

  return { amount, description };
}

/**
 * Calculate storage fees for a package based on days stored.
 *
 * @param checkedInAt - When the package was checked in
 * @param storageRate - Rate per day (from tenant settings)
 * @param freeDays - Free storage days before fees kick in (from tenant settings)
 * @returns Calculated storage fee
 */
export function calculateStorageFee(
  checkedInAt: Date,
  storageRate: number = 1.0,
  freeDays: number = 30,
): { fee: number; daysStored: number; billableDays: number } {
  const now = new Date();
  const daysStored = Math.floor(
    (now.getTime() - new Date(checkedInAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  const billableDays = Math.max(0, daysStored - freeDays);
  const fee = Math.round(billableDays * storageRate * 100) / 100;

  return { fee, daysStored, billableDays };
}

/**
 * Get plan by slug from the default definitions.
 */
export function getPlanBySlug(slug: string): PlanDefinition | undefined {
  return PLAN_DEFINITIONS.find((p) => p.slug === slug);
}
