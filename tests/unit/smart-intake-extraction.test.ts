/**
 * BAR-331: Smart Intake Label Data Extraction — Unit Tests
 *
 * Tests the extraction rules engine for:
 * - Carrier identification from tracking prefixes, text, and AI guesses
 * - Tracking number validation per carrier format
 * - Recipient name parsing (ATTN, C/O, business detection, normalization)
 * - Service type detection (PMB, iPostal, UPS AP, FedEx HAL, Kinek, Amazon Hub)
 * - Full pipeline (processExtraction)
 */

import { identifyCarrier, normalizeCarrierName } from '../../src/lib/smart-intake/carrier-identification';
import { validateTrackingNumber, extractTrackingFromText } from '../../src/lib/smart-intake/tracking-validation';
import { parseRecipientName } from '../../src/lib/smart-intake/recipient-parser';
import { detectServiceType } from '../../src/lib/smart-intake/service-type-detection';
import { processExtraction } from '../../src/lib/smart-intake';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Carrier Identification                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Carrier Identification', () => {
  describe('from tracking number prefix', () => {
    test('UPS: 1Z prefix', () => {
      const result = identifyCarrier('1Z999AA10123456784', undefined, undefined);
      expect(result.carrier).toBe('ups');
      expect(result.confidence).toBe('high');
    });

    test('Amazon: TBA prefix', () => {
      const result = identifyCarrier('TBA934857201847', undefined, undefined);
      expect(result.carrier).toBe('amazon');
      expect(result.confidence).toBe('high');
    });

    test('USPS: 92 prefix', () => {
      const result = identifyCarrier('9261290100130736410672', undefined, undefined);
      expect(result.carrier).toBe('usps');
      expect(result.confidence).toBe('high');
    });

    test('USPS: 94 prefix', () => {
      const result = identifyCarrier('9400111899223100012847', undefined, undefined);
      expect(result.carrier).toBe('usps');
      expect(result.confidence).toBe('high');
    });

    test('USPS: 420+ZIP prefix', () => {
      const result = identifyCarrier('42010019261290100130736410672', undefined, undefined);
      expect(result.carrier).toBe('usps');
      expect(result.confidence).toBe('high');
    });

    test('DHL: JD prefix', () => {
      const result = identifyCarrier('JD014600003216042866', undefined, undefined);
      expect(result.carrier).toBe('dhl');
      expect(result.confidence).toBe('high');
    });

    test('LaserShip: 1LS prefix', () => {
      const result = identifyCarrier('1LS123456789012', undefined, undefined);
      expect(result.carrier).toBe('lasership');
      expect(result.confidence).toBe('high');
    });

    test('OnTrac: C prefix', () => {
      const result = identifyCarrier('C12345678901', undefined, undefined);
      expect(result.carrier).toBe('ontrac');
      expect(result.confidence).toBe('medium');
    });

    test('FedEx: 12 digits', () => {
      const result = identifyCarrier('794644790128', undefined, undefined);
      expect(result.carrier).toBe('fedex');
      expect(result.confidence).toBe('medium');
    });

    test('FedEx: 15 digits', () => {
      const result = identifyCarrier('123456789012345', undefined, undefined);
      expect(result.carrier).toBe('fedex');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('from AI carrier guess', () => {
    test('normalizes "FedEx" to fedex', () => {
      const result = identifyCarrier(undefined, 'FedEx', undefined);
      expect(result.carrier).toBe('fedex');
      expect(result.confidence).toBe('medium');
    });

    test('normalizes "United Parcel Service" to ups', () => {
      expect(normalizeCarrierName('United Parcel Service')).toBe('ups');
    });

    test('normalizes "Amazon.com" to amazon', () => {
      expect(normalizeCarrierName('Amazon.com')).toBe('amazon');
    });

    test('unknown carrier returns other', () => {
      expect(normalizeCarrierName('SomeRandomCarrier')).toBe('other');
    });
  });

  describe('from label text', () => {
    test('detects UPS from text', () => {
      const result = identifyCarrier(undefined, undefined, 'UNITED PARCEL SERVICE tracking info');
      expect(result.carrier).toBe('ups');
    });

    test('detects FedEx from text', () => {
      const result = identifyCarrier(undefined, undefined, 'FedEx Express label');
      expect(result.carrier).toBe('fedex');
    });

    test('detects USPS from "Priority Mail"', () => {
      const result = identifyCarrier(undefined, undefined, 'PRIORITY MAIL service');
      expect(result.carrier).toBe('usps');
    });
  });

  describe('priority order', () => {
    test('tracking prefix wins over AI guess', () => {
      const result = identifyCarrier('1Z999AA10123456784', 'fedex', undefined);
      expect(result.carrier).toBe('ups');
    });

    test('AI guess used when no tracking match', () => {
      const result = identifyCarrier('ABC123', 'fedex', undefined);
      expect(result.carrier).toBe('fedex');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Tracking Number Validation                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Tracking Number Validation', () => {
  describe('UPS', () => {
    test('valid 1Z format', () => {
      const result = validateTrackingNumber('1Z999AA10123456784', 'ups');
      expect(result.valid).toBe(true);
      expect(result.trackingNumber).toBe('1Z999AA10123456784');
    });

    test('valid with lowercase (auto-uppercased)', () => {
      const result = validateTrackingNumber('1z999aa10123456784', 'ups');
      expect(result.valid).toBe(true);
      expect(result.trackingNumber).toBe('1Z999AA10123456784');
    });

    test('strips spaces', () => {
      const result = validateTrackingNumber('1Z 999 AA1 0123 456784', 'ups');
      expect(result.valid).toBe(true);
      expect(result.corrections).toContain('Removed embedded spaces');
    });

    test('invalid format', () => {
      const result = validateTrackingNumber('INVALID123', 'ups');
      expect(result.valid).toBe(false);
    });
  });

  describe('USPS', () => {
    test('valid 94 prefix', () => {
      const result = validateTrackingNumber('9400111899223100012847', 'usps');
      expect(result.valid).toBe(true);
    });

    test('valid 92 prefix', () => {
      const result = validateTrackingNumber('9261290100130736410672', 'usps');
      expect(result.valid).toBe(true);
    });

    test('valid international EA format', () => {
      const result = validateTrackingNumber('EA123456789US', 'usps');
      expect(result.valid).toBe(true);
    });

    test('valid 420+ZIP format', () => {
      const result = validateTrackingNumber('42010019400111899223100012847', 'usps');
      expect(result.valid).toBe(true);
    });
  });

  describe('FedEx', () => {
    test('valid 12 digit', () => {
      const result = validateTrackingNumber('794644790128', 'fedex');
      expect(result.valid).toBe(true);
    });

    test('valid 15 digit', () => {
      const result = validateTrackingNumber('123456789012345', 'fedex');
      expect(result.valid).toBe(true);
    });

    test('valid DT door tag', () => {
      const result = validateTrackingNumber('DT123456789012', 'fedex');
      expect(result.valid).toBe(true);
    });
  });

  describe('Amazon', () => {
    test('valid TBA format', () => {
      const result = validateTrackingNumber('TBA934857201847', 'amazon');
      expect(result.valid).toBe(true);
    });

    test('case insensitive TBA', () => {
      const result = validateTrackingNumber('tba934857201847', 'amazon');
      expect(result.valid).toBe(true);
    });
  });

  describe('DHL', () => {
    test('valid JD eCommerce format', () => {
      const result = validateTrackingNumber('JD014600003216042866', 'dhl');
      expect(result.valid).toBe(true);
    });
  });

  describe('normalization', () => {
    test('removes dashes', () => {
      const result = validateTrackingNumber('1Z-999-AA1-012-345-6784', 'ups');
      expect(result.corrections).toContain('Removed dashes');
    });

    test('empty tracking number', () => {
      const result = validateTrackingNumber('', 'ups');
      expect(result.valid).toBe(false);
    });

    test('too short tracking number', () => {
      const result = validateTrackingNumber('AB', 'ups');
      expect(result.valid).toBe(false);
    });
  });
});

describe('Tracking Extraction from Text', () => {
  test('finds UPS tracking in text', () => {
    const results = extractTrackingFromText('Your package 1Z999AA10123456784 has shipped');
    expect(results).toContain('1Z999AA10123456784');
  });

  test('finds Amazon TBA in text', () => {
    const results = extractTrackingFromText('Tracking: TBA934857201847');
    expect(results).toContain('TBA934857201847');
  });

  test('finds multiple tracking numbers', () => {
    const results = extractTrackingFromText(
      'UPS: 1Z999AA10123456784, Amazon: TBA934857201847'
    );
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Recipient Name Parsing                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Recipient Name Parsing', () => {
  describe('ATTN prefix', () => {
    test('strips "ATTN:" prefix', () => {
      const result = parseRecipientName('ATTN: John Smith');
      expect(result.name).toBe('John Smith');
    });

    test('strips "ATTENTION:" prefix', () => {
      const result = parseRecipientName('ATTENTION: Jane Doe');
      expect(result.name).toBe('Jane Doe');
    });
  });

  describe('C/O handling', () => {
    test('strips "C/O" prefix', () => {
      const result = parseRecipientName('C/O Acme Corp');
      expect(result.name).toBe('Acme Corp');
    });

    test('separates "Name C/O Business"', () => {
      const result = parseRecipientName('John Smith C/O Acme Corp');
      expect(result.name).toBe('John Smith');
    });
  });

  describe('noise stripping', () => {
    test('strips PMB number from end', () => {
      const result = parseRecipientName('John Smith PMB 1234');
      expect(result.name).toBe('John Smith');
    });

    test('strips Suite number from end', () => {
      const result = parseRecipientName('Jane Doe Suite 100');
      expect(result.name).toBe('Jane Doe');
    });

    test('strips phone number from end', () => {
      const result = parseRecipientName('John Smith (555) 123-4567');
      expect(result.name).toBe('John Smith');
    });

    test('strips "SHIP TO:" prefix', () => {
      const result = parseRecipientName('SHIP TO: John Smith');
      expect(result.name).toBe('John Smith');
    });
  });

  describe('multi-line handling', () => {
    test('extracts first meaningful line', () => {
      const result = parseRecipientName('SHIP TO:\nJohn Smith\n123 Main St\nNew York, NY 10001');
      expect(result.name).toBe('John Smith');
    });
  });

  describe('business detection', () => {
    test('detects LLC business', () => {
      const result = parseRecipientName('Acme Solutions LLC');
      expect(result.isBusiness).toBe(true);
    });

    test('detects Inc. business', () => {
      const result = parseRecipientName('TechCorp Inc.');
      expect(result.isBusiness).toBe(true);
    });

    test('personal name not flagged as business', () => {
      const result = parseRecipientName('John Smith');
      expect(result.isBusiness).toBe(false);
    });
  });

  describe('case normalization', () => {
    test('normalizes ALL CAPS to Title Case', () => {
      const result = parseRecipientName('JOHN SMITH');
      expect(result.name).toBe('John Smith');
    });

    test('normalizes all lowercase to Title Case', () => {
      const result = parseRecipientName('john smith');
      expect(result.name).toBe('John Smith');
    });

    test('preserves already-correct casing', () => {
      const result = parseRecipientName('John Smith');
      expect(result.name).toBe('John Smith');
    });
  });

  describe('edge cases', () => {
    test('empty input', () => {
      const result = parseRecipientName('');
      expect(result.name).toBe('');
    });

    test('undefined input', () => {
      const result = parseRecipientName(undefined);
      expect(result.name).toBe('');
    });

    test('whitespace only', () => {
      const result = parseRecipientName('   ');
      expect(result.name).toBe('');
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Service Type Detection                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Service Type Detection', () => {
  test('detects PMB customer from address', () => {
    const result = detectServiceType(
      '123 Main St PMB 1234, New York, NY 10001',
      'John Smith',
      'PMB-1234'
    );
    expect(result.serviceType).toBe('pmb_customer');
  });

  test('detects iPostal from label text', () => {
    const result = detectServiceType(
      undefined, undefined, undefined, undefined, undefined,
      'iPostal1 forwarding notification'
    );
    expect(result.serviceType).toBe('ipostal');
  });

  test('detects UPS Access Point', () => {
    const result = detectServiceType(
      'UPS Access Point - Local Store, 123 Main St',
      undefined, undefined, 'ups'
    );
    expect(result.serviceType).toBe('ups_access_point');
  });

  test('detects UPS Access Point from label text', () => {
    const result = detectServiceType(
      undefined, undefined, undefined, 'ups', undefined,
      'ACCESS POINT ID: 123456'
    );
    expect(result.serviceType).toBe('ups_access_point');
  });

  test('detects FedEx HAL', () => {
    const result = detectServiceType(
      'FedEx Office - Hold At Location',
      undefined, undefined, 'fedex'
    );
    expect(result.serviceType).toBe('fedex_hal');
  });

  test('detects FedEx HAL from label text', () => {
    const result = detectServiceType(
      undefined, undefined, undefined, 'fedex', undefined,
      'HOLD AT LOCATION'
    );
    expect(result.serviceType).toBe('fedex_hal');
  });

  test('detects Kinek from address', () => {
    const result = detectServiceType(
      'Kinek Point - Local Store'
    );
    expect(result.serviceType).toBe('kinek');
  });

  test('detects Kinek from account number', () => {
    const result = detectServiceType(
      'KN-123456 Local Store',
      undefined, undefined, undefined, undefined,
      'KN-123456'
    );
    expect(result.serviceType).toBe('kinek');
  });

  test('detects Amazon Hub', () => {
    const result = detectServiceType(
      'Amazon Hub Counter - Local Store'
    );
    expect(result.serviceType).toBe('amazon_hub');
  });

  test('detects Amazon Hub from carrier + keywords', () => {
    const result = detectServiceType(
      'Local Store Pickup Point',
      undefined, undefined, 'amazon', undefined,
      'Amazon Hub Counter'
    );
    expect(result.serviceType).toBe('amazon_hub');
  });

  test('defaults to general_delivery when nothing matches', () => {
    const result = detectServiceType(
      '123 Main St, New York, NY 10001'
    );
    expect(result.serviceType).toBe('general_delivery');
  });

  test('PMB number alone triggers pmb_customer', () => {
    const result = detectServiceType(
      undefined, 'John Smith', 'PMB-0042'
    );
    expect(result.serviceType).toBe('pmb_customer');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Full Pipeline (processExtraction)                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('processExtraction — full pipeline', () => {
  test('processes a typical UPS label', () => {
    const result = processExtraction({
      carrier: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      recipientName: 'ATTN: DAVID KIM',
      recipientAddress: '123 Main St Suite 5, New York, NY 10001',
      senderName: 'Best Buy',
      senderAddress: '7601 Penn Ave S, Richfield, MN 55423',
      pmbNumber: '5',
      packageSize: 'large',
      confidence: 0.94,
    });

    expect(result.carrier).toBe('ups');
    expect(result.carrierConfidence).toBe('high');
    expect(result.trackingNumber).toBe('1Z999AA10123456784');
    expect(result.trackingNumberValid).toBe(true);
    expect(result.recipientName).toBe('David Kim');
    expect(result.recipientIsBusiness).toBe(false);
    expect(result.pmbNumber).toBe('PMB-0005');
    expect(result.serviceType).toBe('pmb_customer');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('processes an Amazon label with TBA tracking', () => {
    const result = processExtraction({
      carrier: 'amazon',
      trackingNumber: 'TBA934857201847',
      recipientName: 'James Morrison',
      pmbNumber: 'PMB-0001',
      senderName: 'Amazon.com',
      packageSize: 'medium',
      confidence: 0.96,
    });

    expect(result.carrier).toBe('amazon');
    expect(result.carrierConfidence).toBe('high');
    expect(result.trackingNumberValid).toBe(true);
    expect(result.recipientName).toBe('James Morrison');
  });

  test('processes a USPS label with long tracking', () => {
    const result = processExtraction({
      carrier: 'USPS',
      trackingNumber: '9400111899223100012847',
      recipientName: 'SARAH TAYLOR',
      pmbNumber: 'PMB-0012',
      senderName: 'Etsy Seller',
      packageSize: 'small',
      confidence: 0.92,
    });

    expect(result.carrier).toBe('usps');
    expect(result.trackingNumberValid).toBe(true);
    expect(result.recipientName).toBe('Sarah Taylor');
  });

  test('handles FedEx HAL label', () => {
    const result = processExtraction({
      carrier: 'fedex',
      trackingNumber: '794644790128',
      recipientName: 'HOLD AT LOCATION - FedEx Office',
      recipientAddress: 'FedEx Office Hold At Location, 456 Oak Ave',
      senderName: 'Online Retailer',
      packageSize: 'medium',
      confidence: 0.88,
      rawLabelText: 'HOLD AT LOCATION',
    });

    expect(result.carrier).toBe('fedex');
    expect(result.serviceType).toBe('fedex_hal');
  });

  test('handles business recipient', () => {
    const result = processExtraction({
      carrier: 'ups',
      trackingNumber: '1Z999AA10123456784',
      recipientName: 'Acme Solutions LLC',
      pmbNumber: 'PMB-0100',
      senderName: 'Supplier Corp',
      packageSize: 'large',
      confidence: 0.90,
    });

    expect(result.recipientIsBusiness).toBe(true);
    expect(result.recipientName).toBe('Acme Solutions LLC');
  });

  test('handles missing/invalid tracking gracefully', () => {
    const result = processExtraction({
      carrier: 'ups',
      trackingNumber: '',
      recipientName: 'John Doe',
      packageSize: 'medium',
      confidence: 0.5,
    });

    expect(result.trackingNumberValid).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
  });

  test('degrades confidence for low-confidence carrier', () => {
    const result = processExtraction({
      carrier: 'unknown_carrier',
      trackingNumber: 'ABC123XYZ',
      recipientName: 'Jane Doe',
      confidence: 0.8,
    });

    expect(result.carrier).toBe('other');
    expect(result.confidence).toBeLessThan(0.8);
  });
});
