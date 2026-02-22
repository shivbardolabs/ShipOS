/**
 * USPS Acceptable Forms of Identification for PS Form 1583
 * Source: https://faq.usps.com/articles/Knowledge/Acceptable-Form-of-Identification
 *
 * Two forms of ID are required:
 *   - At least ONE must be a primary (photo) ID
 *   - The second can be primary or secondary
 */

import type { AcceptableIdType } from './types';

export const USPS_PRIMARY_IDS: AcceptableIdType[] = [
  {
    id: 'drivers_license',
    name: "Valid driver's license or state non-driver's ID card",
    category: 'primary',
    description: 'Issued by a U.S. state, territory, or the District of Columbia',
    hasExpiration: true,
  },
  {
    id: 'armed_forces_id',
    name: 'Armed forces, government, or university ID card',
    category: 'primary',
    description: 'Military ID, government employee ID, or college/university ID with photo',
    hasExpiration: true,
  },
  {
    id: 'passport',
    name: 'Passport (U.S. or foreign)',
    category: 'primary',
    description: 'Valid U.S. or foreign government-issued passport',
    hasExpiration: true,
  },
  {
    id: 'alien_registration',
    name: 'Alien registration card or certificate of naturalization',
    category: 'primary',
    description: 'USCIS-issued alien registration or naturalization certificate',
    hasExpiration: true,
  },
  {
    id: 'certificate_of_citizenship',
    name: 'Certificate of citizenship',
    category: 'primary',
    description: 'USCIS-issued certificate of citizenship',
    hasExpiration: false,
  },
  {
    id: 'corporate_id',
    name: 'Corporate ID (photo)',
    category: 'primary',
    description: 'Company-issued photo ID card',
    hasExpiration: true,
  },
];

export const USPS_SECONDARY_IDS: AcceptableIdType[] = [
  {
    id: 'social_security_card',
    name: 'Social Security Card (non-metal replica)',
    category: 'secondary',
    description: 'Original SSA-issued Social Security card',
    hasExpiration: false,
  },
  {
    id: 'credit_card',
    name: 'Credit card, debit card, or charge card',
    category: 'secondary',
    description: 'Major bank-issued credit or debit card',
    hasExpiration: true,
  },
  {
    id: 'birth_certificate',
    name: 'Birth certificate (certified)',
    category: 'secondary',
    description: 'Certified copy of birth certificate issued by a government entity',
    hasExpiration: false,
  },
  {
    id: 'voter_registration',
    name: 'Voter registration card',
    category: 'secondary',
    description: 'Current voter registration card',
    hasExpiration: false,
  },
  {
    id: 'vehicle_registration',
    name: 'Current lease, mortgage, or deed of trust',
    category: 'secondary',
    description: 'Current vehicle registration, lease agreement, mortgage, or deed of trust',
    hasExpiration: false,
  },
  {
    id: 'home_utility_bill',
    name: 'Home or vehicle insurance policy',
    category: 'secondary',
    description: 'Current home/vehicle insurance policy or utility bill',
    hasExpiration: false,
  },
  {
    id: 'form_w2',
    name: 'Form W-2 (tax)',
    category: 'secondary',
    description: 'Most recent W-2 tax form',
    hasExpiration: false,
  },
  {
    id: 'property_tax',
    name: 'Property tax receipt',
    category: 'secondary',
    description: 'Current property tax receipt or assessment',
    hasExpiration: false,
  },
];

export const ALL_USPS_IDS = [...USPS_PRIMARY_IDS, ...USPS_SECONDARY_IDS];

/** Validate that two ID selections meet USPS requirements */
export function validateIdPair(
  primaryIdTypeId: string,
  secondaryIdTypeId: string
): { valid: boolean; error?: string } {
  if (!primaryIdTypeId) return { valid: false, error: 'Primary ID is required' };
  if (!secondaryIdTypeId) return { valid: false, error: 'Second form of ID is required' };
  if (primaryIdTypeId === secondaryIdTypeId) return { valid: false, error: 'Two different forms of ID are required' };

  const primaryId = ALL_USPS_IDS.find((id) => id.id === primaryIdTypeId);
  if (!primaryId || primaryId.category !== 'primary') {
    return { valid: false, error: 'First ID must be a primary (photo) identification' };
  }

  return { valid: true };
}
