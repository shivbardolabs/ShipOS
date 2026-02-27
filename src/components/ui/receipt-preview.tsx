'use client';

import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Printer,
  Mail,
  MessageSquare,
  Download,
  X,
  FileText,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface LineItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface ReceiptPreviewProps {
  invoiceNumber: string;
  storeName: string;
  customerName: string;
  pmbNumber: string;
  packageCount: number;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  employeeName: string;
  dateTime: string;
  receiptHtml?: string;
  onPrint?: () => void;
  onEmail?: () => void;
  onSms?: () => void;
  onClose?: () => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Payment method labels                                                     */
/* -------------------------------------------------------------------------- */

const PAYMENT_LABELS: Record<string, string> = {
  post_to_account: 'Post to Account',
  cash: 'Cash',
  manual_card: 'Card (Manual)',
  text2pay: 'Text 2 Pay',
  tap_to_glass: 'Tap to Glass',
  nfc_reader: 'NFC Reader',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function ReceiptPreview({
  invoiceNumber,
  storeName,
  customerName,
  pmbNumber,
  packageCount,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  total,
  paymentMethod,
  employeeName,
  dateTime,
  receiptHtml,
  onPrint,
  onEmail,
  onSms,
  onClose,
  className,
}: ReceiptPreviewProps) {
  const [printing, setPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = useCallback(() => {
    if (receiptHtml && iframeRef.current) {
      setPrinting(true);
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(receiptHtml);
        doc.close();
        setTimeout(() => {
          iframeRef.current?.contentWindow?.print();
          setPrinting(false);
        }, 300);
      } else {
        setPrinting(false);
      }
    }
    onPrint?.();
  }, [receiptHtml, onPrint]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Card className={cn('p-0 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <FileText className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Sales Receipt</h3>
            <p className="text-xs text-zinc-400">{invoiceNumber}</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Receipt body */}
      <div className="px-5 py-4 space-y-4">
        {/* Store & customer */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-zinc-500 text-xs">Store</div>
            <div className="text-white font-medium">{storeName}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs">Date</div>
            <div className="text-white">{fmtDate(dateTime)}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs">Customer</div>
            <div className="text-white">{customerName}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs">PMB</div>
            <div className="text-white font-mono">{pmbNumber}</div>
          </div>
        </div>

        {/* Package count */}
        <div className="text-sm text-zinc-400">
          <strong className="text-white">{packageCount}</strong> package{packageCount !== 1 ? 's' : ''} released
        </div>

        {/* Line items */}
        <div className="border border-zinc-700/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50">
                <th className="text-left px-3 py-2 text-zinc-400 font-medium text-xs">Item</th>
                <th className="text-right px-3 py-2 text-zinc-400 font-medium text-xs">Qty</th>
                <th className="text-right px-3 py-2 text-zinc-400 font-medium text-xs">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="border-t border-zinc-700/30">
                  <td className="px-3 py-2 text-zinc-300">{item.description}</td>
                  <td className="px-3 py-2 text-zinc-400 text-right">{item.qty}</td>
                  <td className="px-3 py-2 text-white text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700/50">
                <td colSpan={2} className="px-3 py-1.5 text-zinc-400 text-right">Subtotal</td>
                <td className="px-3 py-1.5 text-white text-right">{formatCurrency(subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-1.5 text-zinc-400 text-right">
                  Tax ({(taxRate * 100).toFixed(2)}%)
                </td>
                <td className="px-3 py-1.5 text-white text-right">{formatCurrency(taxAmount)}</td>
              </tr>
              <tr className="border-t border-zinc-600">
                <td colSpan={2} className="px-3 py-2 text-white font-bold text-right">Total</td>
                <td className="px-3 py-2 text-emerald-400 font-bold text-right text-base">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment & employee */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-zinc-500">Payment: </span>
            <span className="text-white">{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</span>
          </div>
          <div>
            <span className="text-zinc-500">By: </span>
            <span className="text-white">{employeeName}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-zinc-700/50 bg-zinc-800/30">
        <Button size="sm" onClick={handlePrint} disabled={printing}>
          <Printer className="h-4 w-4 mr-1.5" />
          {printing ? 'Printing…' : 'Print'}
        </Button>
        {onEmail && (
          <Button size="sm" variant="secondary" onClick={onEmail}>
            <Mail className="h-4 w-4 mr-1.5" />
            Email
          </Button>
        )}
        {onSms && (
          <Button size="sm" variant="secondary" onClick={onSms}>
            <MessageSquare className="h-4 w-4 mr-1.5" />
            SMS
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handlePrint}>
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>

      {/* Hidden iframe for printing */}
      <iframe
        ref={iframeRef}
        title="receipt-print"
        className="hidden"
        style={{ display: 'none' }}
      />
    </Card>
  );
}
