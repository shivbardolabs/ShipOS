/**
 * PMB Add-on pricing with prorated mid-cycle calculations.
 *
 * BAR-307: PMB Plan Features
 */

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface AddOnProrateResult {
  originalPrice: number;
  daysInPeriod: number;
  daysRemaining: number;
  proratedPrice: number;
  description: string;
}

/* ── Proration ─────────────────────────────────────────────────────────────── */

/**
 * Calculate prorated add-on charge for mid-cycle activation.
 *
 * @param monthlyPrice - Full monthly price of the add-on
 * @param activationDate - When the add-on is being activated
 * @param periodEnd - End of the current billing period
 * @returns Prorated pricing details
 */
export function calculateAddOnProration(
  monthlyPrice: number,
  activationDate: Date,
  periodEnd: Date,
): AddOnProrateResult {
  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);

  const daysInPeriod = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (periodEnd.getTime() - activationDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const dailyRate = monthlyPrice / daysInPeriod;
  const proratedPrice = Math.round(dailyRate * daysRemaining * 100) / 100;

  return {
    originalPrice: monthlyPrice,
    daysInPeriod,
    daysRemaining,
    proratedPrice,
    description: `Prorated: $${proratedPrice.toFixed(2)} for ${daysRemaining}/${daysInPeriod} days remaining in cycle`,
  };
}

/**
 * Calculate refund for mid-cycle add-on deactivation.
 */
export function calculateAddOnRefund(
  monthlyPrice: number,
  deactivationDate: Date,
  periodEnd: Date,
): { refundAmount: number; daysUnused: number; description: string } {
  const daysUntilEnd = Math.max(
    0,
    Math.ceil(
      (periodEnd.getTime() - deactivationDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const periodStart = new Date(periodEnd);
  periodStart.setMonth(periodStart.getMonth() - 1);
  const daysInPeriod = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  const dailyRate = monthlyPrice / daysInPeriod;
  const refundAmount = Math.round(dailyRate * daysUntilEnd * 100) / 100;

  return {
    refundAmount,
    daysUnused: daysUntilEnd,
    description: `Refund: $${refundAmount.toFixed(2)} for ${daysUntilEnd} unused days`,
  };
}

/* ── Default Add-ons ───────────────────────────────────────────────────────── */

export interface DefaultAddOn {
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  unit: string;
  quotaType: string;
  quotaAmount: number;
}

export const DEFAULT_ADDONS: DefaultAddOn[] = [
  {
    name: 'Extra Scan Package',
    slug: 'extra-scans',
    description: '25 additional scan pages per month',
    priceMonthly: 4.99,
    priceAnnual: 49.99,
    unit: 'month',
    quotaType: 'scans',
    quotaAmount: 25,
  },
  {
    name: 'Priority Forwarding',
    slug: 'priority-forwarding',
    description: '5 priority mail forwarding per month with tracking',
    priceMonthly: 9.99,
    priceAnnual: 99.99,
    unit: 'month',
    quotaType: 'forwarding',
    quotaAmount: 5,
  },
  {
    name: 'Extended Storage',
    slug: 'extended-storage',
    description: 'Extend free storage period by 30 additional days',
    priceMonthly: 3.99,
    priceAnnual: 39.99,
    unit: 'month',
    quotaType: 'storageDays',
    quotaAmount: 30,
  },
  {
    name: 'Document Shredding',
    slug: 'doc-shredding',
    description: '20 document shredding per month (NAID-certified)',
    priceMonthly: 7.99,
    priceAnnual: 79.99,
    unit: 'month',
    quotaType: 'shredding',
    quotaAmount: 20,
  },
  {
    name: 'Additional Recipient',
    slug: 'additional-recipient',
    description: 'Add one more authorized mail recipient to your PMB',
    priceMonthly: 5.99,
    priceAnnual: 59.99,
    unit: 'month',
    quotaType: 'recipients',
    quotaAmount: 1,
  },
];
