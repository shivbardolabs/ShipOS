/**
 * BAR-98: Fee Calculation Engine
 *
 * Computes storage fees, receiving fees, quota overage fees, and totals
 * for the package checkout workflow.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface FeeConfig {
  /** Per-day storage rate after free period (default $1/day) */
  storageRate: number;
  /** Number of free storage days before fees kick in (default 30) */
  storageFreedays: number;
  /** Whether Sat/Sun count toward storage days (default true) */
  storageCountWeekends: boolean;
  /** Per-package receiving/handling fee (default $3) */
  receivingFeeRate: number;
  /** Monthly package quota — 0 means unlimited */
  packageQuota: number;
  /** Per-package overage fee when quota exceeded */
  packageQuotaOverage: number;
  /** Tax rate as decimal (e.g. 0.0875 for 8.75%) */
  taxRate: number;
}

export interface PackageForFees {
  id: string;
  checkedInAt: Date | string;
  receivingFee: number;
  carrier: string;
  trackingNumber?: string | null;
  packageType: string;
  storageFee: number;
}

export interface PackageFeeBreakdown {
  packageId: string;
  daysHeld: number;
  billableDays: number;
  storageFee: number;
  receivingFee: number;
  quotaFee: number;
  total: number;
}

export interface FeeCalculationResult {
  packages: PackageFeeBreakdown[];
  storageFeeTotal: number;
  receivingFeeTotal: number;
  quotaFeeTotal: number;
  addOnTotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  quotaUsedThisMonth: number;
  quotaLimit: number;
  quotaOverageCount: number;
}

export interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

/* -------------------------------------------------------------------------- */
/*  Default fee configuration                                                 */
/* -------------------------------------------------------------------------- */

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  storageRate: 1.0,
  storageFreedays: 30,
  storageCountWeekends: true,
  receivingFeeRate: 3.0,
  packageQuota: 0,
  packageQuotaOverage: 2.0,
  taxRate: 0.0875,
};

/* -------------------------------------------------------------------------- */
/*  Day counting                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Count the number of days between two dates, optionally excluding weekends.
 */
export function countDays(
  from: Date,
  to: Date,
  countWeekends: boolean,
): number {
  if (to <= from) return 0;

  if (countWeekends) {
    return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  }

  // Exclude Sat (6) and Sun (0)
  let days = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor < end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/* -------------------------------------------------------------------------- */
/*  Fee calculator                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Calculate all fees for the selected packages.
 *
 * @param packages      - The packages being checked out
 * @param config        - Store/tenant fee configuration
 * @param monthlyCount  - Number of packages already received this calendar month
 * @param addOnTotal    - Sum of any add-on service charges
 * @param now           - Reference date (defaults to Date.now())
 */
export function calculateFees(
  packages: PackageForFees[],
  config: FeeConfig,
  monthlyCount: number,
  addOnTotal: number = 0,
  now: Date = new Date(),
): FeeCalculationResult {
  const quotaLimit = config.packageQuota;
  let quotaUsedThisMonth = monthlyCount;
  let quotaOverageCount = 0;

  const packageBreakdowns: PackageFeeBreakdown[] = packages.map((pkg) => {
    const checkedIn = new Date(pkg.checkedInAt);
    const daysHeld = countDays(checkedIn, now, true);
    const billableDays = countDays(
      checkedIn,
      now,
      config.storageCountWeekends,
    );

    // Storage fee: days beyond free period × rate
    const storageBillable = Math.max(0, billableDays - config.storageFreedays);
    const storageFee = storageBillable * config.storageRate;

    // Receiving fee: per-package flat rate
    const receivingFee = config.receivingFeeRate;

    // Quota fee: check if this package exceeds monthly quota
    let quotaFee = 0;
    if (quotaLimit > 0) {
      quotaUsedThisMonth++;
      if (quotaUsedThisMonth > quotaLimit) {
        quotaFee = config.packageQuotaOverage;
        quotaOverageCount++;
      }
    }

    return {
      packageId: pkg.id,
      daysHeld,
      billableDays,
      storageFee,
      receivingFee,
      quotaFee,
      total: storageFee + receivingFee + quotaFee,
    };
  });

  const storageFeeTotal = packageBreakdowns.reduce((s, p) => s + p.storageFee, 0);
  const receivingFeeTotal = packageBreakdowns.reduce((s, p) => s + p.receivingFee, 0);
  const quotaFeeTotal = packageBreakdowns.reduce((s, p) => s + p.quotaFee, 0);

  const subtotal = storageFeeTotal + receivingFeeTotal + quotaFeeTotal + addOnTotal;
  const taxAmount = Math.round(subtotal * config.taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    packages: packageBreakdowns,
    storageFeeTotal,
    receivingFeeTotal,
    quotaFeeTotal,
    addOnTotal,
    subtotal,
    taxRate: config.taxRate,
    taxAmount,
    total,
    quotaUsedThisMonth,
    quotaLimit,
    quotaOverageCount,
  };
}

/* -------------------------------------------------------------------------- */
/*  Line-item generation for invoices / receipts                              */
/* -------------------------------------------------------------------------- */

export function buildLineItems(result: FeeCalculationResult): LineItem[] {
  const items: LineItem[] = [];

  // Group storage fees
  const storagePkgs = result.packages.filter((p) => p.storageFee > 0);
  if (storagePkgs.length > 0) {
    for (const pkg of storagePkgs) {
      items.push({
        description: `Storage fee — ${pkg.billableDays} days held (Package ${pkg.packageId.slice(-6)})`,
        qty: 1,
        unitPrice: pkg.storageFee,
        total: pkg.storageFee,
      });
    }
  }

  // Receiving fees
  if (result.receivingFeeTotal > 0) {
    items.push({
      description: 'Package receiving/handling fee',
      qty: result.packages.length,
      unitPrice: result.packages[0]?.receivingFee ?? 0,
      total: result.receivingFeeTotal,
    });
  }

  // Quota overage
  if (result.quotaFeeTotal > 0) {
    items.push({
      description: `Monthly quota overage (${result.quotaOverageCount} pkg(s) over limit of ${result.quotaLimit})`,
      qty: result.quotaOverageCount,
      unitPrice: result.packages.find((p) => p.quotaFee > 0)?.quotaFee ?? 0,
      total: result.quotaFeeTotal,
    });
  }

  // Add-ons
  if (result.addOnTotal > 0) {
    items.push({
      description: 'Add-on services',
      qty: 1,
      unitPrice: result.addOnTotal,
      total: result.addOnTotal,
    });
  }

  return items;
}
