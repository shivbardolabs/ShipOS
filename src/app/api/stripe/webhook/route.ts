import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/webhook
 *
 * Handle Stripe webhook events for subscription lifecycle.
 * Records payments with billing period for idempotency with the batch job.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = getStripeWebhookSecret();

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (tenant) {
          // Extract billing period from invoice metadata or dates
          const billingPeriod = extractBillingPeriod(invoice);
          const periodDates = extractPeriodDates(invoice);

          // Use upsert to avoid conflicts with batch job records
          if (billingPeriod) {
            await prisma.paymentRecord.upsert({
              where: {
                unique_tenant_billing_period: {
                  tenantId: tenant.id,
                  billingPeriod,
                },
              },
              update: {
                amount: (invoice.amount_paid || 0) / 100,
                status: 'succeeded',
                method: 'stripe',
                description: `Invoice ${invoice.number || invoice.id}`,
                stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
                stripeInvoiceId: invoice.id,
                invoiceUrl: invoice.hosted_invoice_url || undefined,
              },
              create: {
                tenantId: tenant.id,
                amount: (invoice.amount_paid || 0) / 100,
                status: 'succeeded',
                method: 'stripe',
                description: `Invoice ${invoice.number || invoice.id}`,
                stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
                stripeInvoiceId: invoice.id,
                invoiceUrl: invoice.hosted_invoice_url || undefined,
                billingPeriod,
                periodStart: periodDates.start,
                periodEnd: periodDates.end,
              },
            });
          } else {
            // No billing period (one-off invoice) — create without idempotency key
            await prisma.paymentRecord.create({
              data: {
                tenantId: tenant.id,
                amount: (invoice.amount_paid || 0) / 100,
                status: 'succeeded',
                method: 'stripe',
                description: `Invoice ${invoice.number || invoice.id}`,
                stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
                stripeInvoiceId: invoice.id,
                invoiceUrl: invoice.hosted_invoice_url || undefined,
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (tenant) {
          const billingPeriod = extractBillingPeriod(invoice);
          const periodDates = extractPeriodDates(invoice);

          if (billingPeriod) {
            await prisma.paymentRecord.upsert({
              where: {
                unique_tenant_billing_period: {
                  tenantId: tenant.id,
                  billingPeriod,
                },
              },
              update: {
                status: 'failed',
                description: `Failed: Invoice ${invoice.number || invoice.id}`,
                stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
                stripeInvoiceId: invoice.id,
              },
              create: {
                tenantId: tenant.id,
                amount: (invoice.amount_due || 0) / 100,
                status: 'failed',
                method: 'stripe',
                description: `Failed: Invoice ${invoice.number || invoice.id}`,
                stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
                stripeInvoiceId: invoice.id,
                billingPeriod,
                periodStart: periodDates.start,
                periodEnd: periodDates.end,
              },
            });
          } else {
            await prisma.paymentRecord.create({
              data: {
                tenantId: tenant.id,
                amount: (invoice.amount_due || 0) / 100,
                status: 'failed',
                method: 'stripe',
                description: `Failed: Invoice ${invoice.number || invoice.id}`,
                stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
                stripeInvoiceId: invoice.id,
              },
            });
          }

          // Update subscription status
          await prisma.subscription.updateMany({
            where: { tenantId: tenant.id, status: 'active' },
            data: { status: 'past_due' },
          });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price?.id || null,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (tenant) {
          // Sync subscription status
          const statusMap: Record<string, string> = {
            active: 'active',
            past_due: 'past_due',
            canceled: 'canceled',
            trialing: 'trialing',
            unpaid: 'past_due',
          };
          const localStatus = statusMap[subscription.status] || subscription.status;

          // In Stripe SDK v20+, current_period_start/end are on subscription items
          const firstItem = subscription.items.data[0];
          const periodStart = (firstItem as unknown as Record<string, unknown>)?.current_period_start as number | undefined;
          const periodEnd = (firstItem as unknown as Record<string, unknown>)?.current_period_end as number | undefined;

          await prisma.subscription.updateMany({
            where: { tenantId: tenant.id, stripeSubscriptionId: subscription.id },
            data: {
              status: localStatus,
              ...(periodStart && { currentPeriodStart: new Date(periodStart * 1000) }),
              ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000) }),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });

          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              stripePriceId: subscription.items.data[0]?.price?.id || null,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          });

          await prisma.subscription.updateMany({
            where: { tenantId: tenant.id, stripeSubscriptionId: subscription.id },
            data: { status: 'canceled' },
          });
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Extract billing period from a Stripe invoice.
 * Checks metadata first, then falls back to period_start date.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBillingPeriod(invoice: any): string | null {
  // Check invoice metadata (set by our batch job)
  if (invoice.metadata?.billingPeriod) {
    return invoice.metadata.billingPeriod;
  }

  // Fall back to invoice period
  if (invoice.period_start) {
    const date = new Date(invoice.period_start * 1000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Extract period start/end dates from a Stripe invoice.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPeriodDates(invoice: any): { start: Date | undefined; end: Date | undefined } {
  return {
    start: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
    end: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
  };
}
