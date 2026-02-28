/**
 * BAR-331: Carrier Identification Rules
 *
 * Multi-signal carrier identification:
 * 1. Tracking number prefix patterns (highest confidence)
 * 2. Carrier name / logo text from AI vision
 * 3. Label layout heuristics
 *
 * Supported carriers: amazon, ups, fedex, usps, dhl, lasership, ontrac, other
 */

import type { SupportedCarrier } from './types';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface CarrierIdentification {
  carrier: SupportedCarrier;
  confidence: 'high' | 'medium' | 'low';
  matchedRule: string;
}

/* ── Tracking-number-based carrier patterns ─────────────────────────────── */

interface TrackingCarrierPattern {
  carrier: SupportedCarrier;
  test: (tracking: string) => boolean;
  confidence: 'high' | 'medium';
  rule: string;
}

const TRACKING_PATTERNS: TrackingCarrierPattern[] = [
  // ── Amazon ───────────────────────────────────────────────────────────────
  {
    carrier: 'amazon',
    test: (t) => /^TBA\d{10,15}$/i.test(t),
    confidence: 'high',
    rule: 'Amazon: TBA prefix + 10-15 digits',
  },

  // ── UPS ──────────────────────────────────────────────────────────────────
  {
    carrier: 'ups',
    test: (t) => /^1Z[A-Z0-9]{16}$/i.test(t),
    confidence: 'high',
    rule: 'UPS: 1Z + 16 alphanumeric',
  },
  {
    carrier: 'ups',
    test: (t) => /^(T|J)\d{10}$/.test(t),
    confidence: 'medium',
    rule: 'UPS: T/J + 10 digits (Mail Innovations)',
  },

  // ── LaserShip ────────────────────────────────────────────────────────────
  {
    carrier: 'lasership',
    test: (t) => /^1LS\d{12,}$/i.test(t),
    confidence: 'high',
    rule: 'LaserShip: 1LS + 12+ digits',
  },
  {
    carrier: 'lasership',
    test: (t) => /^LS\d{10,}$/i.test(t),
    confidence: 'medium',
    rule: 'LaserShip: LS + 10+ digits',
  },
  {
    carrier: 'lasership',
    test: (t) => /^LX\d{10,}$/i.test(t),
    confidence: 'medium',
    rule: 'LaserShip: LX + 10+ digits',
  },

  // ── OnTrac ───────────────────────────────────────────────────────────────
  {
    carrier: 'ontrac',
    test: (t) => /^C\d{8,14}$/.test(t),
    confidence: 'medium',
    rule: 'OnTrac: C + 8-14 digits',
  },
  {
    carrier: 'ontrac',
    test: (t) => /^D\d{14}$/.test(t),
    confidence: 'medium',
    rule: 'OnTrac: D + 14 digits',
  },

  // ── DHL ──────────────────────────────────────────────────────────────────
  {
    carrier: 'dhl',
    test: (t) => /^JD\d{18,}$/.test(t),
    confidence: 'high',
    rule: 'DHL: JD + 18+ digits (eCommerce)',
  },
  {
    carrier: 'dhl',
    test: (t) => /^[A-Z]{3}\d{7}$/.test(t),
    confidence: 'medium',
    rule: 'DHL: 3 letters + 7 digits (waybill)',
  },

  // ── USPS (before FedEx — USPS has prefix-based patterns that must ──────
  //    be checked before FedEx's digit-count patterns to avoid false       ─
  //    matches on 20-22 digit USPS numbers)                                ─
  {
    carrier: 'usps',
    test: (t) => /^(94|93|92)\d{18,22}$/.test(t),
    confidence: 'high',
    rule: 'USPS: 92/93/94 prefix + 18-22 digits',
  },
  {
    carrier: 'usps',
    test: (t) => /^(70|71|72|73|74|75|76|77|78|79)\d{18,}$/.test(t),
    confidence: 'high',
    rule: 'USPS: 70-79 prefix + 18+ digits',
  },
  {
    carrier: 'usps',
    test: (t) => /^(EA|EC|CP|RA|RF|EJ)\d{9}US$/i.test(t),
    confidence: 'high',
    rule: 'USPS: International (EA/EC/CP/RA/RF/EJ + 9d + US)',
  },
  {
    carrier: 'usps',
    test: (t) => /^420\d{5}(92|93|94)\d{18,22}$/.test(t),
    confidence: 'high',
    rule: 'USPS: 420 + ZIP + 92/93/94 tracking (Intelligent Mail)',
  },
  {
    carrier: 'usps',
    test: (t) => /^420\d{5}\d{18,24}$/.test(t),
    confidence: 'high',
    rule: 'USPS: 420 + ZIP + 18-24 digits (Intelligent Mail)',
  },
  {
    carrier: 'usps',
    test: (t) => /^9[1-5]\d{19,}$/.test(t),
    confidence: 'medium',
    rule: 'USPS: 9x prefix + 19+ digits',
  },

  // ── FedEx (after USPS to avoid false matches on long USPS numbers) ─────
  {
    carrier: 'fedex',
    test: (t) => /^6\d{19,21}$/.test(t),
    confidence: 'high',
    rule: 'FedEx: starts with 6, 20-22 digits (Ground 96/SmartPost)',
  },
  {
    carrier: 'fedex',
    test: (t) => /^\d{12}$/.test(t),
    confidence: 'medium',
    rule: 'FedEx: exactly 12 digits (Express)',
  },
  {
    carrier: 'fedex',
    test: (t) => /^\d{15}$/.test(t),
    confidence: 'medium',
    rule: 'FedEx: exactly 15 digits (Ground)',
  },
  {
    carrier: 'fedex',
    test: (t) => /^\d{20}$/.test(t),
    confidence: 'medium',
    rule: 'FedEx: exactly 20 digits (Ground 96)',
  },
  {
    carrier: 'fedex',
    test: (t) => /^\d{22}$/.test(t),
    confidence: 'medium',
    rule: 'FedEx: exactly 22 digits (SmartPost)',
  },
];

/* ── Text-based carrier identification ──────────────────────────────────── */

interface TextCarrierPattern {
  carrier: SupportedCarrier;
  patterns: RegExp[];
  confidence: 'high' | 'medium';
  rule: string;
}

const TEXT_PATTERNS: TextCarrierPattern[] = [
  {
    carrier: 'amazon',
    patterns: [
      /\bamazon\b/i,
      /\bamazon\.com\b/i,
      /\bamzl?\b/i,
      /\bprime\b/i,
      /\btba\s*\d/i,
    ],
    confidence: 'high',
    rule: 'Amazon: logo/text match',
  },
  {
    carrier: 'ups',
    patterns: [
      /\bups\b/i,
      /\bunited\s*parcel\s*service\b/i,
      /\bups\.com\b/i,
      /\b1Z[A-Z0-9]/i,
    ],
    confidence: 'high',
    rule: 'UPS: logo/text match',
  },
  {
    carrier: 'fedex',
    patterns: [
      /\bfed\s*ex\b/i,
      /\bfedex\b/i,
      /\bfederal\s*express\b/i,
      /\bfdx\b/i,
      /\bfedex\.com\b/i,
    ],
    confidence: 'high',
    rule: 'FedEx: logo/text match',
  },
  {
    carrier: 'usps',
    patterns: [
      /\busps\b/i,
      /\bus\s*postal\b/i,
      /\bunited\s*states\s*postal/i,
      /\bpriority\s*mail\b/i,
      /\bfirst[- ]?class\s*mail\b/i,
      /\bparcel\s*select\b/i,
      /\busps\.com\b/i,
    ],
    confidence: 'high',
    rule: 'USPS: logo/text match',
  },
  {
    carrier: 'dhl',
    patterns: [
      /\bdhl\b/i,
      /\bdhl\s*express\b/i,
      /\bdhl\s*ecommerce\b/i,
      /\bdhl\.com\b/i,
    ],
    confidence: 'high',
    rule: 'DHL: logo/text match',
  },
  {
    carrier: 'lasership',
    patterns: [
      /\blaser\s*ship\b/i,
      /\blasership\b/i,
      /\blso\b/i,
    ],
    confidence: 'high',
    rule: 'LaserShip: logo/text match',
  },
  {
    carrier: 'ontrac',
    patterns: [
      /\bon\s*trac\b/i,
      /\bontrac\b/i,
    ],
    confidence: 'high',
    rule: 'OnTrac: logo/text match',
  },
];

/* ── Main identification function ───────────────────────────────────────── */

/**
 * Identify carrier from multiple signals.
 *
 * Priority:
 * 1. Tracking number prefix patterns (definitive)
 * 2. AI-provided carrier name (if recognized)
 * 3. Text/logo clues from label content
 * 4. Fallback to 'other'
 */
export function identifyCarrier(
  trackingNumber: string | undefined,
  aiCarrierGuess: string | undefined,
  labelText: string | undefined
): CarrierIdentification {
  const cleanTracking = (trackingNumber || '').trim().replace(/[\s-]/g, '');

  // 1. Tracking number prefix — highest confidence
  if (cleanTracking.length >= 6) {
    for (const pattern of TRACKING_PATTERNS) {
      if (pattern.test(cleanTracking)) {
        return {
          carrier: pattern.carrier,
          confidence: pattern.confidence,
          matchedRule: pattern.rule,
        };
      }
    }
  }

  // 2. AI carrier guess — normalize and validate
  if (aiCarrierGuess) {
    const normalized = normalizeCarrierName(aiCarrierGuess);
    if (normalized !== 'other') {
      return {
        carrier: normalized,
        confidence: 'medium',
        matchedRule: `AI vision identified: ${aiCarrierGuess}`,
      };
    }
  }

  // 3. Text/logo clues from label
  if (labelText) {
    for (const tp of TEXT_PATTERNS) {
      if (tp.patterns.some((p) => p.test(labelText))) {
        return {
          carrier: tp.carrier,
          confidence: tp.confidence,
          matchedRule: tp.rule,
        };
      }
    }
  }

  // 4. If AI gave a carrier but we couldn't validate, trust it at low confidence
  if (aiCarrierGuess && aiCarrierGuess.trim()) {
    return {
      carrier: normalizeCarrierName(aiCarrierGuess),
      confidence: 'low',
      matchedRule: `AI carrier (unvalidated): ${aiCarrierGuess}`,
    };
  }

  return {
    carrier: 'other',
    confidence: 'low',
    matchedRule: 'No carrier identified',
  };
}

/* ── Carrier name normalization ─────────────────────────────────────────── */

const CARRIER_ALIASES: Record<string, SupportedCarrier> = {
  amazon: 'amazon',
  'amazon.com': 'amazon',
  amzl: 'amazon',
  'amazon logistics': 'amazon',

  ups: 'ups',
  'united parcel service': 'ups',

  fedex: 'fedex',
  'federal express': 'fedex',
  fdx: 'fedex',

  usps: 'usps',
  'us postal service': 'usps',
  'united states postal service': 'usps',
  'us mail': 'usps',

  dhl: 'dhl',
  'dhl express': 'dhl',
  'dhl ecommerce': 'dhl',

  lasership: 'lasership',
  'laser ship': 'lasership',
  lso: 'lasership',

  ontrac: 'ontrac',
  'on trac': 'ontrac',

  // Common aliases that should map to a specific carrier
  temu: 'other',
  shein: 'other',
  walmart: 'other',
  target: 'other',
};

/**
 * Normalize a carrier name string to a supported carrier ID.
 */
export function normalizeCarrierName(raw: string): SupportedCarrier {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9\s.]/g, '');
  return CARRIER_ALIASES[cleaned] ?? 'other';
}
