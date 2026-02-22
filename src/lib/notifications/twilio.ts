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

export interface SendSmsParams {
  to: string;          // E.164 format: +1XXXXXXXXXX
  body: string;
  mediaUrl?: string[]; // Optional MMS media URLs
}

export interface SendSmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

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

/**
 * Send an SMS message via Twilio.
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

  try {
    // Determine whether to use messagingServiceSid or from number
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    const message = messagingServiceSid
      ? await client.messages.create({
          body: params.body,
          to: params.to,
          messagingServiceSid,
          ...(params.mediaUrl?.length ? { mediaUrl: params.mediaUrl } : {}),
        })
      : await client.messages.create({
          body: params.body,
          to: params.to,
          from,
          ...(params.mediaUrl?.length ? { mediaUrl: params.mediaUrl } : {}),
        });

    return { success: true, messageSid: message.sid };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown SMS error';
    console.error('[Twilio] SMS send error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
