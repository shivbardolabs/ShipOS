/**
 * Demo Payment Processor — BAR-185
 *
 * A mock payment processor that simulates Stripe-like operations for
 * development and demo purposes. No real charges are ever made.
 *
 * Features:
 *   - Accepts all-zero card numbers (0000 0000 0000 0000) as valid
 *   - Accepts any future expiry date and any 3-digit CVV
 *   - Returns success for all charge attempts
 *   - Generates mock transaction IDs: demo_txn_{timestamp}
 *   - Populates invoices and receipts with realistic dummy data
 */

/* ── Types ──────────────────────────────────────────────────────────────────── */

export interface DemoCardInput {
  number: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

export interface DemoChargeResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  last4: string;
  brand: string;
  status: 'succeeded' | 'failed';
  createdAt: string;
  receiptUrl: string;
}

export interface DemoSetupIntentResult {
  clientSecret: string;
  customerId: string;
  setupIntentId: string;
}

export interface DemoInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: 'paid' | 'open' | 'draft';
  description: string;
  lineItems: DemoLineItem[];
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
  transactionId: string;
  receiptUrl: string;
}

export interface DemoLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  serviceType: string;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

/** Demo card number that is always accepted */
export const DEMO_CARD_NUMBER = '0000000000000000';

/** Formatted demo card number for display */
export const DEMO_CARD_DISPLAY = '0000 0000 0000 0000';

/* ── Demo Payment Processor ─────────────────────────────────────────────────── */

export class DemoPaymentProcessor {
  /**
   * Generate a unique mock transaction ID.
   */
  static generateTransactionId(): string {
    return `demo_txn_${Date.now()}`;
  }

  /**
   * Generate a unique mock setup intent ID.
   */
  static generateSetupIntentId(): string {
    return `demo_seti_${Date.now()}`;
  }

  /**
   * Generate a mock invoice number.
   */
  static generateInvoiceNumber(): string {
    const now = new Date();
    const seq = Math.floor(Math.random() * 9000) + 1000;
    return `DEMO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`;
  }

  /**
   * Validate a demo card number.
   * Accepts all-zero card numbers (with or without spaces/dashes).
   */
  static isValidDemoCard(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    return cleaned === DEMO_CARD_NUMBER;
  }

  /**
   * Validate card expiry date.
   * Accepts any future date.
   */
  static isValidExpiry(month: number, year: number): boolean {
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  }

  /**
   * Validate CVV — any 3 or 4 digit number is accepted in demo mode.
   */
  static isValidCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
  }

  /**
   * Validate a complete demo card input.
   */
  static validateCard(card: DemoCardInput): { valid: boolean; error?: string } {
    if (!this.isValidDemoCard(card.number)) {
      return { valid: false, error: 'In demo mode, use card number 0000 0000 0000 0000' };
    }
    if (!this.isValidExpiry(card.expMonth, card.expYear)) {
      return { valid: false, error: 'Expiry date must be in the future' };
    }
    if (!this.isValidCVV(card.cvv)) {
      return { valid: false, error: 'CVV must be 3 or 4 digits' };
    }
    return { valid: true };
  }

  /**
   * Simulate creating a SetupIntent (for adding a payment method).
   */
  static createSetupIntent(tenantId: string): DemoSetupIntentResult {
    return {
      clientSecret: `demo_secret_${Date.now()}_${tenantId}`,
      customerId: `demo_cus_${tenantId}`,
      setupIntentId: this.generateSetupIntentId(),
    };
  }

  /**
   * Simulate charging a card. Always returns success for demo cards.
   */
  static charge(amount: number, currency: string = 'usd'): DemoChargeResult {
    const txnId = this.generateTransactionId();
    return {
      success: true,
      transactionId: txnId,
      amount,
      currency,
      last4: '0000',
      brand: 'demo',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
      receiptUrl: `#demo-receipt-${txnId}`,
    };
  }

  /**
   * Generate a set of realistic demo invoices for billing history.
   * Creates invoices for the last N months with varied line items.
   */
  static generateDemoInvoices(
    tenantName: string,
    monthsBack: number = 6,
  ): DemoInvoice[] {
    const invoices: DemoInvoice[] = [];
    const now = new Date();

    const serviceTemplates: DemoLineItem[][] = [
      [
        { description: 'ShipOS Pro — Monthly Subscription', quantity: 1, unitPrice: 99.0, amount: 99.0, serviceType: 'subscription' },
        { description: 'Package Scans (AI Smart Intake)', quantity: 247, unitPrice: 0.05, amount: 12.35, serviceType: 'usage' },
        { description: 'SMS Notifications', quantity: 156, unitPrice: 0.03, amount: 4.68, serviceType: 'usage' },
      ],
      [
        { description: 'ShipOS Pro — Monthly Subscription', quantity: 1, unitPrice: 99.0, amount: 99.0, serviceType: 'subscription' },
        { description: 'Package Scans (AI Smart Intake)', quantity: 312, unitPrice: 0.05, amount: 15.60, serviceType: 'usage' },
        { description: 'SMS Notifications', quantity: 189, unitPrice: 0.03, amount: 5.67, serviceType: 'usage' },
        { description: 'Storage Fees — Extended Hold', quantity: 14, unitPrice: 1.0, amount: 14.0, serviceType: 'storage' },
      ],
      [
        { description: 'ShipOS Pro — Monthly Subscription', quantity: 1, unitPrice: 99.0, amount: 99.0, serviceType: 'subscription' },
        { description: 'Package Scans (AI Smart Intake)', quantity: 198, unitPrice: 0.05, amount: 9.90, serviceType: 'usage' },
        { description: 'SMS Notifications', quantity: 134, unitPrice: 0.03, amount: 4.02, serviceType: 'usage' },
      ],
    ];

    for (let i = 0; i < monthsBack; i++) {
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);
      const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
      const billingPeriod = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

      const template = serviceTemplates[i % serviceTemplates.length];
      const lineItems = template.map((item) => ({ ...item }));

      // Slightly randomize amounts for realism
      for (const item of lineItems) {
        if (item.serviceType !== 'subscription') {
          const variance = 0.85 + Math.random() * 0.3;
          item.quantity = Math.round(item.quantity * variance);
          item.amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
        }
      }

      const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
      const tax = Math.round(subtotal * 0.0875 * 100) / 100; // 8.75% tax
      const total = Math.round((subtotal + tax) * 100) / 100;
      const txnId = `demo_txn_${periodEnd.getTime()}`;

      invoices.push({
        id: `demo_inv_${billingPeriod}`,
        invoiceNumber: `DEMO-${billingPeriod.replace('-', '')}-${1000 + i}`,
        amount: subtotal,
        tax,
        total,
        currency: 'usd',
        status: i === 0 ? 'open' : 'paid',
        description: `${tenantName} — ${billingPeriod} billing`,
        lineItems,
        billingPeriod,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        paidAt: i === 0 ? null : new Date(periodEnd.getTime() + 86400000).toISOString(),
        createdAt: periodEnd.toISOString(),
        transactionId: txnId,
        receiptUrl: `#demo-receipt-${txnId}`,
      });
    }

    return invoices;
  }

  /**
   * Generate a demo payment method record for database seeding.
   */
  static createPaymentMethodData(tenantId: string, customerId: string) {
    return {
      tenantId,
      customerId,
      type: 'card' as const,
      label: 'Demo Card ****0000',
      isDefault: true,
      status: 'active',
      cardBrand: 'demo',
      cardLast4: '0000',
      cardExpMonth: 12,
      cardExpYear: new Date().getFullYear() + 2,
      verifiedAt: new Date(),
      externalId: `demo_pm_${Date.now()}`,
    };
  }
}
