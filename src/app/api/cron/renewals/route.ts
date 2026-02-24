import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/service';

/**
 * POST /api/cron/renewals
 *
 * Cron-style endpoint that processes customer renewals:
 * - 30/15/7/1 day reminders before renewalDate
 * - Auto-generates invoices for upcoming renewals
 * - Marks accounts as past_due when renewalDate passes
 * - Sends suspension notice after 15-day grace period
 *
 * Protected by CRON_SECRET header to prevent unauthorized invocation.
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      reminders30: 0,
      reminders15: 0,
      reminders7: 0,
      reminders1: 0,
      invoicesCreated: 0,
      markedPastDue: 0,
      suspended: 0,
      errors: [] as string[],
    };

    // Fetch all active customers with a renewalDate
    const customers = await prisma.customer.findMany({
      where: {
        status: { in: ['active', 'suspended'] },
        renewalDate: { not: null },
        deletedAt: null,
      },
      include: { tenant: true },
    });

    for (const customer of customers) {
      if (!customer.renewalDate) continue;

      const daysUntilRenewal = Math.ceil(
        (customer.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSincePastDue = -daysUntilRenewal;

      try {
        // ── Suspension: 15+ days past due ─────────────────────────────────
        if (daysSincePastDue >= 15 && customer.renewalStatus !== 'suspended') {
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              renewalStatus: 'suspended',
              status: 'suspended',
              lastRenewalNotice: now,
            },
          });

          await sendNotification({
            type: 'custom',
            customerId: customer.id,
            subject: '⛔ Account Suspended — Renewal Overdue',
            body: `Hi ${customer.firstName}, your mailbox ${customer.pmbNumber} has been suspended due to non-payment. Your renewal was due ${Math.abs(daysSincePastDue)} days ago. Please contact us immediately to restore service.`,
            channel: 'both',
          });

          results.suspended++;
          continue;
        }

        // ── Past due: renewal date has passed ─────────────────────────────
        if (daysUntilRenewal < 0 && customer.renewalStatus !== 'past_due' && customer.renewalStatus !== 'suspended') {
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              renewalStatus: 'past_due',
              lastRenewalNotice: now,
            },
          });

          await sendNotification({
            type: 'custom',
            customerId: customer.id,
            subject: '⚠️ Mailbox Renewal Past Due',
            body: `Hi ${customer.firstName}, your mailbox ${customer.pmbNumber} renewal is past due. Please renew immediately to avoid account suspension. You have ${15 - daysSincePastDue} days remaining before suspension.`,
            channel: 'both',
          });

          results.markedPastDue++;
          continue;
        }

        // ── Reminder windows: 30, 15, 7, 1 days ──────────────────────────
        const reminderWindows = [30, 15, 7, 1];
        const matchedWindow = reminderWindows.find((w) => daysUntilRenewal === w);

        if (matchedWindow) {
          // Check if we already sent a notice today
          if (
            customer.lastRenewalNotice &&
            isSameDay(customer.lastRenewalNotice, now)
          ) {
            continue;
          }

          // Update status to due_soon if within 30 days
          if (customer.renewalStatus !== 'due_soon') {
            await prisma.customer.update({
              where: { id: customer.id },
              data: { renewalStatus: 'due_soon' },
            });
          }

          // Auto-generate invoice at 30-day mark
          if (matchedWindow === 30) {
            const existingInvoice = await prisma.invoice.findFirst({
              where: {
                customerId: customer.id,
                type: 'service',
                status: { in: ['draft', 'sent'] },
                dueDate: customer.renewalDate,
              },
            });

            if (!existingInvoice) {
              const invoiceNumber = `REN-${customer.pmbNumber}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
              await prisma.invoice.create({
                data: {
                  invoiceNumber,
                  customerId: customer.id,
                  type: 'service',
                  amount: 0, // Will be filled by tenant pricing
                  status: 'draft',
                  dueDate: customer.renewalDate,
                  items: JSON.stringify([
                    { description: `Mailbox ${customer.pmbNumber} Renewal`, quantity: 1, price: 0 },
                  ]),
                },
              });
              results.invoicesCreated++;
            }
          }

          // Send reminder notification
          await sendNotification({
            type: 'renewal_reminder',
            customerId: customer.id,
            data: {
              renewalDate: customer.renewalDate.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              }),
              daysUntilRenewal: matchedWindow,
            },
          });

          await prisma.customer.update({
            where: { id: customer.id },
            data: { lastRenewalNotice: now },
          });

          switch (matchedWindow) {
            case 30: results.reminders30++; break;
            case 15: results.reminders15++; break;
            case 7: results.reminders7++; break;
            case 1: results.reminders1++; break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Customer ${customer.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      processedAt: now.toISOString(),
      totalCustomers: customers.length,
      ...results,
    });
  } catch (err) {
    console.error('[POST /api/cron/renewals]', err);
    return NextResponse.json({ error: 'Renewal processing failed' }, { status: 500 });
  }
}

/** GET for Vercel Cron compatibility */
export async function GET(request: Request) {
  return POST(request);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
