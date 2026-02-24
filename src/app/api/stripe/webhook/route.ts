import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';
import prisma from '@/lib/prisma';

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events for subscription lifecycle.
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

        // Record payment
        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (tenant) {
          await prisma.paymentRecord.create({
            data: {
              tenantId: tenant.id,
              amount: (invoice.amount_paid || 0) / 100,
              status: 'succeeded',
              method: 'stripe',
              description: `Invoice ${invoice.number || invoice.id}`,
              stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
              invoiceUrl: invoice.hosted_invoice_url || undefined,
            },
          });
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
          await prisma.paymentRecord.create({
            data: {
              tenantId: tenant.id,
              amount: (invoice.amount_due || 0) / 100,
              status: 'failed',
              method: 'stripe',
              description: `Failed: Invoice ${invoice.number || invoice.id}`,
              stripePaymentId: (invoice as unknown as Record<string, unknown>).payment_intent as string | undefined,
            },
          });

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

          // Cancel local subscription
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
