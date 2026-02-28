/**
 * Franchise pricing — hierarchical overrides (franchise → location).
 *
 * BAR-307: PMB Plan Features
 */

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface TierPricingOverride {
  priceMonthly?: number;
  priceAnnual?: number;
  annualDiscountPct?: number;
  overageMailRate?: number;
  overageScanRate?: number;
  overageStorageRate?: number;
  overageForwardingRate?: number;
  overagePackageRate?: number;
}

export interface FranchisePricingMap {
  [tierSlug: string]: TierPricingOverride;
}

export interface ResolvedTierPricing {
  tierSlug: string;
  source: 'default' | 'franchise' | 'location';
  priceMonthly: number;
  priceAnnual: number;
  annualDiscountPct: number;
  overageMailRate: number;
  overageScanRate: number;
  overageStorageRate: number;
  overageForwardingRate: number;
  overagePackageRate: number;
}

/* ── Pricing Resolution ────────────────────────────────────────────────────── */

/**
 * Resolve tier pricing with franchise/location overrides.
 *
 * Priority: location override > franchise override > tenant default
 */
export function resolveTierPricing(
  defaultPricing: {
    priceMonthly: number;
    priceAnnual: number;
    annualDiscountPct: number;
    overageMailRate: number;
    overageScanRate: number;
    overageStorageRate: number;
    overageForwardingRate: number;
    overagePackageRate: number;
  },
  tierSlug: string,
  franchisePricing: FranchisePricingMap | null,
  locationPricing: FranchisePricingMap | null,
): ResolvedTierPricing {
  // Start with defaults
  let resolved: ResolvedTierPricing = {
    tierSlug,
    source: 'default',
    ...defaultPricing,
  };

  // Apply franchise-level overrides
  if (franchisePricing && franchisePricing[tierSlug]) {
    const fOverride = franchisePricing[tierSlug];
    resolved = {
      ...resolved,
      source: 'franchise',
      ...(fOverride.priceMonthly !== undefined && { priceMonthly: fOverride.priceMonthly }),
      ...(fOverride.priceAnnual !== undefined && { priceAnnual: fOverride.priceAnnual }),
      ...(fOverride.annualDiscountPct !== undefined && { annualDiscountPct: fOverride.annualDiscountPct }),
      ...(fOverride.overageMailRate !== undefined && { overageMailRate: fOverride.overageMailRate }),
      ...(fOverride.overageScanRate !== undefined && { overageScanRate: fOverride.overageScanRate }),
      ...(fOverride.overageStorageRate !== undefined && { overageStorageRate: fOverride.overageStorageRate }),
      ...(fOverride.overageForwardingRate !== undefined && { overageForwardingRate: fOverride.overageForwardingRate }),
      ...(fOverride.overagePackageRate !== undefined && { overagePackageRate: fOverride.overagePackageRate }),
    };
  }

  // Apply location-level overrides (highest priority)
  if (locationPricing && locationPricing[tierSlug]) {
    const lOverride = locationPricing[tierSlug];
    resolved = {
      ...resolved,
      source: 'location',
      ...(lOverride.priceMonthly !== undefined && { priceMonthly: lOverride.priceMonthly }),
      ...(lOverride.priceAnnual !== undefined && { priceAnnual: lOverride.priceAnnual }),
      ...(lOverride.annualDiscountPct !== undefined && { annualDiscountPct: lOverride.annualDiscountPct }),
      ...(lOverride.overageMailRate !== undefined && { overageMailRate: lOverride.overageMailRate }),
      ...(lOverride.overageScanRate !== undefined && { overageScanRate: lOverride.overageScanRate }),
      ...(lOverride.overageStorageRate !== undefined && { overageStorageRate: lOverride.overageStorageRate }),
      ...(lOverride.overageForwardingRate !== undefined && { overageForwardingRate: lOverride.overageForwardingRate }),
      ...(lOverride.overagePackageRate !== undefined && { overagePackageRate: lOverride.overagePackageRate }),
    };
  }

  return resolved;
}

/**
 * Parse JSON pricing map safely.
 */
export function parsePricingJson(json: string | null): FranchisePricingMap | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as FranchisePricingMap;
  } catch {
    return null;
  }
}

/**
 * Build a pricing change record for the audit trail.
 */
export function buildPricingAuditEntry(
  tierSlug: string,
  field: string,
  oldValue: string | number | null,
  newValue: string | number,
): { tierSlug: string; field: string; oldValue: string | null; newValue: string } {
  return {
    tierSlug,
    field,
    oldValue: oldValue != null ? String(oldValue) : null,
    newValue: String(newValue),
  };
}
