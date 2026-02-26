import twilio from 'twilio';

// ---------------------------------------------------------------------------
// Twilio client (SMS)
// ---------------------------------------------------------------------------

let _client: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio {
  if (!_client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required');
    }

    _client = twilio(accountSid, authToken);
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Business name prepended to every outbound SMS. */
const BUSINESS_NAME = process.env.SMS_BUSINESS_NAME || 'ShipOS Pro';

/** Branded short domain for links in SMS messages. Falls back to full domain. */
const BRANDED_LINK_DOMAIN = process.env.SMS_BRANDED_LINK_DOMAIN || 'shipospro.com';

/** First-message compliance disclaimer (CTIA / TCPA required). */
const COMPLIANCE_DISCLOSURE =
  `${BUSINESS_NAME}: Mailbox & package notifications. ` +
  `Msg frequency varies. Msg&data rates may apply. ` +
  `Reply HELP for help, STOP to opt out.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendSmsParams {
  to: string;          // E.164 format: +1XXXXXXXXXX
  body: string;
  mediaUrl?: string[]; // Optional MMS media URLs
  /** If true, prepends the full CTIA compliance disclosure (use for first messages). */
  isFirstMessage?: boolean;
  /** If true, skips prepending business name (already in body). */
  skipBusinessPrefix?: boolean;
}

export interface SendSmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Phone formatting
// ---------------------------------------------------------------------------

/**
 * Format a US phone number to E.164.
 * Accepts: (555) 123-4567, 555-123-4567, 5551234567, +15551234567
 */
export function formatPhoneE164(phone: string): string {
  // Strip everything except digits and leading +
  const digits = phone.replace(/[^\d+]/g, '');

  // Already E.164
  if (digits.startsWith('+1') && digits.length === 12) return digits;
  if (digits.startsWith('+') && digits.length >= 11) return digits;

  // US: 10 digits → +1XXXXXXXXXX
  const raw = digits.replace(/^\+/, '');
  if (raw.length === 10) return `+1${raw}`;
  if (raw.length === 11 && raw.startsWith('1')) return `+${raw}`;

  // Return as-is with + prefix
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// ---------------------------------------------------------------------------
// Link branding
// ---------------------------------------------------------------------------

/**
 * Replace generic links with branded domain links.
 * Example: https://app.shipospro.com/track/123 → https://shipospro.com/track/123
 */
export function brandLinks(body: string): string {
  if (!BRANDED_LINK_DOMAIN) return body;

  // Replace any app subdomain links with branded domain
  return body.replace(
    /https?:\/\/app\.[a-z0-9.-]+\//gi,
    `https://${BRANDED_LINK_DOMAIN}/`
  );
}

// ---------------------------------------------------------------------------
// Message composition
// ---------------------------------------------------------------------------

/**
 * Build the final SMS body with business prefix and compliance text.
 */
function composeMessage(params: SendSmsParams): string {
  let body = params.body;

  // Replace links with branded domain
  body = brandLinks(body);

  // Prepend business name unless caller already included it
  if (!params.skipBusinessPrefix && !body.startsWith(BUSINESS_NAME)) {
    body = `${BUSINESS_NAME}: ${body}`;
  }

  // First message to a recipient must include full compliance disclosure
  if (params.isFirstMessage) {
    body = `${body}\n\n${COMPLIANCE_DISCLOSURE}`;
  }

  return body;
}

// ---------------------------------------------------------------------------
// Send SMS
// ---------------------------------------------------------------------------

/**
 * Send an SMS message via Twilio.
 * Automatically prepends business name and includes CTIA compliance text
 * on first messages.
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const client = getTwilioClient();

  const from =
    process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER;

  if (!from) {
    return {
      success: false,
      error: 'TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID is required',
    };
  }

  const body = composeMessage(params);

  try {
    // Determine whether to use messagingServiceSid or from number
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    const message = messagingServiceSid
      ? await client.messages.create({
          body,
          to: params.to,
          messagingServiceSid,
          ...(params.mediaUrl?.length ? { mediaUrl: params.mediaUrl } : {}),
        })
      : await client.messages.create({
          body,
          to: params.to,
          from,
          ...(params.mediaUrl?.length ? { mediaUrl: params.mediaUrl } : {}),
        });

    console.info('[Twilio] SMS sent:', JSON.stringify({
      sid: message.sid,
      to: params.to,
      isFirstMessage: !!params.isFirstMessage,
      timestamp: new Date().toISOString(),
    }));

    return { success: true, messageSid: message.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown SMS error';
    console.error('[Twilio] SMS send error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// Consent checking helper
// ---------------------------------------------------------------------------

/**
 * Check whether a customer has active SMS consent.
 * Should be called before sending any SMS to verify opt-in status.
 */
export function hasActiveConsent(customer: {
  smsConsent?: boolean;
  smsOptOutAt?: Date | null;
}): boolean {
  if (!customer.smsConsent) return false;
  if (customer.smsOptOutAt) return false;
  return true;
}

/**
 * Determine whether this is the first SMS to a customer
 * (no prior consent timestamp → first message disclosure required).
 */
export function isFirstSmsToCustomer(customer: {
  smsConsentAt?: Date | null;
}): boolean {
  return !customer.smsConsentAt;
}
