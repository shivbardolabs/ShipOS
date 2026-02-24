import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSms, formatPhoneE164 } from '@/lib/notifications/twilio';

/**
 * POST /api/webhooks/twilio
 *
 * Handles inbound SMS messages from Twilio for TCPA/CTIA compliance.
 * Processes STOP, START, HELP, and other opt-out/opt-in keywords.
 *
 * Twilio sends form-encoded data with:
 *   - From: sender phone number
 *   - To: your Twilio number
 *   - Body: message text
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = (formData.get('Body') as string || '').trim().toUpperCase();

    if (!from) {
      return new Response('<Response></Response>', {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
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

    if (!customer) {
      // No matching customer — still respond per CTIA guidelines
      return twimlResponse('We could not find an account associated with this number. Please contact your mailbox provider.');
    }

    // STOP / UNSUBSCRIBE / CANCEL / END / QUIT — Opt Out
    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL'].includes(body)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          smsConsent: false,
          smsOptOutAt: new Date(),
          notifySms: false,
        },
      });

      // Log the opt-out in audit trail
      await prisma.auditLog.create({
        data: {
          action: 'sms_opt_out',
          entityType: 'customer',
          entityId: customer.id,
          details: JSON.stringify({ keyword: body, phone: from }),
          userId: 'system', // System action
        },
      });

      return twimlResponse(
        'You have been unsubscribed from ShipOS notifications. Reply START to re-subscribe.'
      );
    }

    // START / YES / UNSTOP — Opt In
    if (['START', 'YES', 'UNSTOP', 'SUBSCRIBE'].includes(body)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          smsConsent: true,
          smsConsentAt: new Date(),
          smsConsentMethod: 'sms_keyword',
          smsOptOutAt: null,
          notifySms: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'sms_opt_in',
          entityType: 'customer',
          entityId: customer.id,
          details: JSON.stringify({ keyword: body, phone: from }),
          userId: 'system',
        },
      });

      return twimlResponse(
        'You have been re-subscribed to ShipOS notifications. Reply STOP to unsubscribe. Reply HELP for help.'
      );
    }

    // HELP / INFO — Compliance info
    if (['HELP', 'INFO'].includes(body)) {
      return twimlResponse(
        'ShipOS Pro: Mailbox & package notifications. Reply STOP to unsubscribe. Msg&data rates may apply. Contact your mailbox provider for assistance.'
      );
    }

    // Unknown keyword — no auto-response needed
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('[POST /api/webhooks/twilio]', err);
    // Always return 200 to Twilio to prevent retries
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
