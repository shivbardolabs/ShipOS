/**
 * BAR-230: Non-Compliant ID Detection
 *
 * Competitive advantage feature — identifies common mistakes when customers
 * present IDs that are NOT acceptable for PS Form 1583.
 *
 * Ref: USPS PS1583 acceptable identification list
 */

export interface NonCompliantIdRule {
  id: string;
  name: string;
  reason: string;
  suggestion: string;
  category: 'rejected' | 'expired' | 'warning';
}

/**
 * IDs that are commonly presented but NOT acceptable for PS1583.
 * These should be flagged immediately during onboarding.
 */
export const NON_COMPLIANT_IDS: NonCompliantIdRule[] = [
  {
    id: 'hunting_license',
    name: 'Hunting / Firearm License',
    reason: 'Hunting and firearm licenses are not accepted as valid identification for PS Form 1583.',
    suggestion: "Please provide a valid driver's license, passport, or other USPS-accepted photo ID.",
    category: 'rejected',
  },
  {
    id: 'va_health_insurance',
    name: 'Veterans (VA) Health Insurance Card',
    reason: 'VA health insurance cards are not accepted as valid identification for PS Form 1583. Note: A VA-issued photo ID card IS accepted.',
    suggestion: 'If available, a military/uniformed service photo ID card is accepted. Otherwise, provide a different primary photo ID.',
    category: 'rejected',
  },
  {
    id: 'utility_bill',
    name: 'Utility Bill',
    reason: 'Utility bills are not accepted as identification for PS Form 1583.',
    suggestion: 'For proof of address, use a current lease, insurance policy, mortgage, or vehicle registration instead.',
    category: 'rejected',
  },
  {
    id: 'bank_statement',
    name: 'Credit Card or Bank Statement',
    reason: 'Bank statements and credit card statements are not accepted as identification. Note: A physical credit/debit card IS accepted as secondary ID.',
    suggestion: 'Present the physical credit or debit card as a secondary ID, not a paper statement.',
    category: 'rejected',
  },
  {
    id: 'phone_bill',
    name: 'Phone Bill',
    reason: 'Phone bills are not accepted as identification for PS Form 1583.',
    suggestion: "Use an accepted secondary ID such as a voter registration card, social security card, or credit card.",
    category: 'rejected',
  },
  {
    id: 'corporate_badge',
    name: 'Corporate Badge (No Photo)',
    reason: 'A corporate badge without a photo is not accepted. Only corporate photo ID cards are accepted as primary identification.',
    suggestion: 'The corporate ID must have a clear photograph. If it does not, provide a different primary photo ID.',
    category: 'rejected',
  },
  {
    id: 'gym_membership',
    name: 'Gym / Club Membership Card',
    reason: 'Gym and club membership cards are not government-issued and are not accepted.',
    suggestion: "Provide a government-issued photo ID such as a driver's license or passport.",
    category: 'rejected',
  },
  {
    id: 'library_card',
    name: 'Library Card',
    reason: 'Library cards are not accepted as identification for PS Form 1583.',
    suggestion: "Provide a government-issued photo ID such as a driver's license or passport.",
    category: 'rejected',
  },
  {
    id: 'costco_card',
    name: 'Retail / Wholesale Club Card',
    reason: 'Store membership cards (Costco, Sam\'s Club, etc.) are not accepted as identification.',
    suggestion: "Provide a government-issued photo ID or an accepted secondary ID.",
    category: 'rejected',
  },
  {
    id: 'medical_card',
    name: 'Health Insurance Card (non-VA)',
    reason: 'Health insurance cards are not accepted as identification for PS Form 1583.',
    suggestion: "Provide a government-issued photo ID or an accepted secondary ID.",
    category: 'rejected',
  },
];

/**
 * Check if a date string represents an expired ID.
 * Also warns if expiring within 6 months (BAR-230 requirement).
 */
export function checkIdExpiration(expirationDate: string): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
  message?: string;
} {
  if (!expirationDate) return { isExpired: false, isExpiringSoon: false, daysUntilExpiry: Infinity };

  const expDate = new Date(expirationDate + 'T23:59:59');
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      isExpired: true,
      isExpiringSoon: false,
      daysUntilExpiry,
      message: `This ID expired ${Math.abs(daysUntilExpiry)} days ago. An expired ID cannot be used for PS Form 1583.`,
    };
  }

  if (daysUntilExpiry <= 180) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      daysUntilExpiry,
      message: `This ID expires in ${daysUntilExpiry} days (within 6 months). The customer should be advised to renew.`,
    };
  }

  return { isExpired: false, isExpiringSoon: false, daysUntilExpiry };
}

/**
 * Find a non-compliant ID by its id string.
 */
export function findNonCompliantId(idType: string): NonCompliantIdRule | undefined {
  return NON_COMPLIANT_IDS.find((rule) => rule.id === idType);
}
