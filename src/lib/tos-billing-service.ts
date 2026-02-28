/**
 * BAR-306: Time-of-Service Billing Service
 *
 * Two settlement paths:
 *   Path A — Immediate Charge: Charge card on file at time of service
 *   Path B — Deferred: Add to account balance, settle via scheduled invoicing
 *
 * Integrates with:
 *   - ChargeEvent (BAR-309) — source of billable events
 *   - BillingModelConfig / CustomerBillingProfile (BAR-305) — config
 *   - PaymentMethod — stored payment instruments
 *   - Invoice / InvoiceLineItem — deferred billing output
 */

import prisma from './prisma';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface ImmediateChargeInput {
  tenantId: string;
  customerId: string;
  description: string;
  amount: number;
  tax?: number;
  serviceType?: string;
  chargeEventId?: string;
  paymentMethodId?: string; // Specific payment method; null = use default
  referenceType?: string;
  referenceId?: string;
}

export interface ImmediateChargeResult {
  tosChargeId: string;
  status: 'paid' | 'failed';
  paymentRef?: string;
  failureReason?: string;
}

export interface DeferredChargeInput {
  tenantId: string;
  customerId: string;
  description: string;
  amount: number;
  tax?: number;
  serviceType?: string;
  chargeEventId?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface DeferredChargeResult {
  tosChargeId: string;
  newBalance: number;
  dueDate: Date;
}

export interface AccountBalanceSummary {
  customerId: string;
  customerName: string;
  pmbNumber: string;
  accountBalance: number;
  creditLimit: number;
  pendingCharges: number;
  totalOwed: number;
  oldestUnpaidDate: Date | null;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Generate a unique invoice number: INV-YYYYMMDD-XXXXX
 */
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.invoice.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      },
    },
  });
  return `INV-${dateStr}-${String(count + 1).padStart(5, '0')}`;
}

/* ── Path A: Immediate Charge ──────────────────────────────────────────────── */

/**
 * Process an immediate charge against the customer's card on file.
 *
 * Steps:
 * 1. Resolve the payment method (explicit or default)
 * 2. Authorize & capture (simulated — real integration with Stripe/PayPal later)
 * 3. Record the TosCharge with paid status
 * 4. If payment fails, fall back to deferred mode
 */
export async function processImmediateCharge(
  input: ImmediateChargeInput,
): Promise<ImmediateChargeResult> {
  const {
    tenantId,
    customerId,
    description,
    amount,
    tax = 0,
    serviceType,
    chargeEventId,
    paymentMethodId,
    referenceType,
    referenceId,
  } = input;

  const total = round2(amount + tax);

  // Resolve payment method
  let paymentMethod = null;
  if (paymentMethodId) {
    paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, customerId, status: 'active' },
    });
  } else {
    // Use default payment method
    paymentMethod = await prisma.paymentMethod.findFirst({
      where: { customerId, isDefault: true, status: 'active' },
    });
  }

  if (!paymentMethod) {
    // No payment method → fall back to deferred
    const deferred = await processDeferredCharge({
      tenantId,
      customerId,
      description,
      amount,
      tax,
      serviceType,
      chargeEventId,
      referenceType,
      referenceId,
    });
    return {
      tosChargeId: deferred.tosChargeId,
      status: 'failed',
      failureReason: 'No active payment method on file — charge deferred to account balance',
    };
  }

  // Simulate authorization & capture
  // In production, this would call Stripe/PayPal/ACH processor
  const paymentRef = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const paymentSuccess = true; // Simulated — always succeeds for now

  if (paymentSuccess) {
    const charge = await prisma.tosCharge.create({
      data: {
        tenantId,
        customerId,
        description,
        amount,
        tax,
        total,
        status: 'paid',
        mode: 'immediate',
        paymentMethod: paymentMethod.type,
        paymentMethodId: paymentMethod.id,
        paymentRef,
        paidAt: new Date(),
        chargeEventId: chargeEventId || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
      },
    });

    // Update charge event status to paid if linked
    if (chargeEventId) {
      await prisma.chargeEvent.update({
        where: { id: chargeEventId },
        data: { status: 'paid' },
      }).catch(() => { /* charge event may not exist */ });
    }

    return {
      tosChargeId: charge.id,
      status: 'paid',
      paymentRef,
    };
  }

  // Payment failed → create failed charge and fall back to deferred
  const failedCharge = await prisma.tosCharge.create({
    data: {
      tenantId,
      customerId,
      description,
      amount,
      tax,
      total,
      status: 'failed',
      mode: 'immediate',
      paymentMethod: paymentMethod.type,
      paymentMethodId: paymentMethod.id,
      failureReason: 'Payment authorization failed',
      retryCount: 0,
      chargeEventId: chargeEventId || null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
    },
  });

  // Auto-fallback to deferred
  const deferred = await processDeferredCharge({
    tenantId,
    customerId,
    description: `${description} (deferred after failed payment)`,
    amount,
    tax,
    serviceType,
    chargeEventId,
    referenceType,
    referenceId,
  });

  return {
    tosChargeId: failedCharge.id,
    status: 'failed',
    failureReason: `Payment failed on ${paymentMethod.label}. Charge deferred to account (TOS: ${deferred.tosChargeId}).`,
  };
}

/* ── Path B: Deferred Charge ───────────────────────────────────────────────── */

/**
 * Add a charge to the customer's running account balance.
 *
 * Steps:
 * 1. Create a TosCharge in "deferred" mode
 * 2. Increment the customer's accountBalance in CustomerBillingProfile
 * 3. Return the new balance
 */
export async function processDeferredCharge(
  input: DeferredChargeInput,
): Promise<DeferredChargeResult> {
  const {
    tenantId,
    customerId,
    description,
    amount,
    tax = 0,
    chargeEventId,
    referenceType,
    referenceId,
  } = input;

  const total = round2(amount + tax);

  // Get billing config for payment terms
  const billingConfig = await prisma.billingModelConfig.findUnique({
    where: { tenantId },
  });
  const profile = await prisma.customerBillingProfile.findUnique({
    where: { customerId },
  });

  const paymentDays = profile?.paymentTermDays ?? billingConfig?.tosPaymentWindow ?? 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentDays);

  // Create the deferred TosCharge
  const charge = await prisma.tosCharge.create({
    data: {
      tenantId,
      customerId,
      description,
      amount,
      tax,
      total,
      status: 'pending',
      mode: 'deferred',
      dueDate,
      chargeEventId: chargeEventId || null,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
    },
  });

  // Increment account balance (upsert billing profile if needed)
  const updatedProfile = await prisma.customerBillingProfile.upsert({
    where: { customerId },
    update: {
      accountBalance: { increment: total },
    },
    create: {
      customerId,
      billingModel: 'tos',
      accountBalance: total,
      creditLimit: 500, // Default credit limit
    },
  });

  // Update charge event status if linked
  if (chargeEventId) {
    await prisma.chargeEvent.update({
      where: { id: chargeEventId },
      data: { status: 'posted' },
    }).catch(() => { /* charge event may not exist */ });
  }

  return {
    tosChargeId: charge.id,
    newBalance: updatedProfile.accountBalance,
    dueDate,
  };
}

/* ── Retry Failed Immediate Charge ─────────────────────────────────────────── */

/**
 * Retry a failed immediate charge. Max 3 retries before permanent deferral.
 */
export async function retryFailedCharge(tosChargeId: string): Promise<ImmediateChargeResult> {
  const charge = await prisma.tosCharge.findUnique({
    where: { id: tosChargeId },
  });

  if (!charge || charge.status !== 'failed') {
    throw new Error('Charge not found or not in failed status');
  }

  if (charge.retryCount >= 3) {
    throw new Error('Maximum retry attempts (3) exceeded. Charge must be handled manually.');
  }

  // Increment retry count
  await prisma.tosCharge.update({
    where: { id: tosChargeId },
    data: {
      retryCount: { increment: 1 },
      lastRetryAt: new Date(),
    },
  });

  // Re-attempt the immediate charge
  return processImmediateCharge({
    tenantId: charge.tenantId,
    customerId: charge.customerId,
    description: charge.description,
    amount: charge.amount,
    tax: charge.tax,
    chargeEventId: charge.chargeEventId || undefined,
    paymentMethodId: charge.paymentMethodId || undefined,
    referenceType: charge.referenceType || undefined,
    referenceId: charge.referenceId || undefined,
  });
}

/* ── Account Balance Queries ───────────────────────────────────────────────── */

/**
 * Get account balance summary for a customer.
 */
export async function getAccountBalance(
  customerId: string,
): Promise<AccountBalanceSummary | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      pmbNumber: true,
      billingProfile: true,
    },
  });

  if (!customer) return null;

  // Count pending deferred charges
  const pendingAgg = await prisma.tosCharge.aggregate({
    where: {
      customerId,
      mode: 'deferred',
      status: { in: ['pending', 'invoiced'] },
    },
    _sum: { total: true },
    _min: { createdAt: true },
  });

  return {
    customerId: customer.id,
    customerName: `${customer.firstName} ${customer.lastName}`,
    pmbNumber: customer.pmbNumber,
    accountBalance: customer.billingProfile?.accountBalance ?? 0,
    creditLimit: customer.billingProfile?.creditLimit ?? 0,
    pendingCharges: pendingAgg._sum.total ?? 0,
    totalOwed: (customer.billingProfile?.accountBalance ?? 0),
    oldestUnpaidDate: pendingAgg._min.createdAt ?? null,
  };
}

/**
 * Get all customers with outstanding balances for a tenant.
 */
export async function getOutstandingBalances(
  tenantId: string,
): Promise<AccountBalanceSummary[]> {
  const profiles = await prisma.customerBillingProfile.findMany({
    where: {
      accountBalance: { gt: 0 },
      customer: { tenantId },
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          pmbNumber: true,
        },
      },
    },
    orderBy: { accountBalance: 'desc' },
  });

  return profiles.map((p) => ({
    customerId: p.customer.id,
    customerName: `${p.customer.firstName} ${p.customer.lastName}`,
    pmbNumber: p.customer.pmbNumber,
    accountBalance: p.accountBalance,
    creditLimit: p.creditLimit,
    pendingCharges: 0, // Populated separately if needed
    totalOwed: p.accountBalance,
    oldestUnpaidDate: null,
  }));
}

/* ── Process Charge Event via TOS Billing ──────────────────────────────────── */

/**
 * Main entry point: route a charge event through the TOS billing pipeline.
 * Determines whether to use immediate or deferred path based on config.
 */
export async function processChargeViaTos(params: {
  tenantId: string;
  customerId: string;
  description: string;
  amount: number;
  tax?: number;
  serviceType?: string;
  chargeEventId?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<{ tosChargeId: string; mode: string; status: string }> {
  const billingConfig = await prisma.billingModelConfig.findUnique({
    where: { tenantId: params.tenantId },
  });

  const profile = await prisma.customerBillingProfile.findUnique({
    where: { customerId: params.customerId },
  });

  // Determine mode: customer override > tenant default > immediate
  const mode = profile?.tosMode || billingConfig?.tosDefaultMode || 'immediate';

  if (mode === 'immediate') {
    const result = await processImmediateCharge(params);
    return {
      tosChargeId: result.tosChargeId,
      mode: 'immediate',
      status: result.status,
    };
  }

  // Deferred path
  const result = await processDeferredCharge(params);
  return {
    tosChargeId: result.tosChargeId,
    mode: 'deferred',
    status: 'pending',
  };
}
