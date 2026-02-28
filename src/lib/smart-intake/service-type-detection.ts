/**
 * BAR-331: Service Type Detection Rules
 *
 * Identifies the type of delivery service/program based on address patterns,
 * keywords, account numbers, and carrier-specific indicators.
 *
 * Service types:
 * - pmb_customer:       PMB / Suite / Mailbox customer (our store's customer)
 * - ipostal:            iPostal1 digital mailbox platform partner
 * - ups_access_point:   UPS Access Point (store acts as pickup location)
 * - fedex_hal:          FedEx Hold At Location
 * - kinek:              Kinek package pickup point
 * - amazon_hub:         Amazon Hub Counter / Locker partner
 * - general_delivery:   Regular delivery — no special program
 */

import type { ServiceType } from './types';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ServiceTypeDetection {
  serviceType: ServiceType;
  matchedRule: string;
  confidence: 'high' | 'medium' | 'low';
}

/* ── Detection rules ────────────────────────────────────────────────────── */

interface ServiceTypeRule {
  serviceType: ServiceType;
  /** Test function — receives all available context */
  test: (ctx: DetectionContext) => boolean;
  /** Human-readable rule description */
  rule: string;
  confidence: 'high' | 'medium' | 'low';
}

interface DetectionContext {
  /** Full recipient address (if available) */
  recipientAddress: string;
  /** Recipient name */
  recipientName: string;
  /** PMB/Suite/Box number extracted */
  pmbNumber: string;
  /** Carrier ID */
  carrier: string;
  /** Tracking number */
  trackingNumber: string;
  /** Any additional raw text from the label */
  rawLabelText: string;
  /** Sender name */
  senderName: string;
}

/**
 * Service type detection rules, ordered by specificity (most specific first).
 * First match wins.
 */
const RULES: ServiceTypeRule[] = [
  // ── Amazon Hub ────────────────────────────────────────────────────────────
  {
    serviceType: 'amazon_hub',
    test: (ctx) =>
      /\bamazon\s*(hub|counter|locker)\b/i.test(ctx.recipientAddress) ||
      /\bamazon\s*(hub|counter|locker)\b/i.test(ctx.rawLabelText) ||
      /\bamazon\s*(hub|counter|locker)\b/i.test(ctx.recipientName),
    rule: 'Amazon Hub: "Amazon Hub/Counter/Locker" in address or label text',
    confidence: 'high',
  },
  {
    serviceType: 'amazon_hub',
    test: (ctx) =>
      ctx.carrier === 'amazon' &&
      /\b(hub|counter|pickup\s*point|locker)\b/i.test(ctx.recipientAddress + ' ' + ctx.rawLabelText),
    rule: 'Amazon Hub: Amazon carrier + hub/counter/pickup keywords',
    confidence: 'medium',
  },

  // ── UPS Access Point ──────────────────────────────────────────────────────
  {
    serviceType: 'ups_access_point',
    test: (ctx) =>
      /\bups\s*access\s*point\b/i.test(ctx.recipientAddress) ||
      /\bups\s*access\s*point\b/i.test(ctx.rawLabelText) ||
      /\bups\s*access\s*point\b/i.test(ctx.recipientName),
    rule: 'UPS Access Point: "UPS Access Point" in address/label',
    confidence: 'high',
  },
  {
    serviceType: 'ups_access_point',
    test: (ctx) =>
      ctx.carrier === 'ups' &&
      /\b(access\s*point|AP|pickup\s*point|UAP)\b/i.test(ctx.rawLabelText),
    rule: 'UPS Access Point: UPS carrier + access point keywords',
    confidence: 'medium',
  },
  {
    serviceType: 'ups_access_point',
    test: (ctx) =>
      ctx.carrier === 'ups' &&
      /\bACCESS\s*POINT\s*(?:ID|#|NUMBER)/i.test(ctx.rawLabelText),
    rule: 'UPS Access Point: UPS + Access Point ID reference',
    confidence: 'high',
  },

  // ── FedEx Hold At Location ────────────────────────────────────────────────
  {
    serviceType: 'fedex_hal',
    test: (ctx) =>
      /\b(hold\s*at\s*location|HAL)\b/i.test(ctx.recipientAddress) ||
      /\b(hold\s*at\s*location|HAL)\b/i.test(ctx.rawLabelText),
    rule: 'FedEx HAL: "Hold At Location" / "HAL" in address/label',
    confidence: 'high',
  },
  {
    serviceType: 'fedex_hal',
    test: (ctx) =>
      ctx.carrier === 'fedex' &&
      /\b(HAL|hold\s*at|hold\s*for\s*pickup)\b/i.test(ctx.rawLabelText),
    rule: 'FedEx HAL: FedEx carrier + hold keywords',
    confidence: 'medium',
  },
  {
    serviceType: 'fedex_hal',
    test: (ctx) =>
      ctx.carrier === 'fedex' &&
      /\bFEDEX\s*(OFFICE|SHIP\s*CENTER|ONSITE)\b/i.test(ctx.recipientAddress + ' ' + ctx.rawLabelText),
    rule: 'FedEx HAL: FedEx Office/Ship Center/OnSite in address',
    confidence: 'high',
  },

  // ── Kinek ─────────────────────────────────────────────────────────────────
  {
    serviceType: 'kinek',
    test: (ctx) =>
      /\bkinek\b/i.test(ctx.recipientAddress) ||
      /\bkinek\b/i.test(ctx.rawLabelText) ||
      /\bkinek\b/i.test(ctx.recipientName),
    rule: 'Kinek: "Kinek" in address/label/name',
    confidence: 'high',
  },
  {
    serviceType: 'kinek',
    test: (ctx) =>
      /\bKN[-\s]?\d{6,}\b/i.test(ctx.recipientAddress) ||
      /\bKN[-\s]?\d{6,}\b/i.test(ctx.rawLabelText),
    rule: 'Kinek: KN-XXXXXX account number pattern',
    confidence: 'high',
  },

  // ── iPostal ───────────────────────────────────────────────────────────────
  {
    serviceType: 'ipostal',
    test: (ctx) =>
      /\bipostal1?\b/i.test(ctx.recipientAddress) ||
      /\bipostal1?\b/i.test(ctx.rawLabelText) ||
      /\bipostal1?\b/i.test(ctx.recipientName),
    rule: 'iPostal: "iPostal" / "iPostal1" in address/label',
    confidence: 'high',
  },
  {
    serviceType: 'ipostal',
    test: (ctx) =>
      /\bipostal\b/i.test(ctx.senderName),
    rule: 'iPostal: "iPostal" in sender name (forwarding notification)',
    confidence: 'medium',
  },
  {
    serviceType: 'ipostal',
    test: (ctx) =>
      // iPostal accounts often use specific PMB/Suite ranges or formats
      /\b(digital\s*mail|virtual\s*mail|virtual\s*address)\b/i.test(ctx.rawLabelText),
    rule: 'iPostal: Digital/virtual mail keywords in label text',
    confidence: 'low',
  },

  // ── PMB Customer ──────────────────────────────────────────────────────────
  {
    serviceType: 'pmb_customer',
    test: (ctx) =>
      /\bPMB[-\s#]?\d+\b/i.test(ctx.recipientAddress) ||
      /\bPMB[-\s#]?\d+\b/i.test(ctx.pmbNumber),
    rule: 'PMB Customer: PMB number in address',
    confidence: 'high',
  },
  {
    serviceType: 'pmb_customer',
    test: (ctx) =>
      /\b(suite|ste|unit|box|apt|#)\s*\d+\b/i.test(ctx.recipientAddress) &&
      !!ctx.pmbNumber,
    rule: 'PMB Customer: Suite/Unit/Box number with PMB match',
    confidence: 'medium',
  },
  {
    serviceType: 'pmb_customer',
    test: (ctx) => !!ctx.pmbNumber && ctx.pmbNumber.length > 0,
    rule: 'PMB Customer: PMB number present',
    confidence: 'medium',
  },
];

/* ── Main detection function ────────────────────────────────────────────── */

/**
 * Detect the service type from label data.
 * Uses all available signals: address, name, carrier, tracking, raw text.
 */
export function detectServiceType(
  recipientAddress?: string,
  recipientName?: string,
  pmbNumber?: string,
  carrier?: string,
  trackingNumber?: string,
  rawLabelText?: string,
  senderName?: string,
): ServiceTypeDetection {
  const ctx: DetectionContext = {
    recipientAddress: recipientAddress || '',
    recipientName: recipientName || '',
    pmbNumber: pmbNumber || '',
    carrier: carrier || '',
    trackingNumber: trackingNumber || '',
    rawLabelText: rawLabelText || '',
    senderName: senderName || '',
  };

  for (const rule of RULES) {
    if (rule.test(ctx)) {
      return {
        serviceType: rule.serviceType,
        matchedRule: rule.rule,
        confidence: rule.confidence,
      };
    }
  }

  return {
    serviceType: 'general_delivery',
    matchedRule: 'No special service type detected — general delivery',
    confidence: 'high',
  };
}

/* ── Helper: get human-readable service type label ──────────────────────── */

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  pmb_customer: 'PMB Customer',
  ipostal: 'iPostal',
  ups_access_point: 'UPS Access Point',
  fedex_hal: 'FedEx Hold At Location',
  kinek: 'Kinek',
  amazon_hub: 'Amazon Hub',
  general_delivery: 'General Delivery',
};

export function getServiceTypeLabel(serviceType: ServiceType): string {
  return SERVICE_TYPE_LABELS[serviceType] || serviceType;
}
