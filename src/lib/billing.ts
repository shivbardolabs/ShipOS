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

/* ── BAR-305: Billing Model Configuration ─────────────────────────────────── */

/**
 * Supported billing model types.
 * A tenant can enable one or more; a customer can be assigned a combination.
 */
export type BillingModelType =
  | 'subscription'
  | 'usage'
  | 'tos'
  | 'subscription+usage'
  | 'subscription+tos'
  | 'all';

/**
 * Human-friendly labels for billing models.
 */
export const BILLING_MODEL_LABELS: Record<BillingModelType, string> = {
  subscription: 'Subscription Only',
  usage: 'Usage-Based Only',
  tos: 'Time-of-Service Only',
  'subscription+usage': 'Subscription + Usage',
  'subscription+tos': 'Subscription + Time-of-Service',
  all: 'All Models',
};

/**
 * Rate tier for usage-based billing.
 */
export interface RateTier {
  upTo: number | null; // null = unlimited (last tier)
  rate: number; // cost per unit
}

/**
 * Calculate cost for a given quantity using tiered pricing.
 *
 * @param tiers - Rate tiers in ascending order
 * @param quantity - Total units to price
 * @param includedFree - Free units before pricing kicks in
 * @returns Total cost
 */
export function calculateTieredUsageCost(
  tiers: RateTier[],
  quantity: number,
  includedFree: number = 0,
): { cost: number; breakdown: { tier: RateTier; units: number; subtotal: number }[] } {
  const billableQty = Math.max(0, quantity - includedFree);
  if (billableQty === 0 || tiers.length === 0) {
    return { cost: 0, breakdown: [] };
  }

  let remaining = billableQty;
  let prevCeiling = 0;
  const breakdown: { tier: RateTier; units: number; subtotal: number }[] = [];

  for (const tier of tiers) {
    if (remaining <= 0) break;

    const ceiling = tier.upTo ?? Infinity;
    const tierCapacity = ceiling - prevCeiling;
    const usedInTier = Math.min(remaining, tierCapacity);
    const subtotal = usedInTier * tier.rate;

    breakdown.push({ tier, units: usedInTier, subtotal });
    remaining -= usedInTier;
    prevCeiling = ceiling;
  }

  const cost = Math.round(breakdown.reduce((s, b) => s + b.subtotal, 0) * 100) / 100;
  return { cost, breakdown };
}

/**
 * Default usage meters available for new tenants.
 */
export const DEFAULT_USAGE_METERS = [
  {
    name: 'Package Scans',
    slug: 'package_scans',
    unit: 'scan',
    description: 'AI-powered package scanning and check-in',
    rateTiers: [
      { upTo: 100, rate: 0 },
      { upTo: 500, rate: 0.10 },
      { upTo: null, rate: 0.05 },
    ],
    includedQuantity: 100,
  },
  {
    name: 'SMS Notifications',
    slug: 'sms_notifications',
    unit: 'message',
    description: 'Outbound SMS notifications to customers',
    rateTiers: [
      { upTo: 200, rate: 0 },
      { upTo: null, rate: 0.03 },
    ],
    includedQuantity: 200,
  },
  {
    name: 'Storage Days',
    slug: 'storage_days',
    unit: 'day',
    description: 'Package storage beyond free period',
    rateTiers: [{ upTo: null, rate: 1.0 }],
    includedQuantity: 0,
  },
];
