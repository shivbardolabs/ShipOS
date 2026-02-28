/**
 * Promotional pricing — code validation, application, and expiry handling.
 *
 * BAR-307: PMB Plan Features
 */

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type DiscountType = 'percent' | 'fixed_amount' | 'free_months';
export type DiscountAppliesTo = 'all' | 'monthly' | 'annual' | 'specific_tier';

export interface PromoCodeConfig {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  discountAppliesTo: DiscountAppliesTo;
  startsAt: Date;
  expiresAt: Date | null;
  maxRedemptions: number; // 0 = unlimited
  maxPerCustomer: number;
  applicableTierSlugs: string[] | null; // null = all
  isActive: boolean;
}

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  description?: string;
}

/* ── Validation ────────────────────────────────────────────────────────────── */

/**
 * Validate a promo code against current conditions.
 */
export function validatePromoCode(
  config: PromoCodeConfig,
  context: {
    currentDate?: Date;
    totalRedemptions: number;
    customerRedemptions: number;
    tierSlug?: string;
    billingCycle?: 'monthly' | 'annual';
    price?: number;
  },
): PromoValidationResult {
  const now = context.currentDate ?? new Date();

  // Check active
  if (!config.isActive) {
    return { valid: false, error: 'This promo code is no longer active' };
  }

  // Check date range
  if (now < config.startsAt) {
    return { valid: false, error: 'This promo code is not yet valid' };
  }
  if (config.expiresAt && now > config.expiresAt) {
    return { valid: false, error: 'This promo code has expired' };
  }

  // Check redemption limits
  if (config.maxRedemptions > 0 && context.totalRedemptions >= config.maxRedemptions) {
    return { valid: false, error: 'This promo code has reached its redemption limit' };
  }
  if (context.customerRedemptions >= config.maxPerCustomer) {
    return { valid: false, error: 'You have already used this promo code' };
  }

  // Check billing cycle applicability
  if (config.discountAppliesTo === 'monthly' && context.billingCycle === 'annual') {
    return { valid: false, error: 'This promo code only applies to monthly billing' };
  }
  if (config.discountAppliesTo === 'annual' && context.billingCycle === 'monthly') {
    return { valid: false, error: 'This promo code only applies to annual billing' };
  }

  // Check tier applicability
  if (
    config.discountAppliesTo === 'specific_tier' &&
    config.applicableTierSlugs &&
    context.tierSlug &&
    !config.applicableTierSlugs.includes(context.tierSlug)
  ) {
    return { valid: false, error: 'This promo code does not apply to the selected plan' };
  }

  // Calculate discount
  const price = context.price ?? 0;
  const discount = calculateDiscount(config.discountType, config.discountValue, price);

  return {
    valid: true,
    discountAmount: discount.amount,
    description: discount.description,
  };
}

/**
 * Calculate the actual discount amount.
 */
export function calculateDiscount(
  type: DiscountType,
  value: number,
  price: number,
): { amount: number; description: string } {
  switch (type) {
    case 'percent': {
      const amount = Math.round(price * (value / 100) * 100) / 100;
      return { amount, description: `${value}% off — save $${amount.toFixed(2)}` };
    }
    case 'fixed_amount': {
      const amount = Math.min(value, price);
      return { amount, description: `$${amount.toFixed(2)} off` };
    }
    case 'free_months': {
      const amount = Math.round(price * value * 100) / 100;
      return {
        amount,
        description: `${value} month${value > 1 ? 's' : ''} free — save $${amount.toFixed(2)}`,
      };
    }
    default:
      return { amount: 0, description: 'No discount' };
  }
}

/**
 * Format promo code for display (uppercase, trim).
 */
export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
