/**
 * BAR-331: Smart Intake Label Data Extraction Service
 *
 * Central module that orchestrates AI vision results through the extraction
 * rules pipeline:
 *
 * 1. Carrier Identification — tracking prefixes, text/logo, AI guess
 * 2. Tracking Number Validation — per-carrier regex, normalization
 * 3. Recipient Name Parsing — ATTN/C/O stripping, business detection, Title Case
 * 4. Service Type Detection — PMB, iPostal, UPS Access Point, FedEx HAL, Kinek, Amazon Hub
 *
 * Usage:
 *   import { processExtractionResults, ENHANCED_SYSTEM_PROMPT } from '@/lib/smart-intake';
 *   const processed = processExtractionResults(aiResults);
 */

export { identifyCarrier, normalizeCarrierName } from './carrier-identification';
export { validateTrackingNumber, extractTrackingFromText } from './tracking-validation';
export { parseRecipientName } from './recipient-parser';
export { detectServiceType, getServiceTypeLabel } from './service-type-detection';

export type {
  SupportedCarrier,
  ServiceType,
  ExtractionResult,
  RawVisionResult,
  FieldValidation,
} from './types';
export { SUPPORTED_CARRIERS, SERVICE_TYPES } from './types';

import type { RawVisionResult, ExtractionResult, FieldValidation } from './types';
import { identifyCarrier } from './carrier-identification';
import { validateTrackingNumber } from './tracking-validation';
import { parseRecipientName } from './recipient-parser';
import { detectServiceType } from './service-type-detection';

/* ── Main processing pipeline ───────────────────────────────────────────── */

/**
 * Process a single raw AI vision result through the full extraction pipeline.
 *
 * This post-processes whatever GPT-4o returned, applying deterministic
 * validation and normalization rules to ensure high-quality output.
 */
export function processExtraction(raw: RawVisionResult): ExtractionResult {
  // 1. Identify carrier (multi-signal)
  const carrierResult = identifyCarrier(
    raw.trackingNumber,
    raw.carrier,
    raw.rawLabelText
  );

  // 2. Validate & normalize tracking number
  const trackingResult = validateTrackingNumber(
    raw.trackingNumber || '',
    carrierResult.carrier
  );

  // 3. Parse recipient name
  const recipientResult = parseRecipientName(raw.recipientName);

  // 4. Detect service type
  const serviceResult = detectServiceType(
    raw.recipientAddress,
    recipientResult.name,
    raw.pmbNumber,
    carrierResult.carrier,
    trackingResult.trackingNumber,
    raw.rawLabelText,
    raw.senderName,
  );

  // 5. Normalize PMB number
  const pmbNumber = normalizePmbNumber(raw.pmbNumber || '');

  // 6. Calculate confidence — degrade based on validation failures
  let confidence = raw.confidence ?? 0.5;
  if (!trackingResult.valid) confidence *= 0.7;
  if (carrierResult.confidence === 'low') confidence *= 0.8;
  if (!recipientResult.name) confidence *= 0.6;
  confidence = Math.round(confidence * 100) / 100;

  return {
    carrier: carrierResult.carrier,
    carrierConfidence: carrierResult.confidence,
    carrierMatchedRule: carrierResult.matchedRule,

    trackingNumber: trackingResult.trackingNumber,
    trackingNumberValid: trackingResult.valid,
    trackingValidationRule: trackingResult.rule,

    recipientName: recipientResult.name,
    recipientIsBusiness: recipientResult.isBusiness,
    recipientNameRaw: recipientResult.rawInput,

    serviceType: serviceResult.serviceType,
    serviceTypeMatchedRule: serviceResult.matchedRule,

    pmbNumber,
    senderName: (raw.senderName || '').trim(),
    senderAddress: (raw.senderAddress || '').trim(),
    packageSize: normalizePackageSize(raw.packageSize || ''),
    confidence,
  };
}

/**
 * Process an array of raw AI results (e.g. from a batch scan).
 */
export function processExtractionResults(
  rawResults: RawVisionResult[]
): ExtractionResult[] {
  return rawResults.map(processExtraction);
}

/**
 * Generate a validation report for a raw result — useful for debugging
 * and showing the user what corrections were applied.
 */
export function generateValidationReport(
  raw: RawVisionResult,
  processed: ExtractionResult
): FieldValidation[] {
  const report: FieldValidation[] = [];

  // Carrier validation
  report.push({
    field: 'carrier',
    valid: processed.carrierConfidence !== 'low',
    original: raw.carrier || '',
    corrected: processed.carrier,
    rule: processed.carrierMatchedRule,
  });

  // Tracking number validation
  report.push({
    field: 'trackingNumber',
    valid: processed.trackingNumberValid,
    original: raw.trackingNumber || '',
    corrected: processed.trackingNumber,
    rule: processed.trackingValidationRule,
  });

  // Recipient name
  report.push({
    field: 'recipientName',
    valid: !!processed.recipientName,
    original: raw.recipientName || '',
    corrected: processed.recipientName,
    rule: processed.recipientIsBusiness ? 'Business name detected' : 'Personal name',
  });

  // Service type
  report.push({
    field: 'serviceType',
    valid: true,
    original: '',
    corrected: processed.serviceType,
    rule: processed.serviceTypeMatchedRule,
  });

  return report;
}

/* ── PMB normalization ──────────────────────────────────────────────────── */

/**
 * Normalize PMB/Suite/Box number to a consistent format: PMB-XXXX
 */
function normalizePmbNumber(raw: string): string {
  if (!raw) return '';

  // Already in PMB-XXXX format
  if (/^PMB-\d+$/i.test(raw.trim())) {
    return raw.trim().toUpperCase();
  }

  // Extract number from various formats
  const match = raw.match(
    /(?:PMB|Suite|STE|Unit|Box|Apt|#)\s*[-#:]?\s*(\d+)/i
  );
  if (match) {
    const num = match[1].padStart(4, '0');
    return `PMB-${num}`;
  }

  // Just a plain number
  const plainNum = raw.trim().replace(/[^0-9]/g, '');
  if (plainNum) {
    return `PMB-${plainNum.padStart(4, '0')}`;
  }

  return raw.trim();
}

/* ── Package size normalization ─────────────────────────────────────────── */

const SIZE_ALIASES: Record<string, string> = {
  letter: 'letter',
  envelope: 'letter',
  flat: 'letter',
  pack: 'pack',
  softpak: 'pack',
  'bubble mailer': 'pack',
  polybag: 'pack',
  small: 'small',
  sm: 'small',
  medium: 'medium',
  med: 'medium',
  md: 'medium',
  large: 'large',
  lg: 'large',
  big: 'large',
  xlarge: 'xlarge',
  'extra large': 'xlarge',
  xl: 'xlarge',
  oversized: 'xlarge',
  oversize: 'xlarge',
  huge: 'xlarge',
};

function normalizePackageSize(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  return SIZE_ALIASES[cleaned] ?? (cleaned || 'medium');
}

/* ── Enhanced AI System Prompt ──────────────────────────────────────────── */

/**
 * Enhanced system prompt for GPT-4o vision that produces structured output
 * aligned with our extraction rules. This gives the AI specific guidance
 * on what to look for, improving raw extraction quality before post-processing.
 */
export const ENHANCED_SYSTEM_PROMPT = `You are a shipping label analysis AI for a postal mailbox store (CMRA).
Analyze the package label image and extract the following fields as JSON.

Return a JSON array of objects (one per visible label). Each object must have:

1. **carrier** (string, lowercase): Identify the carrier from logo, branding, or label layout.
   Must be one of: amazon, ups, fedex, usps, dhl, lasership, ontrac, other
   Identification clues:
   - Logo / brand mark on the label
   - Carrier name printed on label
   - Tracking number prefix: TBA→Amazon, 1Z→UPS, 92/93/94→USPS, JD→DHL
   - Label color/layout: brown shield→UPS, purple+orange→FedEx, blue+red→USPS, yellow+red→DHL

2. **trackingNumber** (string): The primary tracking/barcode number.
   - Look for the longest barcode number on the label
   - Common formats: UPS "1Z..." (18 chars), USPS 20-34 digits starting with 92/93/94, FedEx 12-22 digits, Amazon "TBA..." 
   - Include the full number, no spaces or dashes
   - If multiple barcodes exist, prefer the tracking number over ZIP barcodes or reference numbers

3. **senderName** (string): The sender/shipper name from the "FROM" or return address block.

4. **senderAddress** (string): The sender/return address (street, city, state, zip).

5. **recipientName** (string): The recipient name from the "SHIP TO" / "DELIVER TO" block.
   - Extract ONLY the person or business name, not the full address
   - If "ATTN:" or "C/O" prefix exists, the name after ATTN: is the primary recipient
   - Strip any PMB/Suite/Unit numbers from the name
   - If both a person name and business name appear, prefer the person name

6. **recipientAddress** (string): The full delivery address from the Ship To block.

7. **pmbNumber** (string): PMB, Suite, Unit, Box, or Apt number from the delivery address.
   - Format as "PMB-XXXX" if it's a mailbox number
   - Look for: PMB, Suite, STE, Unit, Box, Apt, # followed by a number

8. **packageSize** (string): Estimated size: letter, pack, small, medium, large, xlarge

9. **confidence** (number, 0-1): Your confidence in the overall extraction accuracy.

10. **rawLabelText** (string): Any additional notable text from the label that might indicate:
    - Service programs: "UPS Access Point", "FedEx Hold At Location", "Amazon Hub", "Kinek", "iPostal"
    - Special handling: "HOLD AT LOCATION", "ACCESS POINT", "HUB COUNTER"
    - Account numbers or reference codes visible on the label

If a field is not visible or unclear, use an empty string.
Always return valid JSON array only, no markdown, no explanation.`;
