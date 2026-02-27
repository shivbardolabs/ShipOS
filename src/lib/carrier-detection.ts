/**
 * BAR-37: Automatic Carrier Detection from Tracking Number
 *
 * Comprehensive tracking number pattern matching for major carriers.
 * Returns carrier ID, confidence level, and display metadata.
 */

export interface CarrierDetectionResult {
  /** Matched carrier ID (matches carrierOptions on check-in page) */
  carrierId: string;
  /** Human-readable carrier name */
  carrierName: string;
  /** Confidence: 'high' = definitive prefix match, 'medium' = pattern match, 'low' = heuristic */
  confidence: 'high' | 'medium' | 'low';
  /** Which pattern rule matched (for debugging / audit) */
  matchedRule: string;
}

interface CarrierPattern {
  carrierId: string;
  carrierName: string;
  test: (tracking: string) => boolean;
  confidence: 'high' | 'medium' | 'low';
  ruleName: string;
}

/**
 * Carrier detection patterns ordered by specificity (most specific first).
 * Patterns are tested in order; first match wins.
 */
const CARRIER_PATTERNS: CarrierPattern[] = [
  // ── UPS ──────────────────────────────────────────────────────────────────
  {
    carrierId: 'ups',
    carrierName: 'UPS',
    test: (t) => /^1Z[A-Z0-9]{16}$/i.test(t),
    confidence: 'high',
    ruleName: 'UPS: 1Z + 16 alphanumeric',
  },
  {
    carrierId: 'ups',
    carrierName: 'UPS',
    test: (t) => /^(T|J)\d{10}$/.test(t),
    confidence: 'medium',
    ruleName: 'UPS: T/J + 10 digits (UPS Mail Innovations)',
  },

  // ── Amazon ───────────────────────────────────────────────────────────────
  {
    carrierId: 'amazon',
    carrierName: 'Amazon',
    test: (t) => /^TBA\d{10,15}$/i.test(t),
    confidence: 'high',
    ruleName: 'Amazon: TBA prefix + 10-15 digits',
  },

  // ── LaserShip ────────────────────────────────────────────────────────────
  {
    carrierId: 'lasership',
    carrierName: 'LaserShip',
    test: (t) => /^1LS\d{12,}$/i.test(t),
    confidence: 'high',
    ruleName: 'LaserShip: 1LS prefix + 12+ digits',
  },
  {
    carrierId: 'lasership',
    carrierName: 'LaserShip',
    test: (t) => /^LS\d{10,}$/i.test(t),
    confidence: 'medium',
    ruleName: 'LaserShip: LS prefix + 10+ digits',
  },

  // ── OnTrac ───────────────────────────────────────────────────────────────
  {
    carrierId: 'ontrac',
    carrierName: 'OnTrac',
    test: (t) => /^C\d{8,14}$/.test(t),
    confidence: 'medium',
    ruleName: 'OnTrac: C + 8-14 digits',
  },
  {
    carrierId: 'ontrac',
    carrierName: 'OnTrac',
    test: (t) => /^D\d{14}$/.test(t),
    confidence: 'medium',
    ruleName: 'OnTrac: D + 14 digits',
  },

  // ── DHL ──────────────────────────────────────────────────────────────────
  {
    carrierId: 'dhl',
    carrierName: 'DHL',
    test: (t) => /^JD\d{18,}$/.test(t),
    confidence: 'high',
    ruleName: 'DHL: JD prefix + 18+ digits (eCommerce)',
  },
  {
    carrierId: 'dhl',
    carrierName: 'DHL',
    test: (t) => /^\d{10}$/.test(t),
    confidence: 'medium',
    ruleName: 'DHL: Exactly 10 digits (Express)',
  },
  {
    carrierId: 'dhl',
    carrierName: 'DHL',
    test: (t) => /^[A-Z]{3}\d{7}$/.test(t),
    confidence: 'medium',
    ruleName: 'DHL: 3 letters + 7 digits (waybill)',
  },

  // ── FedEx ────────────────────────────────────────────────────────────────
  {
    carrierId: 'fedex',
    carrierName: 'FedEx',
    test: (t) => /^\d{12}$/.test(t),
    confidence: 'medium',
    ruleName: 'FedEx: Exactly 12 digits (Express)',
  },
  {
    carrierId: 'fedex',
    carrierName: 'FedEx',
    test: (t) => /^\d{15}$/.test(t),
    confidence: 'medium',
    ruleName: 'FedEx: Exactly 15 digits (Ground)',
  },
  {
    carrierId: 'fedex',
    carrierName: 'FedEx',
    test: (t) => /^\d{20}$/.test(t),
    confidence: 'medium',
    ruleName: 'FedEx: Exactly 20 digits (Ground 96)',
  },
  {
    carrierId: 'fedex',
    carrierName: 'FedEx',
    test: (t) => /^\d{22}$/.test(t),
    confidence: 'medium',
    ruleName: 'FedEx: Exactly 22 digits (SmartPost)',
  },

  // ── USPS ─────────────────────────────────────────────────────────────────
  {
    carrierId: 'usps',
    carrierName: 'USPS',
    test: (t) => /^(94|93|92|94)\d{18,22}$/.test(t),
    confidence: 'high',
    ruleName: 'USPS: 94/93/92 prefix + 18-22 digits',
  },
  {
    carrierId: 'usps',
    carrierName: 'USPS',
    test: (t) => /^(70|71|72|73|74|75|76|77|78|79)\d{18,}$/.test(t),
    confidence: 'high',
    ruleName: 'USPS: 70-79 prefix + 18+ digits',
  },
  {
    carrierId: 'usps',
    carrierName: 'USPS',
    test: (t) => /^(EA|EC|CP|RA|RF|EJ)\d{9}US$/i.test(t),
    confidence: 'high',
    ruleName: 'USPS: International format (EA/EC/CP/RA/RF/EJ + 9 digits + US)',
  },
  {
    carrierId: 'usps',
    carrierName: 'USPS',
    test: (t) => /^420\d{5}\d{22}$/.test(t),
    confidence: 'high',
    ruleName: 'USPS: 420 + ZIP + 22 digits (Intelligent Mail)',
  },
  {
    carrierId: 'usps',
    carrierName: 'USPS',
    test: (t) => /^9[1-5]\d{19,}$/.test(t),
    confidence: 'medium',
    ruleName: 'USPS: 9x prefix + 19+ digits (Priority/First Class)',
  },
  {
    carrierId: 'usps',
    carrierName: 'USPS',
    test: (t) => /^\d{20,34}$/.test(t) && /^(9|4)/.test(t),
    confidence: 'low',
    ruleName: 'USPS: 20-34 digits starting with 9 or 4 (heuristic)',
  },
];

/**
 * Detect carrier from a tracking number string.
 * Returns null if no carrier pattern matches.
 */
export function detectCarrier(
  trackingNumber: string
): CarrierDetectionResult | null {
  const cleaned = trackingNumber.trim().replace(/[\s-]/g, '');
  if (cleaned.length < 6) return null;

  for (const pattern of CARRIER_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        carrierId: pattern.carrierId,
        carrierName: pattern.carrierName,
        confidence: pattern.confidence,
        matchedRule: pattern.ruleName,
      };
    }
  }

  return null;
}

/**
 * Get all supported carrier IDs that have detection patterns.
 */
export function getDetectableCarriers(): string[] {
  const ids = new Set(CARRIER_PATTERNS.map((p) => p.carrierId));
  return Array.from(ids);
}
