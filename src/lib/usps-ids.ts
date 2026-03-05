/**
 * USPS Acceptable Forms of Identification for PS Form 1583
 * Source: BAR-230 Spec — compliant with USPS PS Form 1583 requirements
 *
 * Two forms of ID are required:
 *   - Primary: Government-issued photo ID
 *   - Secondary: Proof of address / address verification document
 *
 * NOTE: Driver license / nondriver ID may be used for EITHER primary (photo)
 *       or secondary (address), but NOT both simultaneously.
 */

import type { AcceptableIdType } from './types';

/**
 * Primary ID — Government Photo ID
 * Per BAR-230 spec, only these 9 types are acceptable.
 */
export const USPS_PRIMARY_IDS: AcceptableIdType[] = [
  {
    id: 'drivers_license',
    name: 'U.S. State/Territory/Tribal Driver License or Nondriver ID Card',
    category: 'primary',
    description: 'Issued by a U.S. state, territory, or tribal authority',
    hasExpiration: true,
  },
  {
    id: 'uniformed_service_id',
    name: 'Uniformed Service ID',
    category: 'primary',
    description: 'Military / uniformed service photo identification card',
    hasExpiration: true,
  },
  {
    id: 'passport',
    name: 'Passport',
    category: 'primary',
    description: 'Valid U.S. or foreign government-issued passport',
    hasExpiration: true,
  },
  {
    id: 'certificate_of_naturalization',
    name: 'Certificate of Naturalization',
    category: 'primary',
    description: 'USCIS-issued certificate of naturalization',
    hasExpiration: false,
  },
  {
    id: 'us_access_card',
    name: 'U.S. Access Card',
    category: 'primary',
    description: 'U.S. government-issued access card with photo',
    hasExpiration: true,
  },
  {
    id: 'matricula_consular',
    name: 'Matricula Consular (Mexico)',
    category: 'primary',
    description: 'Mexican government-issued consular identification card',
    hasExpiration: true,
  },
  {
    id: 'permanent_resident_card',
    name: 'U.S. Permanent Resident Card',
    category: 'primary',
    description: 'USCIS-issued permanent resident (green) card',
    hasExpiration: true,
  },
  {
    id: 'university_id',
    name: 'U.S. University ID Card',
    category: 'primary',
    description: 'Photo ID card issued by a U.S. university',
    hasExpiration: true,
  },
  {
    id: 'nexus_card',
    name: 'NEXUS Card',
    category: 'primary',
    description: 'Trusted traveler NEXUS program card',
    hasExpiration: true,
  },
];

/**
 * Secondary ID — Proof of Address / Address Verification
 * Per BAR-230 spec, only these 6 types are acceptable.
 *
 * NOTE: Driver license appears in both lists but may only be used for ONE.
 */
export const USPS_SECONDARY_IDS: AcceptableIdType[] = [
  {
    id: 'drivers_license',
    name: 'U.S. State/Territory/Tribal Driver License or Nondriver ID Card',
    category: 'secondary',
    description: 'May be used as address verification if not already used as primary ID',
    hasExpiration: true,
  },
  {
    id: 'current_lease',
    name: 'Current Lease',
    category: 'secondary',
    description: 'Current signed lease agreement showing residential address',
    hasExpiration: false,
  },
  {
    id: 'home_vehicle_insurance',
    name: 'Home or Vehicle Insurance Policy',
    category: 'secondary',
    description: 'Current home or vehicle insurance policy showing address',
    hasExpiration: false,
  },
  {
    id: 'mortgage_deed_of_trust',
    name: 'Mortgage or Deed of Trust',
    category: 'secondary',
    description: 'Mortgage document or deed of trust showing residential address',
    hasExpiration: false,
  },
  {
    id: 'vehicle_registration',
    name: 'Vehicle Registration Card',
    category: 'secondary',
    description: 'Current vehicle registration card showing address',
    hasExpiration: false,
  },
  {
    id: 'voter_registration',
    name: 'Voter Registration Card',
    category: 'secondary',
    description: 'Current voter registration card showing address',
    hasExpiration: false,
  },
];

/** Combined list of all acceptable USPS IDs (deduplicated by id) */
export const ALL_USPS_IDS: AcceptableIdType[] = [
  ...USPS_PRIMARY_IDS,
  ...USPS_SECONDARY_IDS.filter((s) => !USPS_PRIMARY_IDS.some((p) => p.id === s.id)),
];

/**
 * Validate that two ID selections meet USPS requirements.
 *
 * Rules:
 *   1. Primary ID must be from USPS_PRIMARY_IDS
 *   2. Secondary ID must be from USPS_SECONDARY_IDS
 *   3. Driver license/nondriver ID may be used for EITHER, but not both
 */
export function validateIdPair(
  primaryIdTypeId: string,
  secondaryIdTypeId: string
): { valid: boolean; error?: string } {
  if (!primaryIdTypeId) return { valid: false, error: 'Primary ID is required' };
  if (!secondaryIdTypeId) return { valid: false, error: 'Second form of ID is required' };

  if (primaryIdTypeId === secondaryIdTypeId) {
    return {
      valid: false,
      error: 'The same ID type cannot be used for both primary and secondary identification. Driver license / nondriver ID may be used for EITHER photo ID or address verification, but not both.',
    };
  }

  const primaryId = USPS_PRIMARY_IDS.find((id) => id.id === primaryIdTypeId);
  if (!primaryId) {
    return { valid: false, error: 'First ID must be a USPS-accepted primary (photo) identification' };
  }

  const secondaryId = USPS_SECONDARY_IDS.find((id) => id.id === secondaryIdTypeId);
  if (!secondaryId) {
    return { valid: false, error: 'Second ID must be a valid proof of address document' };
  }

  return { valid: true };
}
