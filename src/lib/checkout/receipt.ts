/**
 * BAR-99: Sales Receipt / Invoice Generation
 *
 * Renders a checkout receipt as HTML suitable for printing (thermal or standard)
 * or embedding in an email body.
 */

import type { LineItem, FeeCalculationResult } from './fees';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ReceiptData {
  invoiceNumber: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeLogo?: string;

  customerName: string;
  pmbNumber: string;

  packages: {
    id: string;
    trackingNumber?: string | null;
    carrier: string;
    packageType: string;
  }[];

  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  paymentMethod: string;
  employeeName: string;
  dateTime: string;

  signatureDataUrl?: string;
}

/* -------------------------------------------------------------------------- */
/*  Format helpers                                                            */
/* -------------------------------------------------------------------------- */

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PAYMENT_LABELS: Record<string, string> = {
  post_to_account: 'Post to Account',
  cash: 'Cash',
  manual_card: 'Card (Manual)',
  text2pay: 'Text 2 Pay',
  tap_to_glass: 'Tap to Glass',
  nfc_reader: 'NFC Card Reader',
};

/* -------------------------------------------------------------------------- */
/*  Receipt HTML renderer                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Generate a printable HTML receipt. Works for both thermal (80mm) and
 * standard paper. Uses inline styles for maximum compatibility.
 */
export function renderReceipt(data: ReceiptData): string {
  const packageRows = data.packages
    .map(
      (pkg) => `
      <tr>
        <td style="padding:2px 4px;font-size:12px;">${pkg.carrier.toUpperCase()}</td>
        <td style="padding:2px 4px;font-size:12px;">${pkg.trackingNumber ? pkg.trackingNumber.slice(-8) : '—'}</td>
        <td style="padding:2px 4px;font-size:12px;">${pkg.packageType}</td>
      </tr>`,
    )
    .join('\n');

  const lineItemRows = data.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:3px 4px;font-size:12px;">${item.description}</td>
        <td style="padding:3px 4px;font-size:12px;text-align:right;">${fmtCurrency(item.total)}</td>
      </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Receipt ${data.invoiceNumber}</title></head>
<body style="font-family:'Courier New',monospace;max-width:320px;margin:0 auto;padding:8px;color:#000;">

  <!-- Header -->
  <div style="text-align:center;border-bottom:1px dashed #999;padding-bottom:8px;margin-bottom:8px;">
    ${data.storeLogo ? `<img src="${data.storeLogo}" alt="" style="max-width:120px;max-height:40px;margin-bottom:4px;" />` : ''}
    <div style="font-size:16px;font-weight:bold;">${data.storeName}</div>
    ${data.storeAddress ? `<div style="font-size:11px;">${data.storeAddress}</div>` : ''}
    ${data.storePhone ? `<div style="font-size:11px;">${data.storePhone}</div>` : ''}
  </div>

  <!-- Transaction info -->
  <div style="font-size:11px;margin-bottom:8px;">
    <div><strong>Receipt #:</strong> ${data.invoiceNumber}</div>
    <div><strong>Date:</strong> ${fmtDate(data.dateTime)}</div>
    <div><strong>Customer:</strong> ${data.customerName}</div>
    <div><strong>PMB:</strong> ${data.pmbNumber}</div>
    <div><strong>Employee:</strong> ${data.employeeName}</div>
  </div>

  <!-- Packages released -->
  <div style="border-top:1px dashed #999;border-bottom:1px dashed #999;padding:6px 0;margin-bottom:8px;">
    <div style="font-size:12px;font-weight:bold;margin-bottom:4px;">Packages Released (${data.packages.length})</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="font-size:11px;font-weight:bold;">
        <td style="padding:2px 4px;">Carrier</td>
        <td style="padding:2px 4px;">Tracking</td>
        <td style="padding:2px 4px;">Type</td>
      </tr>
      ${packageRows}
    </table>
  </div>

  <!-- Fee breakdown -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    ${lineItemRows}
    <tr style="border-top:1px solid #999;">
      <td style="padding:3px 4px;font-size:12px;"><strong>Subtotal</strong></td>
      <td style="padding:3px 4px;font-size:12px;text-align:right;">${fmtCurrency(data.subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:3px 4px;font-size:12px;">Tax (${(data.taxRate * 100).toFixed(2)}%)</td>
      <td style="padding:3px 4px;font-size:12px;text-align:right;">${fmtCurrency(data.taxAmount)}</td>
    </tr>
    <tr style="border-top:2px solid #000;">
      <td style="padding:4px;font-size:14px;font-weight:bold;">TOTAL</td>
      <td style="padding:4px;font-size:14px;font-weight:bold;text-align:right;">${fmtCurrency(data.total)}</td>
    </tr>
  </table>

  <!-- Payment method -->
  <div style="font-size:12px;margin-bottom:8px;">
    <strong>Payment:</strong> ${PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}
  </div>

  <!-- Signature -->
  ${
    data.signatureDataUrl
      ? `<div style="border-top:1px dashed #999;padding-top:8px;margin-bottom:8px;">
          <div style="font-size:11px;margin-bottom:4px;">Customer Signature:</div>
          <img src="${data.signatureDataUrl}" alt="Signature" style="max-width:280px;max-height:80px;" />
        </div>`
      : ''
  }

  <!-- Footer -->
  <div style="text-align:center;border-top:1px dashed #999;padding-top:8px;font-size:11px;">
    <div>Thank you for your business!</div>
    <div style="margin-top:4px;color:#666;">Powered by ShipOS</div>
  </div>

</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  Build ReceiptData from calculation result + context                       */
/* -------------------------------------------------------------------------- */

export function buildReceiptData(
  feeResult: FeeCalculationResult,
  lineItems: LineItem[],
  context: {
    invoiceNumber: string;
    storeName: string;
    storeAddress?: string;
    storePhone?: string;
    storeLogo?: string;
    customerName: string;
    pmbNumber: string;
    packages: ReceiptData['packages'];
    paymentMethod: string;
    employeeName: string;
    signatureDataUrl?: string;
  },
): ReceiptData {
  return {
    invoiceNumber: context.invoiceNumber,
    storeName: context.storeName,
    storeAddress: context.storeAddress,
    storePhone: context.storePhone,
    storeLogo: context.storeLogo,
    customerName: context.customerName,
    pmbNumber: context.pmbNumber,
    packages: context.packages,
    lineItems,
    subtotal: feeResult.subtotal,
    taxRate: feeResult.taxRate,
    taxAmount: feeResult.taxAmount,
    total: feeResult.total,
    paymentMethod: context.paymentMethod,
    employeeName: context.employeeName,
    dateTime: new Date().toISOString(),
    signatureDataUrl: context.signatureDataUrl,
  };
}
