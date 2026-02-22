import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Resend client (email)
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || 'ShipOS Pro <notifications@shipospro.com>';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      react: params.react,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    if (error) {
      console.error('[Resend] Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error('[Resend] Exception:', message);
    return { success: false, error: message };
  }
}
