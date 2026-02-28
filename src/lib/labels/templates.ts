/**
 * BAR-251: Package Label Generation & Printing Service
 * BAR-29:  Package Identification Label (4x6)
 *
 * Label templates for:
 * - Package Identification (4x6) — main package label
 * - Return-to-Sender (RTS)
 * - Closed-PMB Contact Label
 * - Signature Tag (for check-out)
 */

/* ── Data Types ──────────────────────────────────────────────────────────── */

export interface PackageLabelData {
  /** Large PMB/mailbox number — dominant visual element */
  pmbNumber: string;
  /** Customer full name */
  customerName: string;
  /** Tracking number from carrier */
  trackingNumber: string;
  /** Carrier name (UPS, FedEx, USPS, etc.) */
  carrier: string;
  /** ISO datetime of check-in */
  checkedInAt: string;
  /** Internal package sequence ID */
  packageId: string;
  /** Store/tenant name for footer */
  storeName: string;
  /** BAR-266: Package program type — PMB sub-type or carrier program */
  programType?: string;
  /** BAR-266: Package condition from Step 3 (e.g. Good, Damaged, Wet, Perishable) */
  condition?: string;
  /** BAR-266: Perishable flag — shown alongside condition when true */
  perishable?: boolean;
}

export interface RTSLabelData {
  pmbNumber: string;
  closedDate: string;
  printDate: string;
  staffName: string;
  trackingNumber?: string;
  storeName: string;
}

export interface ContactLabelData {
  customerName: string;
  phone: string;
  email: string;
  pmbNumber: string;
  closedDate: string;
  storeName: string;
}

export interface SignatureTagData {
  pmbNumber: string;
  customerName: string;
  packageCount: number;
  releasedAt: string;
  staffName: string;
  storeName: string;
}

/* ── Template Renderers (HTML) ───────────────────────────────────────────── */

/**
 * BAR-29: Package Identification Label (4x6)
 * Designed for thermal label printers (Dymo, Zebra, etc.)
 */
export function renderPackageLabel(data: PackageLabelData): string {
  const checkinDate = new Date(data.checkedInAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // BAR-266: Build condition display string
  const conditionParts: string[] = [];
  if (data.condition && data.condition !== 'good') {
    const condLabel = data.condition === 'partially_opened' ? 'Partially Opened'
      : data.condition.charAt(0).toUpperCase() + data.condition.slice(1);
    conditionParts.push(condLabel);
  }
  if (data.perishable) {
    conditionParts.push('Perishable');
  }
  const conditionDisplay = conditionParts.length > 0 ? conditionParts.join(' · ') : '';
  const isNonGood = conditionParts.length > 0;

  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 4in 6in; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; width: 4in; height: 6in; padding: 0.15in; display: flex; flex-direction: column; }
  .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 0.08in; margin-bottom: 0.1in; }
  .pmb { font-size: 72pt; font-weight: 900; line-height: 1; letter-spacing: -2px; }
  .customer { font-size: 16pt; font-weight: 600; margin-top: 0.05in; }
  .type-badge { display: inline-block; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 2px 10px; border: 2px solid #000; border-radius: 4px; margin-top: 0.04in; }
  .section { margin: 0.08in 0; }
  .row { display: flex; justify-content: space-between; align-items: center; font-size: 11pt; padding: 0.03in 0; }
  .label { font-weight: 700; text-transform: uppercase; font-size: 9pt; color: #555; }
  .value { font-weight: 600; }
  .condition-bar { text-align: center; padding: 0.06in 0.1in; margin: 0.06in 0; border: 2px solid ${isNonGood ? '#000' : '#ccc'}; border-radius: 4px; font-size: 12pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; ${isNonGood ? 'background: #000; color: #fff;' : ''} }
  .barcode-area { text-align: center; margin: 0.12in 0; padding: 0.1in; border: 1px solid #ccc; border-radius: 4px; }
  .tracking { font-family: 'Courier New', monospace; font-size: 14pt; font-weight: 700; letter-spacing: 1px; }
  .barcode-bars { height: 48px; margin: 0.08in auto; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 9px); width: 80%; }
  .footer { margin-top: auto; text-align: center; font-size: 8pt; color: #888; border-top: 1px solid #ddd; padding-top: 0.05in; }
  .pkg-id { font-size: 9pt; color: #666; }
</style>
</head>
<body>
  <div class="header">
    <div class="pmb">${escapeHtml(data.pmbNumber)}</div>
    <div class="customer">${escapeHtml(data.customerName)}</div>
    ${data.programType ? `<div class="type-badge">${escapeHtml(data.programType)}</div>` : ''}
  </div>

  <div class="condition-bar">${conditionDisplay ? `⚠ ${escapeHtml(conditionDisplay)}` : 'Good'}</div>

  <div class="section">
    <div class="row">
      <span class="label">Carrier</span>
      <span class="value">${escapeHtml(data.carrier)}</span>
    </div>
    <div class="row">
      <span class="label">Checked In</span>
      <span class="value">${escapeHtml(checkinDate)}</span>
    </div>
    <div class="row">
      <span class="label">Package ID</span>
      <span class="pkg-id">${escapeHtml(data.packageId)}</span>
    </div>
  </div>

  <div class="barcode-area">
    <div class="label">Tracking Number</div>
    <div class="barcode-bars" title="Barcode placeholder"></div>
    <div class="tracking">${escapeHtml(data.trackingNumber)}</div>
  </div>

  <div class="footer">
    ${escapeHtml(data.storeName)} &bull; Powered by ShipOS
  </div>
</body>
</html>`;
}

/**
 * BAR-251 Template 1: Return-to-Sender (RTS)
 */
export function renderRTSLabel(data: RTSLabelData): string {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 4in 6in; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; width: 4in; height: 6in; padding: 0.2in; }
  .alert-bar { background: #000; color: #fff; text-align: center; font-size: 22pt; font-weight: 900; padding: 0.15in; letter-spacing: 2px; border-radius: 4px; }
  .alert-icon { font-size: 18pt; }
  .field { margin: 0.12in 0; }
  .label { font-size: 9pt; text-transform: uppercase; color: #555; font-weight: 700; }
  .value { font-size: 14pt; font-weight: 600; }
  .tracking { font-family: 'Courier New', monospace; font-size: 12pt; }
  .divider { border-top: 1px dashed #aaa; margin: 0.15in 0; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: auto; }
</style>
</head>
<body>
  <div class="alert-bar">
    <span class="alert-icon">⚠️</span> RETURN TO SENDER
  </div>

  <div class="field"><div class="label">PMB #</div><div class="value">${escapeHtml(data.pmbNumber)}</div></div>
  <div class="field"><div class="label">Reason</div><div class="value">PMB Closed (${escapeHtml(data.closedDate)})</div></div>
  <div class="field"><div class="label">Date</div><div class="value">${escapeHtml(data.printDate)}</div></div>
  <div class="field"><div class="label">Staff</div><div class="value">${escapeHtml(data.staffName)}</div></div>

  ${data.trackingNumber ? `<div class="divider"></div><div class="field"><div class="label">Tracking</div><div class="tracking">${escapeHtml(data.trackingNumber)}</div></div>` : ''}

  <div class="divider"></div>
  <div class="footer">${escapeHtml(data.storeName)} &bull; ShipOS</div>
</body>
</html>`;
}

/**
 * BAR-251 Template 2: Closed-PMB Contact Label
 */
export function renderContactLabel(data: ContactLabelData): string {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 4in 6in; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; width: 4in; height: 6in; padding: 0.2in; }
  .alert-bar { background: #F59E0B; color: #000; text-align: center; font-size: 18pt; font-weight: 900; padding: 0.12in; letter-spacing: 1px; border-radius: 4px; }
  .field { margin: 0.1in 0; }
  .label { font-size: 9pt; text-transform: uppercase; color: #555; font-weight: 700; }
  .value { font-size: 14pt; font-weight: 600; }
  .notes-box { border: 1px solid #ccc; border-radius: 4px; padding: 0.1in; min-height: 0.8in; margin-top: 0.15in; }
  .notes-label { font-size: 9pt; color: #888; }
  .amount-line { border-bottom: 1px solid #000; width: 2in; display: inline-block; margin-left: 0.1in; }
  .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 0.2in; }
</style>
</head>
<body>
  <div class="alert-bar">📨 HOLD — CONTACT CUSTOMER</div>

  <div class="field"><div class="label">Customer</div><div class="value">${escapeHtml(data.customerName)}</div></div>
  <div class="field"><div class="label">Phone</div><div class="value">${escapeHtml(data.phone)}</div></div>
  <div class="field"><div class="label">Email</div><div class="value">${escapeHtml(data.email)}</div></div>
  <div class="field"><div class="label">PMB #</div><div class="value">${escapeHtml(data.pmbNumber)}</div></div>
  <div class="field"><div class="label">Closed</div><div class="value">${escapeHtml(data.closedDate)}</div></div>

  <div class="field">
    <div class="label">Amount owed</div>
    <div>$ <span class="amount-line">&nbsp;</span></div>
  </div>

  <div class="notes-box">
    <div class="notes-label">Notes:</div>
  </div>

  <div class="footer">${escapeHtml(data.storeName)} &bull; ShipOS</div>
</body>
</html>`;
}

/**
 * BAR-251: Signature Tag (for check-out receipts)
 */
export function renderSignatureTag(data: SignatureTagData): string {
  const date = new Date(data.releasedAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 4in 2in; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; width: 4in; height: 2in; padding: 0.1in; font-size: 10pt; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 0.05in; margin-bottom: 0.06in; }
  .pmb { font-size: 24pt; font-weight: 900; }
  .meta { text-align: right; font-size: 8pt; color: #555; }
  .row { display: flex; justify-content: space-between; font-size: 9pt; padding: 0.02in 0; }
  .sig-line { border-bottom: 1px solid #000; margin-top: 0.12in; padding-bottom: 0.3in; }
  .sig-label { font-size: 8pt; color: #666; }
</style>
</head>
<body>
  <div class="header">
    <span class="pmb">${escapeHtml(data.pmbNumber)}</span>
    <div class="meta">${escapeHtml(date)}<br/>Staff: ${escapeHtml(data.staffName)}</div>
  </div>
  <div class="row"><span>${escapeHtml(data.customerName)}</span><span>${data.packageCount} pkg(s)</span></div>
  <div class="sig-line"></div>
  <div class="sig-label">Signature</div>
</body>
</html>`;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
