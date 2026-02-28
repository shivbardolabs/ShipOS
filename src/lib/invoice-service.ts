/**
 * BAR-306: Invoice Generation & Management Service
 *
 * Generates invoices from deferred TosCharge records with line-item detail.
 * Supports configurable invoicing schedules (weekly, bi-weekly, monthly, on-demand).
 *
 * Integrates with:
 *   - TosCharge — source of deferred charges to invoice
 *   - Invoice / InvoiceLineItem — output
 *   - CustomerBillingProfile — customer billing config
 *   - InvoiceSchedule — schedule config
 *   - PaymentMethod — auto-pay
 */

import prisma from './prisma';
import { generateInvoiceNumber } from './tos-billing-service';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface InvoiceGenerationResult {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amount: number;
  tax: number;
  total: number;
  lineItemCount: number;
  chargesInvoiced: number;
}

export interface InvoiceSummary {
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  amountDraft: number;
  amountSent: number;
  amountPaid: number;
  amountOverdue: number;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ── Invoice Generation ────────────────────────────────────────────────────── */

/**
 * Generate an invoice for a specific customer from their pending deferred charges.
 */
export async function generateInvoiceForCustomer(
  tenantId: string,
  customerId: string,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
    notes?: string;
    autoSend?: boolean;
  },
): Promise<InvoiceGenerationResult | null> {
  const periodEnd = options?.periodEnd || new Date();
  const periodStart = options?.periodStart || undefined;

  // Find all pending deferred charges for this customer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chargeWhere: Record<string, any> = {
    tenantId,
    customerId,
    mode: 'deferred',
    status: 'pending',
    createdAt: { lte: periodEnd },
  };
  if (periodStart) {
    chargeWhere.createdAt = { ...chargeWhere.createdAt, gte: periodStart };
  }

  const pendingCharges = await prisma.tosCharge.findMany({
    where: chargeWhere,
    orderBy: { createdAt: 'asc' },
  });

  if (pendingCharges.length === 0) return null;

  // Calculate totals
  const subtotal = round2(pendingCharges.reduce((sum, c) => sum + c.amount, 0));
  const totalTax = round2(pendingCharges.reduce((sum, c) => sum + c.tax, 0));
  const total = round2(subtotal + totalTax);

  // Get billing profile for payment terms
  const profile = await prisma.customerBillingProfile.findUnique({
    where: { customerId },
  });
  const billingConfig = await prisma.billingModelConfig.findUnique({
    where: { tenantId },
  });

  const paymentDays = profile?.paymentTermDays ?? billingConfig?.tosPaymentWindow ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentDays);

  const invoiceNumber = await generateInvoiceNumber(tenantId);

  // Create invoice with line items in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        tenantId,
        customerId,
        type: 'tos_billing',
        amount: subtotal,
        tax: totalTax,
        status: options?.autoSend ? 'sent' : 'draft',
        dueDate,
        notes: options?.notes || null,
        periodStart: periodStart || null,
        periodEnd,
        sentAt: options?.autoSend ? new Date() : null,
        sentVia: options?.autoSend ? 'email' : null,
      },
    });

    // Create line items from charges
    const lineItemData = pendingCharges.map((charge, idx) => ({
      invoiceId: inv.id,
      description: charge.description,
      serviceType: charge.referenceType || null,
      quantity: 1,
      unitPrice: charge.amount,
      amount: charge.amount,
      tosChargeId: charge.id,
      chargeEventId: charge.chargeEventId || null,
      sortOrder: idx,
    }));

    await tx.invoiceLineItem.createMany({ data: lineItemData });

    // Update TosCharge records to 'invoiced' status
    await tx.tosCharge.updateMany({
      where: { id: { in: pendingCharges.map((c) => c.id) } },
      data: {
        status: 'invoiced',
        invoiceId: inv.id,
      },
    });

    // Update linked ChargeEvent records to 'invoiced'
    const chargeEventIds = pendingCharges
      .filter((c) => c.chargeEventId)
      .map((c) => c.chargeEventId as string);

    if (chargeEventIds.length > 0) {
      await tx.chargeEvent.updateMany({
        where: { id: { in: chargeEventIds }, status: 'posted' },
        data: { status: 'invoiced' },
      });
    }

    return inv;
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId,
    amount: subtotal,
    tax: totalTax,
    total,
    lineItemCount: pendingCharges.length,
    chargesInvoiced: pendingCharges.length,
  };
}

/**
 * Generate invoices for ALL customers with pending deferred charges in a tenant.
 * Used by the scheduled invoicing cron.
 */
export async function generateBatchInvoices(
  tenantId: string,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
    autoSend?: boolean;
  },
): Promise<{
  invoicesCreated: number;
  totalAmount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let invoicesCreated = 0;
  let totalAmount = 0;

  // Find all customers with pending deferred charges
  const customersWithCharges = await prisma.tosCharge.findMany({
    where: {
      tenantId,
      mode: 'deferred',
      status: 'pending',
    },
    select: { customerId: true },
    distinct: ['customerId'],
  });

  for (const { customerId } of customersWithCharges) {
    try {
      const result = await generateInvoiceForCustomer(tenantId, customerId, options);
      if (result) {
        invoicesCreated++;
        totalAmount += result.amount + result.tax;
      }
    } catch (err) {
      const msg = `Failed to generate invoice for customer ${customerId}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      console.error('[invoice-service]', msg);
    }
  }

  return { invoicesCreated, totalAmount: round2(totalAmount), errors };
}

/* ── Invoice Payment ───────────────────────────────────────────────────────── */

/**
 * Record a payment against an invoice.
 */
export async function recordInvoicePayment(
  invoiceId: string,
  payment: {
    amount: number;
    paymentMethodId?: string;
    paymentRef?: string;
    method?: string; // card, ach, paypal, cash, check
  },
): Promise<{ invoice: { id: string; status: string; amountPaid: number } }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'paid') throw new Error('Invoice is already paid');
  if (invoice.status === 'void') throw new Error('Cannot pay a voided invoice');

  const totalDue = round2(invoice.amount + invoice.tax);
  const newAmountPaid = round2(invoice.amountPaid + payment.amount);
  const isPaidInFull = newAmountPaid >= totalDue;

  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: isPaidInFull ? 'paid' : 'partially_paid',
        paidAt: isPaidInFull ? new Date() : null,
        paymentMethodId: payment.paymentMethodId || null,
        paymentRef: payment.paymentRef || null,
      },
    });

    // If paid in full, update linked TosCharges and reduce account balance
    if (isPaidInFull && invoice.customerId) {
      await tx.tosCharge.updateMany({
        where: { invoiceId, status: 'invoiced' },
        data: { status: 'paid', paidAt: new Date() },
      });

      // Reduce account balance
      await tx.customerBillingProfile.updateMany({
        where: {
          customerId: invoice.customerId,
          accountBalance: { gt: 0 },
        },
        data: {
          accountBalance: { decrement: totalDue },
        },
      });
    }

    return inv;
  });

  return {
    invoice: {
      id: updated.id,
      status: updated.status,
      amountPaid: updated.amountPaid,
    },
  };
}

/* ── Invoice Status Management ─────────────────────────────────────────────── */

/**
 * Send an invoice (mark as sent).
 */
export async function sendInvoice(
  invoiceId: string,
  via: 'email' | 'in_app' | 'print' = 'email',
): Promise<void> {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      sentVia: via,
    },
  });
}

/**
 * Void an invoice — reverses TosCharge statuses back to pending.
 */
export async function voidInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'paid') throw new Error('Cannot void a paid invoice');

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: 'void' },
    });

    // Revert TosCharges to pending
    const tosChargeIds = invoice.lineItems
      .filter((li) => li.tosChargeId)
      .map((li) => li.tosChargeId as string);

    if (tosChargeIds.length > 0) {
      await tx.tosCharge.updateMany({
        where: { id: { in: tosChargeIds } },
        data: { status: 'pending', invoiceId: null },
      });
    }
  });
}

/* ── Invoice Summary ───────────────────────────────────────────────────────── */

/**
 * Get invoice summary stats for a tenant.
 */
export async function getInvoiceSummary(tenantId: string): Promise<InvoiceSummary> {
  const [draft, sent, paid, overdue] = await Promise.all([
    prisma.invoice.aggregate({
      where: { tenantId, status: 'draft' },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { tenantId, status: 'sent' },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { tenantId, status: 'paid' },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { tenantId, status: 'overdue' },
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  return {
    totalDraft: draft._count,
    totalSent: sent._count,
    totalPaid: paid._count,
    totalOverdue: overdue._count,
    amountDraft: draft._sum.amount ?? 0,
    amountSent: sent._sum.amount ?? 0,
    amountPaid: paid._sum.amount ?? 0,
    amountOverdue: overdue._sum.amount ?? 0,
  };
}

/* ── Auto-Pay Processing ───────────────────────────────────────────────────── */

/**
 * Process auto-pay for invoices due today.
 * Checks CustomerBillingProfile.autoPayEnabled and autoPayDay.
 */
export async function processAutoPay(tenantId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const errors: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Find customers with auto-pay enabled and due today
  const autoPayCustomers = await prisma.customerBillingProfile.findMany({
    where: {
      autoPayEnabled: true,
      autoPayDay: dayOfMonth,
      customer: { tenantId, status: 'active' },
    },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  for (const profile of autoPayCustomers) {
    // Find sent/overdue invoices for this customer
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        customerId: profile.customerId,
        status: { in: ['sent', 'overdue'] },
      },
    });

    for (const invoice of invoices) {
      processed++;
      try {
        // Find default payment method
        const paymentMethod = await prisma.paymentMethod.findFirst({
          where: { customerId: profile.customerId, isDefault: true, status: 'active' },
        });

        if (!paymentMethod) {
          errors.push(`No payment method for customer ${profile.customer.firstName} ${profile.customer.lastName}`);
          failed++;
          continue;
        }

        // Simulate payment processing
        const paymentRef = `autopay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const amountDue = round2(invoice.amount + invoice.tax - invoice.amountPaid);

        await recordInvoicePayment(invoice.id, {
          amount: amountDue,
          paymentMethodId: paymentMethod.id,
          paymentRef,
          method: paymentMethod.type,
        });

        succeeded++;
      } catch (err) {
        const msg = `Auto-pay failed for invoice ${invoice.invoiceNumber}: ${err instanceof Error ? err.message : 'Unknown'}`;
        errors.push(msg);
        failed++;
      }
    }
  }

  return { processed, succeeded, failed, errors };
}

/* ── Schedule Management ───────────────────────────────────────────────────── */

/**
 * Get or create the invoicing schedule for a tenant.
 */
export async function getOrCreateSchedule(
  tenantId: string,
  customerId?: string,
): Promise<{
  id: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  isActive: boolean;
  nextRunAt: Date | null;
}> {
  const existing = await prisma.invoiceSchedule.findUnique({
    where: { tenantId_customerId: { tenantId, customerId: customerId || '' } },
  });

  if (existing) return existing;

  // Create default schedule
  const nextRun = new Date();
  nextRun.setMonth(nextRun.getMonth() + 1);
  nextRun.setDate(1);

  return prisma.invoiceSchedule.create({
    data: {
      tenantId,
      customerId: customerId || null,
      frequency: 'monthly',
      dayOfMonth: 1,
      isActive: true,
      nextRunAt: nextRun,
    },
  });
}

/**
 * Update the invoicing schedule.
 */
export async function updateSchedule(
  scheduleId: string,
  data: {
    frequency?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    isActive?: boolean;
  },
): Promise<void> {
  await prisma.invoiceSchedule.update({
    where: { id: scheduleId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}
