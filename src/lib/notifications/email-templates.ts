// ---------------------------------------------------------------------------
// Professional HTML email templates – CAN-SPAM compliant
// ---------------------------------------------------------------------------
//
// Every template includes:
//   • Proper HTML structure & meta tags
//   • Physical mailing address in footer (CAN-SPAM)
//   • Unsubscribe link for marketing emails
//   • Consistent branding (ShipOS Pro)
//   • Accessible, mobile-responsive layout
//   • No spam-trigger words, proper text-to-image ratio
// ---------------------------------------------------------------------------

export interface EmailTemplateOptions {
  /** Recipient display name */
  recipientName?: string;
  /** Main heading */
  heading: string;
  /** Preheader text (shows in inbox preview) */
  preheader?: string;
  /** Body HTML – the main message content */
  bodyHtml: string;
  /** Optional CTA button */
  cta?: { label: string; url: string };
  /** If true, includes an unsubscribe link in the footer */
  includeUnsubscribe?: boolean;
  /** Unsubscribe URL (required if includeUnsubscribe is true) */
  unsubscribeUrl?: string;
  /** Optional tenant / store name for white-label branding */
  brandName?: string;
  /** Optional accent colour hex (defaults to #6366f1) */
  accentColor?: string;
}

// ---------------------------------------------------------------------------
// Physical address – required by CAN-SPAM Act
// ---------------------------------------------------------------------------

const PHYSICAL_ADDRESS = `ShipOS Pro · 123 Commerce Ave, Suite 200 · Austin, TX 78701`;

// ---------------------------------------------------------------------------
// Base wrapper
// ---------------------------------------------------------------------------

function baseLayout(opts: EmailTemplateOptions): string {
  const accent = opts.accentColor || '#6366f1';
  const brand = opts.brandName || 'ShipOS Pro';
  const year = new Date().getFullYear();

  const unsubscribeBlock = opts.includeUnsubscribe && opts.unsubscribeUrl
    ? `<p style="margin:0 0 8px;">
         <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">
           Unsubscribe
         </a>
         from marketing emails.
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(opts.heading)}</title>
  <!--[if mso]>
  <noscript><xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml></noscript>
  <![endif]-->
  <style>
    body { margin:0; padding:0; background-color:#f4f4f5; }
    table { border-collapse:collapse; }
    img { border:0; display:block; outline:none; text-decoration:none; }
    a { color:${accent}; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; padding:16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>` : ''}

  <!-- Outer table for background -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Container -->
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background-color:${accent};padding:24px 32px;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                ${escapeHtml(brand)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${opts.recipientName ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${escapeHtml(opts.recipientName)},</p>` : ''}

              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;letter-spacing:-0.2px;">
                ${escapeHtml(opts.heading)}
              </h2>

              <div style="font-size:15px;line-height:1.6;color:#4b5563;">
                ${opts.bodyHtml}
              </div>

              ${opts.cta ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                <tr>
                  <td style="background-color:${accent};border-radius:8px;">
                    <a href="${escapeHtml(opts.cta.url)}"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      ${escapeHtml(opts.cta.label)}
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
              <div style="font-size:12px;line-height:1.5;color:#9ca3af;">
                ${unsubscribeBlock}
                <p style="margin:0 0 4px;">${escapeHtml(PHYSICAL_ADDRESS)}</p>
                <p style="margin:0;">&copy; ${year} ${escapeHtml(brand)}. All rights reserved.</p>
              </div>
            </td>
          </tr>

        </table>
        <!-- /Container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Wrap custom content in the standard branded email layout.
 * Includes proper headers, CAN-SPAM footer, and responsive design.
 */
export function renderEmailTemplate(opts: EmailTemplateOptions): string {
  return baseLayout(opts);
}

// ---------------------------------------------------------------------------
// Pre-built template: Package Arrival
// ---------------------------------------------------------------------------

export function packageArrivalTemplate(data: {
  customerName: string;
  carrier: string;
  trackingNumber?: string;
  pmbNumber: string;
  dashboardUrl?: string;
  brandName?: string;
  accentColor?: string;
}): string {
  const bodyHtml = `
    <p style="margin:0 0 12px;">
      A new <strong>${escapeHtml(data.carrier.toUpperCase())}</strong> package has arrived at your mailbox
      <strong>${escapeHtml(data.pmbNumber)}</strong>.
    </p>
    ${data.trackingNumber ? `<p style="margin:0 0 12px;">Tracking: <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px;">${escapeHtml(data.trackingNumber)}</code></p>` : ''}
    <p style="margin:0;">Please pick up at your convenience during business hours.</p>
  `;

  return renderEmailTemplate({
    recipientName: data.customerName,
    heading: 'Your Package Has Arrived',
    preheader: `A ${data.carrier.toUpperCase()} package is waiting at ${data.pmbNumber}`,
    bodyHtml,
    cta: data.dashboardUrl
      ? { label: 'View in Dashboard', url: data.dashboardUrl }
      : undefined,
    brandName: data.brandName,
    accentColor: data.accentColor,
  });
}

// ---------------------------------------------------------------------------
// Pre-built template: Renewal Reminder
// ---------------------------------------------------------------------------

export function renewalReminderTemplate(data: {
  customerName: string;
  pmbNumber: string;
  renewalDate: string;
  renewalUrl?: string;
  brandName?: string;
  accentColor?: string;
}): string {
  const bodyHtml = `
    <p style="margin:0 0 12px;">
      Your mailbox <strong>${escapeHtml(data.pmbNumber)}</strong> renewal is due on
      <strong>${escapeHtml(data.renewalDate)}</strong>.
    </p>
    <p style="margin:0;">
      Please renew before the due date to avoid any interruption in service.
    </p>
  `;

  return renderEmailTemplate({
    recipientName: data.customerName,
    heading: 'Mailbox Renewal Reminder',
    preheader: `Your mailbox ${data.pmbNumber} renewal is coming up`,
    bodyHtml,
    cta: data.renewalUrl
      ? { label: 'Renew Now', url: data.renewalUrl }
      : undefined,
    brandName: data.brandName,
    accentColor: data.accentColor,
  });
}

// ---------------------------------------------------------------------------
// Pre-built template: Welcome
// ---------------------------------------------------------------------------

export function welcomeTemplate(data: {
  customerName: string;
  pmbNumber: string;
  dashboardUrl?: string;
  brandName?: string;
  accentColor?: string;
}): string {
  const bodyHtml = `
    <p style="margin:0 0 12px;">
      Your mailbox <strong>${escapeHtml(data.pmbNumber)}</strong> is now active.
    </p>
    <p style="margin:0 0 12px;">
      You will receive notifications when packages and mail arrive. You can manage your
      notification preferences from your dashboard at any time.
    </p>
    <p style="margin:0;">
      If you have any questions, simply reply to this email or contact your location directly.
    </p>
  `;

  return renderEmailTemplate({
    recipientName: data.customerName,
    heading: 'Welcome to Your New Mailbox',
    preheader: `Your mailbox ${data.pmbNumber} is ready`,
    bodyHtml,
    cta: data.dashboardUrl
      ? { label: 'Go to Dashboard', url: data.dashboardUrl }
      : undefined,
    brandName: data.brandName,
    accentColor: data.accentColor,
  });
}

// ---------------------------------------------------------------------------
// Pre-built template: ID Expiring
// ---------------------------------------------------------------------------

export function idExpiringTemplate(data: {
  customerName: string;
  pmbNumber: string;
  daysUntilExpiry: number;
  brandName?: string;
  accentColor?: string;
}): string {
  const urgency =
    data.daysUntilExpiry <= 0
      ? 'has expired'
      : `expires in <strong>${data.daysUntilExpiry}</strong> day${data.daysUntilExpiry > 1 ? 's' : ''}`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">
      The identification document on file for your mailbox
      <strong>${escapeHtml(data.pmbNumber)}</strong> ${urgency}.
    </p>
    <p style="margin:0;">
      Please bring a valid, unexpired government-issued photo ID to your location
      at your earliest convenience to keep your account in good standing.
    </p>
  `;

  return renderEmailTemplate({
    recipientName: data.customerName,
    heading: 'ID Update Required',
    preheader: `Action needed: your ID on file for ${data.pmbNumber} needs updating`,
    bodyHtml,
    brandName: data.brandName,
    accentColor: data.accentColor,
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
