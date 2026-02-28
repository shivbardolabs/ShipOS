/**
 * BAR-331: Smart Intake Label Data Extraction — Type Definitions
 *
 * Shared types for the extraction rules engine.
 */

/* ── Supported carriers ─────────────────────────────────────────────────── */

export const SUPPORTED_CARRIERS = [
  'amazon',
  'ups',
  'fedex',
  'usps',
  'dhl',
  'lasership',
  'ontrac',
  'other',
] as const;

export type SupportedCarrier = (typeof SUPPORTED_CARRIERS)[number];

/* ── Service types ──────────────────────────────────────────────────────── */

export const SERVICE_TYPES = [
  'pmb_customer',     // PMB / Suite / Mailbox customer
  'ipostal',          // iPostal1 digital mailbox platform
  'ups_access_point', // UPS Access Point (store is pickup location)
  'fedex_hal',        // FedEx Hold At Location
  'kinek',            // Kinek package pickup point
  'amazon_hub',       // Amazon Hub Counter / Locker
  'general_delivery', // Regular delivery — no special program
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

/* ── Raw AI extraction result (from GPT-4o vision) ──────────────────────── */

export interface RawVisionResult {
  carrier?: string;
  trackingNumber?: string;
  senderName?: string;
  senderAddress?: string;
  recipientName?: string;
  recipientAddress?: string;
  pmbNumber?: string;
  packageSize?: string;
  confidence?: number;
  /** Any additional text the AI extracted from the label */
  rawLabelText?: string;
}

/* ── Processed extraction result ────────────────────────────────────────── */

export interface ExtractionResult {
  /** Identified carrier (validated & normalized) */
  carrier: SupportedCarrier;
  /** Carrier detection confidence */
  carrierConfidence: 'high' | 'medium' | 'low';
  /** How carrier was identified */
  carrierMatchedRule: string;

  /** Extracted & validated tracking number */
  trackingNumber: string;
  /** Whether tracking number passes carrier-specific validation */
  trackingNumberValid: boolean;
  /** Tracking validation details */
  trackingValidationRule: string;

  /** Parsed recipient name (cleaned) */
  recipientName: string;
  /** Whether this appears to be a business (vs personal) name */
  recipientIsBusiness: boolean;
  /** Original raw name before parsing */
  recipientNameRaw: string;

  /** Detected service type / program */
  serviceType: ServiceType;
  /** How service type was detected */
  serviceTypeMatchedRule: string;

  /** PMB / Suite / Box number if detected */
  pmbNumber: string;

  /** Sender name (pass-through, cleaned) */
  senderName: string;
  /** Sender address (pass-through) */
  senderAddress: string;

  /** Estimated package size */
  packageSize: string;

  /** Overall extraction confidence (0-1) */
  confidence: number;
}

/* ── Validation report for a single field ───────────────────────────────── */

export interface FieldValidation {
  field: string;
  valid: boolean;
  original: string;
  corrected: string;
  rule: string;
}
