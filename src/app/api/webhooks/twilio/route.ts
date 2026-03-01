import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * POST /api/webhooks/twilio
 * External webhook handler for Twilio inbound SMS.
 *
 * Handles TCPA/CTIA compliance keywords: STOP, START, HELP.
 * Returns TwiML XML responses.
 *
 * Uses { public: true } because this is an external callback — no user session.
 * Twilio authenticates via its own signature mechanism.
 */

/* ── TCPA/CTIA keyword patterns ──────────────────────────────────────────── */

const STOP_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'end', 'quit'];
const START_KEYWORDS = ['start', 'subscribe', 'unstop', 'yes'];
const HELP_KEYWORDS = ['help', 'info', 'support'];

/* ── TwiML response helper ───────────────────────────────────────────────── */

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
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

/* ── Consent management ──────────────────────────────────────────────────── */

async function updateSmsConsent(
  phoneNumber: string,
  consented: boolean,
): Promise<void> {
  // Find all customers with this phone
  const customers = await prisma.customer.findMany({
    where: { phone: phoneNumber },
    select: { id: true },
  });

  if (customers.length > 0) {
    await prisma.customer.updateMany({
      where: { id: { in: customers.map((c) => c.id) } },
      data: {
        smsConsent: consented,
        smsConsentUpdatedAt: new Date(),
      },
    });
  }

  // Also log the consent change for TCPA compliance
  await prisma.auditLog.create({
    data: {
      action: consented ? 'sms.consent_granted' : 'sms.consent_revoked',
      entityType: 'sms_consent',
      entityId: phoneNumber,
      userId: null,
      details: JSON.stringify({
        phoneNumber,
        consented,
        source: 'twilio_inbound',
        timestamp: new Date().toISOString(),
      }),
    },
  });
}

async function logInboundSms(
  from: string,
  to: string,
  body: string,
): Promise<void> {
  await prisma.smsLog.create({
    data: {
      direction: 'inbound',
      fromNumber: from,
      toNumber: to,
      body,
      status: 'received',
      receivedAt: new Date(),
    },
  });
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

export const POST = withApiHandler(async (request: NextRequest) => {
  // Twilio sends form-encoded data
  const formData = await request.formData();
  const from = (formData.get('From') as string) || '';
  const to = (formData.get('To') as string) || '';
  const body = ((formData.get('Body') as string) || '').trim();

  if (!from || !body) {
    return badRequest('Missing From or Body');
  }

  // Log inbound SMS
  await logInboundSms(from, to, body);

  const normalizedBody = body.toLowerCase().trim();

  // STOP — opt out of SMS
  if (STOP_KEYWORDS.includes(normalizedBody)) {
    await updateSmsConsent(from, false);
    return twimlResponse(
      'You have been unsubscribed from SMS notifications. Reply START to re-subscribe.',
    );
  }

  // START — opt back in
  if (START_KEYWORDS.includes(normalizedBody)) {
    await updateSmsConsent(from, true);
    return twimlResponse(
      'You have been re-subscribed to SMS notifications. Reply STOP to unsubscribe.',
    );
  }

  // HELP
  if (HELP_KEYWORDS.includes(normalizedBody)) {
    return twimlResponse(
      'ShipOS Notifications: You receive SMS when packages arrive. Reply STOP to unsubscribe, START to re-subscribe. For support, contact your local store.',
    );
  }

  // Unrecognized message — acknowledge receipt
  return twimlResponse(
    'Thanks for your message. Reply STOP to unsubscribe from SMS, or HELP for info.',
  );
}, { public: true });
