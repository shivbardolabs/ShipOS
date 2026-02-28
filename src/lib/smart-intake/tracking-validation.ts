/**
 * BAR-331: Tracking Number Validation & Extraction
 *
 * Per-carrier regex validation, normalization, and extraction from raw text.
 *
 * Tracking number formats:
 * - UPS:       1Z + 16 alphanumeric (e.g. 1Z999AA10123456784)
 * - USPS:      20-34 digits, prefixes 92/93/94/420, or international (EA/EC + 9d + US)
 * - FedEx:     12, 15, 20, or 22 digits
 * - Amazon:    TBA + 10-15 digits
 * - DHL:       JD + 18+ digits, or 10 digits, or 3 letters + 7 digits
 * - LaserShip: 1LS/LS/LX + 10-12+ digits
 * - OnTrac:    C + 8-14 digits, or D + 14 digits
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface TrackingValidation {
  /** Cleaned tracking number */
  trackingNumber: string;
  /** Whether it matches a known pattern for the given carrier */
  valid: boolean;
  /** Description of the validation rule applied */
  rule: string;
  /** Suggested corrections applied (e.g. stripped spaces, fixed prefix) */
  corrections: string[];
}

/* ── Per-carrier validation rules ───────────────────────────────────────── */

interface CarrierTrackingRule {
  pattern: RegExp;
  description: string;
}

const CARRIER_RULES: Record<string, CarrierTrackingRule[]> = {
  ups: [
    { pattern: /^1Z[A-Z0-9]{16}$/i, description: '1Z + 16 alphanumeric' },
    { pattern: /^(T|J)\d{10}$/, description: 'T/J + 10 digits (Mail Innovations)' },
    { pattern: /^K\d{10}$/, description: 'K + 10 digits (SurePost)' },
  ],

  amazon: [
    { pattern: /^TBA\d{10,15}$/i, description: 'TBA + 10-15 digits' },
  ],

  fedex: [
    { pattern: /^\d{12}$/, description: '12 digits (Express)' },
    { pattern: /^\d{15}$/, description: '15 digits (Ground)' },
    { pattern: /^\d{20}$/, description: '20 digits (Ground 96)' },
    { pattern: /^\d{22}$/, description: '22 digits (SmartPost)' },
    { pattern: /^(96\d{2})\d{16,18}$/, description: '96xx + 16-18 digits (Ground 96 with prefix)' },
    { pattern: /^DT\d{12}$/i, description: 'DT + 12 digits (Door Tag)' },
  ],

  usps: [
    { pattern: /^(94|93|92)\d{18,22}$/, description: '92/93/94 + 18-22 digits' },
    { pattern: /^(70|71|72|73|74|75|76|77|78|79)\d{18,}$/, description: '70-79 + 18+ digits' },
    { pattern: /^(EA|EC|CP|RA|RF|EJ)\d{9}US$/i, description: 'International (XX + 9d + US)' },
    { pattern: /^420\d{5}(92|93|94)\d{18,22}$/, description: '420+ZIP + tracking (Intelligent Mail)' },
    { pattern: /^9[1-5]\d{19,25}$/, description: '9x + 19-25 digits (Priority/First Class)' },
    { pattern: /^\d{20,34}$/, description: '20-34 digits (generic USPS)' },
  ],

  dhl: [
    { pattern: /^JD\d{18,22}$/, description: 'JD + 18-22 digits (eCommerce)' },
    { pattern: /^\d{10}$/, description: '10 digits (Express)' },
    { pattern: /^[A-Z]{3}\d{7}$/, description: '3 letters + 7 digits (waybill)' },
    { pattern: /^GM\d{16,}$/i, description: 'GM + 16+ digits (Global Mail)' },
    { pattern: /^\d{4}\s?\d{4}\s?\d{2}$/, description: '10 digits grouped (Express)' },
  ],

  lasership: [
    { pattern: /^1LS\d{12,}$/i, description: '1LS + 12+ digits' },
    { pattern: /^LS\d{10,}$/i, description: 'LS + 10+ digits' },
    { pattern: /^LX\d{10,}$/i, description: 'LX + 10+ digits' },
  ],

  ontrac: [
    { pattern: /^C\d{8,14}$/, description: 'C + 8-14 digits' },
    { pattern: /^D\d{14}$/, description: 'D + 14 digits' },
  ],
};

/* ── Normalization ──────────────────────────────────────────────────────── */

/**
 * Clean and normalize a tracking number:
 * - Trim whitespace
 * - Remove embedded spaces, dashes, dots
 * - Uppercase
 */
function normalizeTracking(raw: string): { cleaned: string; corrections: string[] } {
  const corrections: string[] = [];
  let cleaned = raw.trim();

  // Remove embedded spaces
  if (/\s/.test(cleaned)) {
    cleaned = cleaned.replace(/\s+/g, '');
    corrections.push('Removed embedded spaces');
  }

  // Remove dashes (common in formatted tracking numbers)
  if (/-/.test(cleaned)) {
    cleaned = cleaned.replace(/-/g, '');
    corrections.push('Removed dashes');
  }

  // Remove dots
  if (/\./.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
    corrections.push('Removed dots');
  }

  // Uppercase for consistent matching
  const upper = cleaned.toUpperCase();
  if (upper !== cleaned) {
    corrections.push('Uppercased');
  }
  cleaned = upper;

  // Strip common OCR noise characters from start/end
  const ocrCleaned = cleaned.replace(/^[#*:]+|[#*:]+$/g, '');
  if (ocrCleaned !== cleaned) {
    cleaned = ocrCleaned;
    corrections.push('Stripped OCR noise characters');
  }

  return { cleaned, corrections };
}

/* ── Main validation function ───────────────────────────────────────────── */

/**
 * Validate a tracking number against the expected carrier's format rules.
 * Returns the cleaned tracking number, whether it's valid, and what corrections were made.
 */
export function validateTrackingNumber(
  rawTracking: string,
  carrier: string
): TrackingValidation {
  if (!rawTracking || !rawTracking.trim()) {
    return {
      trackingNumber: '',
      valid: false,
      rule: 'Empty tracking number',
      corrections: [],
    };
  }

  const { cleaned, corrections } = normalizeTracking(rawTracking);

  if (cleaned.length < 6) {
    return {
      trackingNumber: cleaned,
      valid: false,
      rule: 'Tracking number too short (< 6 characters)',
      corrections,
    };
  }

  // Check carrier-specific rules
  const rules = CARRIER_RULES[carrier];
  if (rules) {
    for (const rule of rules) {
      if (rule.pattern.test(cleaned)) {
        return {
          trackingNumber: cleaned,
          valid: true,
          rule: `${carrier.toUpperCase()}: ${rule.description}`,
          corrections,
        };
      }
    }
    // None matched — still return the cleaned number but flag as invalid
    return {
      trackingNumber: cleaned,
      valid: false,
      rule: `No ${carrier.toUpperCase()} tracking pattern matched`,
      corrections,
    };
  }

  // For carriers without specific rules (e.g. 'other'),
  // accept if it looks like a reasonable tracking number
  const looksReasonable = /^[A-Z0-9]{6,40}$/i.test(cleaned);
  return {
    trackingNumber: cleaned,
    valid: looksReasonable,
    rule: looksReasonable
      ? 'Generic tracking format (no carrier-specific validation available)'
      : 'Does not match any known tracking format',
    corrections,
  };
}

/* ── Tracking number extraction from raw text ───────────────────────────── */

/**
 * Attempt to extract tracking numbers from a block of raw text.
 * Returns all candidate tracking numbers found, ordered by likelihood.
 */
export function extractTrackingFromText(text: string): string[] {
  if (!text) return [];

  const candidates: string[] = [];

  // UPS pattern: 1Z followed by alphanumeric
  const upsMatches = text.match(/\b1Z[A-Z0-9]{16}\b/gi);
  if (upsMatches) candidates.push(...upsMatches);

  // Amazon TBA pattern
  const tbaMatches = text.match(/\bTBA\d{10,15}\b/gi);
  if (tbaMatches) candidates.push(...tbaMatches);

  // USPS International
  const uspsIntl = text.match(/\b(EA|EC|CP|RA|RF|EJ)\d{9}US\b/gi);
  if (uspsIntl) candidates.push(...uspsIntl);

  // DHL eCommerce (JD prefix)
  const dhlMatches = text.match(/\bJD\d{18,22}\b/g);
  if (dhlMatches) candidates.push(...dhlMatches);

  // LaserShip (1LS prefix)
  const lsMatches = text.match(/\b1LS\d{12,}\b/gi);
  if (lsMatches) candidates.push(...lsMatches);

  // Long numeric sequences (USPS, FedEx)
  const longNumeric = text.match(/\b\d{12,34}\b/g);
  if (longNumeric) {
    // Filter out obvious non-tracking numbers (zip codes, dates, phone numbers)
    for (const num of longNumeric) {
      if (num.length >= 12 && num.length <= 34) {
        candidates.push(num);
      }
    }
  }

  // OnTrac patterns
  const ontracC = text.match(/\bC\d{8,14}\b/g);
  if (ontracC) candidates.push(...ontracC);

  // Deduplicate
  return [...new Set(candidates)];
}
