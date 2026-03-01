import { withApiHandler, ok, unauthorized } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { getStripe, isStripeConfigured } from '@/lib/stripe';

/**
 * POST /api/cron/billing
 *
 * Idempotent monthly subscription billing batch job.
 *
 * Designed to run on the 1st of each month via Vercel Cron. It:
 *   1. Iterates all tenants with active subscriptions
 *   2. Checks if the tenant has already been billed for the current period
 *   3. If not, calculates the amount from the tenant's plan configuration
 *   4. Charges via Stripe if configured, otherwise records as manual
 *   5. Creates a PaymentRecord with billingPeriod for idempotency
 *
 * Idempotency guarantee: The billingPeriod field (YYYY-MM) + unique constraint
 * on [tenantId, billingPeriod] ensures re-running the job cannot double-charge.
 *
 * Protected by CRON_SECRET header to prevent unauthorized invocation.
 */

interface BillingResult {
  tenantId: string;
  tenantName: string;
  planName: string;
  amount: number;
  status: 'charged' | 'already_billed' | 'skipped' | 'failed';
  method: string;
  error?: string;
}

export const POST = withApiHandler(async (request) => {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    unauthorized('Unauthorized');
  }

  // Allow overriding the billing period for testing/backfills
  const body = await request.json().catch(() => ({}));
  const now = new Date();

  // Determine billing period (YYYY-MM)
  const billingPeriod =
    (body as Record<string, string>).billingPeriod ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Period boundaries for the billing month
  const [year, month] = billingPeriod.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1); // 1st of the month
  const periodEnd = new Date(year, month, 1); // 1st of next month

  const stripe = isStripeConfigured() ? getStripe() : null;

  const results: BillingResult[] = [];
  let totalCharged = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalAlreadyBilled = 0;

  // Fetch all active subscriptions with their tenant and plan
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ['active', 'manual', 'trialing'] },
    },
    include: {
      tenant: true,
      plan: true,
    },
  });

  for (const subscription of subscriptions) {
    const { tenant, plan } = subscription;

    // Skip tenants that are not active
    if (tenant.status !== 'active') {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        planName: plan.name,
        amount: 0,
        status: 'skipped',
        method: 'none',
        error: `Tenant status: ${tenant.status}`,
      });
      totalSkipped++;
      continue;
    }

    // IDEMPOTENCY CHECK: Has this tenant already been billed for this period?
    const existingPayment = await prisma.paymentRecord.findUnique({
      where: {
        unique_tenant_billing_period: {
          tenantId: tenant.id,
          billingPeriod,
        },
      },
    });

    if (existingPayment) {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        planName: plan.name,
        amount: existingPayment.amount,
        status: 'already_billed',
        method: existingPayment.method,
      });
      totalAlreadyBilled++;
      continue;
    }

    // Calculate the billing amount from the plan
    const amount =
      subscription.billingCycle === 'yearly'
        ? (plan.priceYearly ?? plan.priceMonthly * 12) / 12 // Amortized monthly
        : plan.priceMonthly;

    if (amount <= 0) {
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        planName: plan.name,
        amount: 0,
        status: 'skipped',
        method: 'none',
        error: 'Zero amount — free plan',
      });
      totalSkipped++;
      continue;
    }

    // Attempt to charge via Stripe
    if (stripe && tenant.stripeCustomerId) {
      try {
        // Create a Stripe invoice for this billing period
        const invoice = await stripe.invoices.create({
          customer: tenant.stripeCustomerId,
          collection_method: 'charge_automatically',
          auto_advance: true,
          metadata: {
            tenantId: tenant.id,
            billingPeriod,
            subscriptionId: subscription.id,
          },
        });

        // Add the line item
        await stripe.invoiceItems.create({
          customer: tenant.stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(amount * 100), // Stripe uses cents
          currency: 'usd',
          description: `${plan.name} Plan — ${billingPeriod}`,
        });

        // Finalize and pay the invoice
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);

        // Record payment locally
        await prisma.paymentRecord.create({
          data: {
            tenantId: tenant.id,
            amount,
            currency: 'usd',
            status: paidInvoice.status === 'paid' ? 'succeeded' : 'pending',
            method: 'stripe',
            description: `${plan.name} Plan — ${billingPeriod}`,
            stripePaymentId: (paidInvoice as unknown as Record<string, string>).payment_intent ?? undefined,
            stripeInvoiceId: paidInvoice.id,
            invoiceUrl: paidInvoice.hosted_invoice_url ?? undefined,
            billingPeriod,
            periodStart,
            periodEnd,
          },
        });

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          planName: plan.name,
          amount,
          status: 'charged',
          method: 'stripe',
        });
        totalCharged++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Stripe charge failed';

        // Record the failure for visibility
        try {
          await prisma.paymentRecord.create({
            data: {
              tenantId: tenant.id,
              amount,
              currency: 'usd',
              status: 'failed',
              method: 'stripe',
              description: `FAILED: ${plan.name} Plan — ${billingPeriod}`,
              billingPeriod,
              periodStart,
              periodEnd,
            },
          });
        } catch {
          // If the unique constraint fires, the failure was already recorded
        }

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          planName: plan.name,
          amount,
          status: 'failed',
          method: 'stripe',
          error: errorMsg,
        });
        totalFailed++;
      }
    } else {
      // No Stripe — record as manual billing
      await prisma.paymentRecord.create({
        data: {
          tenantId: tenant.id,
          amount,
          currency: 'usd',
          status: 'pending',
          method: 'manual',
          description: `${plan.name} Plan — ${billingPeriod} (manual billing)`,
          billingPeriod,
          periodStart,
          periodEnd,
        },
      });

      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        planName: plan.name,
        amount,
        status: 'charged',
        method: 'manual',
      });
      totalCharged++;
    }

    // Update subscription period
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  return ok({
    success: true,
    billingPeriod,
    processedAt: now.toISOString(),
    summary: {
      totalSubscriptions: subscriptions.length,
      charged: totalCharged,
      alreadyBilled: totalAlreadyBilled,
      skipped: totalSkipped,
      failed: totalFailed,
    },
    results,
  });
}, { public: true });

/** GET handler for Vercel Cron compatibility */
export const GET = POST;
