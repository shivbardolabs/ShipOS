'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Printer,
  FileText,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { Package as PackageType, Customer } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  BAR-100 — Signature Tag Printing                                          */
/*  Generate printable signature tags for selected packages during checkout   */
/*  Supports thermal label printer output (4x6 format)                        */
/* -------------------------------------------------------------------------- */

interface SignatureTagPrintProps {
  /** Packages to print tags for */
  packages: PackageType[];
  /** Customer who is picking up */
  customer: Customer;
  /** Whether all packages or just selected ones */
  selectedIds?: Set<string>;
  /** Compact button variant (for inline use) */
  compact?: boolean;
  className?: string;
}

interface SignatureTag {
  packageId: string;
  trackingNumber?: string;
  recipientName: string;
  pmbNumber: string;
  date: string;
  carrier: string;
  packageType: string;
}

/* ── Tag generation ─────────────────────────────────────────────────────── */

function generateTags(
  packages: PackageType[],
  customer: Customer,
  selectedIds?: Set<string>
): SignatureTag[] {
  const pkgs = selectedIds
    ? packages.filter((p) => selectedIds.has(p.id))
    : packages;

  return pkgs.map((pkg) => ({
    packageId: pkg.id,
    trackingNumber: pkg.trackingNumber,
    recipientName: `${customer.firstName} ${customer.lastName}`,
    pmbNumber: customer.pmbNumber,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    carrier: pkg.carrier,
    packageType: pkg.packageType,
  }));
}

/* ── Printable tag HTML for thermal printer (4x6) ───────────────────────── */

function generatePrintHtml(tags: SignatureTag[]): string {
  const tagHtml = tags
    .map(
      (tag) => `
    <div style="
      width: 4in; height: 6in; padding: 0.3in;
      border: 2px solid #000; margin-bottom: 0.25in;
      page-break-after: always; font-family: Arial, sans-serif;
      display: flex; flex-direction: column; justify-content: space-between;
      box-sizing: border-box;
    ">
      <div>
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">SIGNATURE TAG</div>
          <div style="font-size: 11px; color: #666; margin-top: 2px;">Package Release Authorization</div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Package ID</div>
              <div style="font-size: 14px; font-weight: bold;">${tag.packageId.slice(-8).toUpperCase()}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Date</div>
              <div style="font-size: 14px; font-weight: bold;">${tag.date}</div>
            </div>
          </div>

          <div style="margin-bottom: 8px;">
            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Recipient</div>
            <div style="font-size: 16px; font-weight: bold;">${tag.recipientName}</div>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 8px;">
            <div>
              <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">PMB #</div>
              <div style="font-size: 14px; font-weight: bold;">${tag.pmbNumber}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Carrier</div>
              <div style="font-size: 14px; font-weight: bold;">${tag.carrier.toUpperCase()}</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Type</div>
              <div style="font-size: 14px;">${tag.packageType}</div>
            </div>
          </div>

          ${tag.trackingNumber ? `
          <div style="margin-bottom: 8px;">
            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Tracking #</div>
            <div style="font-size: 12px; font-family: monospace;">${tag.trackingNumber}</div>
          </div>
          ` : ''}
        </div>
      </div>

      <div>
        <div style="border-top: 1px solid #ccc; padding-top: 12px;">
          <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 24px;">
            Customer Signature
          </div>
          <div style="border-bottom: 2px solid #000; margin-bottom: 8px; height: 48px;"></div>
          <div style="display: flex; justify-content: space-between;">
            <div style="font-size: 9px; color: #999;">Sign above the line</div>
            <div style="font-size: 9px; color: #999;">${tag.date}</div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Signature Tags</title>
      <style>
        @page { size: 4in 6in; margin: 0; }
        @media print { body { margin: 0; } }
        body { margin: 0; padding: 0.25in; }
      </style>
    </head>
    <body>${tagHtml}</body>
    </html>
  `;
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export function SignatureTagPrint({
  packages,
  customer,
  selectedIds,
  compact = false,
  className,
}: SignatureTagPrintProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [printed, setPrinted] = useState(false);

  const tags = generateTags(packages, customer, selectedIds);
  const tagCount = tags.length;

  const handlePrint = useCallback(() => {
    const html = generatePrintHtml(tags);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setPrinted(true);
    }
  }, [tags]);

  const handlePrintAll = useCallback(() => {
    const allTags = generateTags(packages, customer);
    const html = generatePrintHtml(allTags);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setPrinted(true);
    }
  }, [packages, customer]);

  if (tagCount === 0) return null;

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrint}
        leftIcon={<Printer className="h-3.5 w-3.5" />}
        className={cn('text-surface-400 hover:text-surface-200', className)}
      >
        Print Signature Tags ({tagCount})
      </Button>
    );
  }

  return (
    <>
      <Card padding="md" className={className}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <FileText className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">Signature Tags</p>
              <p className="text-xs text-surface-500">
                {tagCount} tag{tagCount !== 1 ? 's' : ''} ready · 4×6 thermal format
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {printed && (
              <Badge variant="success" dot>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Printed
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview(true)}
              className="text-surface-400 hover:text-surface-200"
            >
              Preview
            </Button>
            <Button
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              onClick={handlePrint}
            >
              Print Selected ({tagCount})
            </Button>
            {selectedIds && selectedIds.size < packages.length && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Printer className="h-3.5 w-3.5" />}
                onClick={handlePrintAll}
              >
                Print All ({packages.length})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <Modal open={showPreview} onClose={() => setShowPreview(false)}>
          <div className="p-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-100">Signature Tag Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-surface-500 hover:text-surface-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {tags.map((tag) => (
                <div
                  key={tag.packageId}
                  className="border border-surface-700 rounded-lg p-4 bg-surface-900"
                >
                  <div className="text-center border-b border-surface-700 pb-2 mb-3">
                    <p className="text-sm font-bold text-surface-200 tracking-wide">SIGNATURE TAG</p>
                    <p className="text-[10px] text-surface-500">Package Release Authorization</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-surface-500">Package ID</p>
                      <p className="font-semibold text-surface-200">{tag.packageId.slice(-8).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-surface-500">Date</p>
                      <p className="font-semibold text-surface-200">{tag.date}</p>
                    </div>
                  </div>
                  <div className="mb-2">
                    <p className="text-[10px] text-surface-500">Recipient</p>
                    <p className="font-bold text-surface-100">{tag.recipientName}</p>
                  </div>
                  <div className="flex gap-4 text-xs mb-3">
                    <div><p className="text-surface-500">PMB</p><p className="font-semibold text-surface-200">{tag.pmbNumber}</p></div>
                    <div><p className="text-surface-500">Carrier</p><p className="font-semibold text-surface-200">{tag.carrier.toUpperCase()}</p></div>
                  </div>
                  <div className="border-t border-dashed border-surface-600 pt-3 mt-3">
                    <p className="text-[10px] text-surface-500 mb-4">Customer Signature</p>
                    <div className="border-b-2 border-surface-600 h-8 mb-1" />
                    <p className="text-[9px] text-surface-600">Sign above the line</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                fullWidth
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => {
                  handlePrint();
                  setShowPreview(false);
                }}
              >
                Print {tagCount} Tag{tagCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
