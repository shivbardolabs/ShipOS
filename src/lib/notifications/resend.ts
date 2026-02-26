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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Categorise emails for deliverability best practices. */
export type EmailCategory = 'transactional' | 'marketing';

export interface SendEmailParams {
  to: string;
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  /** Email category — controls headers & compliance requirements. Defaults to 'transactional'. */
  category?: EmailCategory;
  /** For marketing emails: one-click unsubscribe URL (List-Unsubscribe header) */
  unsubscribeUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Delivery tracking metadata */
  delivery?: {
    category: EmailCategory;
    timestamp: string;
    recipient: string;
  };
}

// ---------------------------------------------------------------------------
// Delivery event logging
// ---------------------------------------------------------------------------

type DeliveryEvent = 'sent' | 'failed' | 'bounced';

function logDeliveryEvent(
  event: DeliveryEvent,
  details: {
    to: string;
    subject: string;
    category: EmailCategory;
    messageId?: string;
    error?: string;
  }
) {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };

  if (event === 'sent') {
    console.info('[Resend] Email delivered:', JSON.stringify(entry));
  } else {
    console.error(`[Resend] Email ${event}:`, JSON.stringify(entry));
  }
}

// ---------------------------------------------------------------------------
// Build headers based on category
// ---------------------------------------------------------------------------

function buildHeaders(
  category: EmailCategory,
  unsubscribeUrl?: string
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Marketing emails MUST include List-Unsubscribe for CAN-SPAM / RFC 8058
  if (category === 'marketing' && unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  // Precedence header for transactional (helps ISPs route correctly)
  if (category === 'transactional') {
    headers['X-Priority'] = '1';
  }

  return headers;
}

// ---------------------------------------------------------------------------
// Build category tags
// ---------------------------------------------------------------------------

function buildCategoryTags(
  category: EmailCategory,
  existingTags?: Array<{ name: string; value: string }>
): Array<{ name: string; value: string }> {
  const tags = [...(existingTags || [])];

  // Add category tag for analytics / filtering in Resend dashboard
  if (!tags.some((t) => t.name === 'category')) {
    tags.push({ name: 'category', value: category });
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

/**
 * Send an email via Resend with delivery tracking and category-aware headers.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || 'ShipOS Pro <notifications@shipospro.com>';
  const category: EmailCategory = params.category || 'transactional';

  const tags = buildCategoryTags(category, params.tags);
  const headers = buildHeaders(category, params.unsubscribeUrl);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      react: params.react,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (error) {
      logDeliveryEvent('failed', {
        to: params.to,
        subject: params.subject,
        category,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    logDeliveryEvent('sent', {
      to: params.to,
      subject: params.subject,
      category,
      messageId: data?.id,
    });

    return {
      success: true,
      messageId: data?.id,
      delivery: {
        category,
        timestamp: new Date().toISOString(),
        recipient: params.to,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';

    logDeliveryEvent('failed', {
      to: params.to,
      subject: params.subject,
      category,
      error: message,
    });

    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Domain verification helpers (for admin dashboard)
// ---------------------------------------------------------------------------

export interface DomainVerification {
  id: string;
  name: string;
  status: string;
  records: Array<{
    type: string;
    name: string;
    value: string;
    status: string;
    priority?: number;
  }>;
  region: string;
  createdAt: string;
}

/**
 * Fetch all verified / pending domains from Resend.
 * Used by the email deliverability admin dashboard.
 */
export async function listDomains(): Promise<{
  success: boolean;
  domains?: DomainVerification[];
  error?: string;
}> {
  const resend = getResend();

  try {
    const { data, error } = await resend.domains.list();

    if (error) {
      return { success: false, error: error.message };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const domains: DomainVerification[] = (data?.data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      records: (d.records || []).map((r: any) => ({
        type: r.record,
        name: r.name,
        value: r.value,
        status: r.status,
        priority: r.priority ?? undefined,
      })),
      region: d.region,
      createdAt: d.createdAt,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return { success: true, domains };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Verify (re-check) a specific domain.
 */
export async function verifyDomain(domainId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const resend = getResend();

  try {
    const { error } = await resend.domains.verify(domainId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
