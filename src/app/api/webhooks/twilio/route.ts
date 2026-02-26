import prisma from '@/lib/prisma';
import { formatPhoneE164 } from '@/lib/notifications/twilio';

// ---------------------------------------------------------------------------
// Keyword sets (CTIA / TCPA standard)
// ---------------------------------------------------------------------------

const OPT_OUT_KEYWORDS = new Set([
  'STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL',
]);
const OPT_IN_KEYWORDS = new Set([
  'START', 'YES', 'UNSTOP', 'SUBSCRIBE',
]);
const HELP_KEYWORDS = new Set(['HELP', 'INFO']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function twimlResponse(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function emptyTwiml(): Response {
  return new Response('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// Inbound message logging
// ---------------------------------------------------------------------------

async function logInboundMessage(data: {
  from: string;
  to: string;
  body: string;
  messageSid?: string;
  customerId?: string;
  action: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: `sms_inbound_${data.action}`,
        entityType: 'sms',
        entityId: data.messageSid || data.from,
        details: JSON.stringify({
          from: data.from,
          to: data.to,
          body: data.body,
          customerId: data.customerId,
          timestamp: new Date().toISOString(),
        }),
        userId: 'system',
      },
    });
  } catch (err) {
    console.error('[Twilio Webhook] Failed to log inbound message:', err);
  }
}

// ---------------------------------------------------------------------------
// SmsConsent management
// ---------------------------------------------------------------------------

async function recordSmsConsent(params: {
  customerId: string;
  phone: string;
  method: string;
}) {
  try {
    // Upsert: find existing consent for this customer or create new
    const existing = await prisma.smsConsent.findFirst({
      where: { customerId: params.customerId, phone: params.phone },
    });

    if (existing) {
      await prisma.smsConsent.update({
        where: { id: existing.id },
        data: {
          consentedAt: new Date(),
          method: params.method,
          optedOutAt: null,
        },
      });
    } else {
      await prisma.smsConsent.create({
        data: {
          customerId: params.customerId,
          phone: params.phone,
          method: params.method,
        },
      });
    }
  } catch (err) {
    console.error('[Twilio Webhook] Failed to record SMS consent:', err);
  }
}

async function recordSmsOptOut(params: {
  customerId: string;
  phone: string;
}) {
  try {
    const existing = await prisma.smsConsent.findFirst({
      where: { customerId: params.customerId, phone: params.phone },
    });

    if (existing) {
      await prisma.smsConsent.update({
        where: { id: existing.id },
        data: { optedOutAt: new Date() },
      });
    } else {
      // Create a consent record that is immediately opted-out
      await prisma.smsConsent.create({
        data: {
          customerId: params.customerId,
          phone: params.phone,
          method: 'sms_keyword',
          optedOutAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.error('[Twilio Webhook] Failed to record SMS opt-out:', err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/twilio
// ---------------------------------------------------------------------------

/**
 * Handles inbound SMS messages from Twilio for TCPA/CTIA compliance.
 * Processes STOP, START, HELP, and other opt-out/opt-in keywords.
 *
 * Twilio sends form-encoded data with:
 *   - From: sender phone number
 *   - To: your Twilio number
 *   - Body: message text
 *   - MessageSid: unique message identifier
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string || '';
    const body = (formData.get('Body') as string || '').trim();
    const messageSid = (formData.get('MessageSid') as string) || undefined;
    const keyword = body.toUpperCase();

    if (!from) {
      return emptyTwiml();
    }

    // Normalize the phone number for lookup
    const normalizedPhone = formatPhoneE164(from);

    // Find customer by phone number
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: from },
          // Try matching last 10 digits
          { phone: { endsWith: normalizedPhone.slice(-10) } },
        ],
        deletedAt: null,
      },
    });

    // ── STOP / UNSUBSCRIBE / CANCEL / END / QUIT ──────────────────────
    if (OPT_OUT_KEYWORDS.has(keyword)) {
      if (customer) {
        await Promise.all([
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              smsConsent: false,
              smsOptOutAt: new Date(),
              notifySms: false,
            },
          }),
          recordSmsOptOut({ customerId: customer.id, phone: normalizedPhone }),
          prisma.auditLog.create({
            data: {
              action: 'sms_opt_out',
              entityType: 'customer',
              entityId: customer.id,
              details: JSON.stringify({ keyword, phone: from, messageSid }),
              userId: 'system',
            },
          }),
          logInboundMessage({
            from, to, body, messageSid,
            customerId: customer.id,
            action: 'opt_out',
          }),
        ]);
      } else {
        await logInboundMessage({
          from, to, body, messageSid,
          action: 'opt_out_no_customer',
        });
      }

      return twimlResponse(
        'You have been unsubscribed from ShipOS Pro notifications. Reply START to re-subscribe.'
      );
    }

    // ── START / YES / UNSTOP ──────────────────────────────────────────
    if (OPT_IN_KEYWORDS.has(keyword)) {
      if (customer) {
        await Promise.all([
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              smsConsent: true,
              smsConsentAt: new Date(),
              smsConsentMethod: 'sms_keyword',
              smsOptOutAt: null,
              notifySms: true,
            },
          }),
          recordSmsConsent({
            customerId: customer.id,
            phone: normalizedPhone,
            method: 'sms_reply',
          }),
          prisma.auditLog.create({
            data: {
              action: 'sms_opt_in',
              entityType: 'customer',
              entityId: customer.id,
              details: JSON.stringify({ keyword, phone: from, messageSid }),
              userId: 'system',
            },
          }),
          logInboundMessage({
            from, to, body, messageSid,
            customerId: customer.id,
            action: 'opt_in',
          }),
        ]);
      } else {
        await logInboundMessage({
          from, to, body, messageSid,
          action: 'opt_in_no_customer',
        });
      }

      return twimlResponse(
        'ShipOS Pro: You have been re-subscribed to notifications. ' +
        'Msg frequency varies. Msg&data rates may apply. ' +
        'Reply STOP to unsubscribe. Reply HELP for help.'
      );
    }

    // ── HELP / INFO ───────────────────────────────────────────────────
    if (HELP_KEYWORDS.has(keyword)) {
      await logInboundMessage({
        from, to, body, messageSid,
        customerId: customer?.id,
        action: 'help',
      });

      return twimlResponse(
        'ShipOS Pro: Mailbox & package notifications. ' +
        'Msg frequency varies. Msg&data rates may apply. ' +
        'Reply STOP to unsubscribe. Contact your mailbox provider for assistance.'
      );
    }

    // ── Unknown message ───────────────────────────────────────────────
    await logInboundMessage({
      from, to, body, messageSid,
      customerId: customer?.id,
      action: 'unknown',
    });

    // No auto-response for unknown messages
    return emptyTwiml();
  } catch (err) {
    console.error('[POST /api/webhooks/twilio]', err);
    // Always return 200 to Twilio to prevent retries
    return emptyTwiml();
  }
}
