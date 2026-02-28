/**
 * PMB Plan Tier logic — annual/monthly billing, discount calculations,
 * plan comparison, and tier management.
 *
 * BAR-307: PMB Plan Features
 */

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface PlanTierSummary {
  slug: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  annualDiscountPct: number;
  annualSavings: number; // Dollar amount saved per year
  includedMailItems: number;
  includedScans: number;
  freeStorageDays: number;
  includedForwarding: number;
  includedShredding: number;
  maxRecipients: number;
  maxPackagesPerMonth: number;
}

export interface AnnualComparisonResult {
  monthlyTotal: number; // 12 × priceMonthly
  annualTotal: number;  // priceAnnual
  savings: number;      // monthlyTotal - annualTotal
  savingsPct: number;   // savings / monthlyTotal × 100
}

/* ── Annual vs Monthly ─────────────────────────────────────────────────────── */

/**
 * Calculate annual savings when comparing monthly vs annual billing.
 */
export function calculateAnnualSavings(
  priceMonthly: number,
  priceAnnual: number,
): AnnualComparisonResult {
  const monthlyTotal = priceMonthly * 12;
  const annualTotal = priceAnnual;
  const savings = Math.max(0, monthlyTotal - annualTotal);
  const savingsPct = monthlyTotal > 0
    ? Math.round((savings / monthlyTotal) * 10000) / 100
    : 0;

  return { monthlyTotal, annualTotal, savings, savingsPct };
}

/**
 * Calculate the prorated amount when converting between billing cycles mid-period.
 *
 * @param currentPrice - Current cycle price being paid
 * @param newPrice - New cycle price
 * @param daysUsed - Days already consumed in current period
 * @param totalDays - Total days in current period
 * @returns Prorated credit/charge
 */
export function calculateBillingCycleConversion(
  currentPrice: number,
  newPrice: number,
  daysUsed: number,
  totalDays: number,
): { credit: number; charge: number; netAmount: number; description: string } {
  const daysRemaining = Math.max(0, totalDays - daysUsed);
  const dailyCurrent = currentPrice / totalDays;
  const dailyNew = newPrice / totalDays;

  const credit = Math.round(dailyCurrent * daysRemaining * 100) / 100;
  const charge = Math.round(dailyNew * daysRemaining * 100) / 100;
  const netAmount = Math.round((charge - credit) * 100) / 100;

  const direction = netAmount >= 0 ? 'charge' : 'credit';
  const description = `Billing cycle conversion: $${Math.abs(netAmount).toFixed(2)} ${direction} for ${daysRemaining} remaining days`;

  return { credit, charge, netAmount, description };
}

/* ── Default PMB Plan Tiers ────────────────────────────────────────────────── */

export interface DefaultPmbTier {
  name: string;
  slug: string;
  priceMonthly: number;
  priceAnnual: number;
  annualDiscountPct: number;
  includedMailItems: number;
  includedScans: number;
  freeStorageDays: number;
  includedForwarding: number;
  includedShredding: number;
  maxRecipients: number;
  maxPackagesPerMonth: number;
  overageMailRate: number;
  overageScanRate: number;
  overageStorageRate: number;
  overageForwardingRate: number;
  overagePackageRate: number;
}

/**
 * Default PMB tiers that can be seeded for new tenants.
 */
export const DEFAULT_PMB_TIERS: DefaultPmbTier[] = [
  {
    name: 'Bronze',
    slug: 'bronze',
    priceMonthly: 9.99,
    priceAnnual: 99.99,
    annualDiscountPct: 17,
    includedMailItems: 30,
    includedScans: 5,
    freeStorageDays: 30,
    includedForwarding: 0,
    includedShredding: 0,
    maxRecipients: 1,
    maxPackagesPerMonth: 20,
    overageMailRate: 0.50,
    overageScanRate: 1.00,
    overageStorageRate: 0.50,
    overageForwardingRate: 2.00,
    overagePackageRate: 2.00,
  },
  {
    name: 'Silver',
    slug: 'silver',
    priceMonthly: 19.99,
    priceAnnual: 199.99,
    annualDiscountPct: 17,
    includedMailItems: 75,
    includedScans: 15,
    freeStorageDays: 30,
    includedForwarding: 2,
    includedShredding: 5,
    maxRecipients: 2,
    maxPackagesPerMonth: 50,
    overageMailRate: 0.40,
    overageScanRate: 0.75,
    overageStorageRate: 0.40,
    overageForwardingRate: 1.50,
    overagePackageRate: 1.50,
  },
  {
    name: 'Gold',
    slug: 'gold',
    priceMonthly: 34.99,
    priceAnnual: 349.99,
    annualDiscountPct: 17,
    includedMailItems: 150,
    includedScans: 30,
    freeStorageDays: 45,
    includedForwarding: 5,
    includedShredding: 15,
    maxRecipients: 3,
    maxPackagesPerMonth: 100,
    overageMailRate: 0.30,
    overageScanRate: 0.50,
    overageStorageRate: 0.30,
    overageForwardingRate: 1.00,
    overagePackageRate: 1.00,
  },
  {
    name: 'Platinum',
    slug: 'platinum',
    priceMonthly: 59.99,
    priceAnnual: 599.99,
    annualDiscountPct: 17,
    includedMailItems: 0, // unlimited (0 = unlimited)
    includedScans: 100,
    freeStorageDays: 60,
    includedForwarding: 10,
    includedShredding: 30,
    maxRecipients: 5,
    maxPackagesPerMonth: 0, // unlimited
    overageMailRate: 0,
    overageScanRate: 0.25,
    overageStorageRate: 0.25,
    overageForwardingRate: 0.75,
    overagePackageRate: 0,
  },
];
