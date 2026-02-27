'use client';

/**
 * BAR-259: Reprint Package Label Action
 * BAR-84: Reprint Last Carrier Shipping Label
 *
 * Modal component for reprinting package identification labels and carrier
 * shipping labels. Uses the existing LabelPreview component and labels API.
 */

import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LabelPreview } from '@/components/ui/label-preview';
import {
  Printer,
  RotateCcw,
  Package,
  CheckCircle2,
} from 'lucide-react';
import type { InventoryPackage, CarrierLabelRecord } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Package Label Reprint (BAR-259)                                           */
/* -------------------------------------------------------------------------- */

interface PackageLabelReprintProps {
  open: boolean;
  onClose: () => void;
  packages: InventoryPackage[];
  storeName: string;
}

export function PackageLabelReprintModal({
  open,
  onClose,
  packages,
  storeName,
}: PackageLabelReprintProps) {
  const [printed, setPrinted] = useState<Set<string>>(new Set());

  const markPrinted = useCallback((pkgId: string) => {
    setPrinted((prev) => new Set([...prev, pkgId]));
  }, []);

  const isBulk = packages.length > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isBulk ? `Reprint Labels (${packages.length})` : 'Reprint Package Label'}
      size={isBulk ? 'xl' : 'lg'}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-surface-500">
            {printed.size} of {packages.length} printed
          </span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex items-start gap-4 p-4 rounded-lg border border-surface-700 bg-surface-800/30"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-surface-400" />
                <span className="text-sm font-medium text-surface-200">
                  {pkg.customer
                    ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                    : pkg.recipientName || 'Unknown'}
                </span>
                <span className="text-xs text-surface-500">
                  {pkg.customer?.pmbNumber || pkg.kinekNumber || '—'}
                </span>
                {printed.has(pkg.id) && (
                  <Badge variant="success" className="text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Printed
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <span className="text-surface-500">Tracking: </span>
                  <span className="text-surface-300 font-mono">
                    {pkg.trackingNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-surface-500">Carrier: </span>
                  <span className="text-surface-300">{pkg.carrier}</span>
                </div>
                <div>
                  <span className="text-surface-500">Type: </span>
                  <span className="text-surface-300">{pkg.packageType}</span>
                </div>
              </div>

              <div onClick={() => markPrinted(pkg.id)}>
                <LabelPreview
                  template="package"
                  data={{
                    pmbNumber: pkg.customer?.pmbNumber || pkg.kinekNumber || 'N/A',
                    customerName: pkg.customer
                      ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                      : pkg.recipientName || 'Walk-In',
                    trackingNumber: pkg.trackingNumber || 'N/A',
                    carrier: pkg.carrier.toUpperCase(),
                    checkedInAt: pkg.checkedInAt,
                    packageId: pkg.id,
                    storeName,
                  }}
                  showPreview={false}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Carrier Shipping Label Reprint (BAR-84)                                   */
/* -------------------------------------------------------------------------- */

interface CarrierLabelReprintProps {
  open: boolean;
  onClose: () => void;
  lastLabel: CarrierLabelRecord | null;
}

export function CarrierLabelReprintModal({
  open,
  onClose,
  lastLabel,
}: CarrierLabelReprintProps) {
  const [reprinted, setReprinted] = useState(false);

  const handlePrint = useCallback(() => {
    if (!lastLabel) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(lastLabel.labelHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    setReprinted(true);
  }, [lastLabel]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reprint Last Carrier Label"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handlePrint}
            disabled={!lastLabel}
            leftIcon={reprinted ? <RotateCcw className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
          >
            {reprinted ? 'Print Again' : 'Print Label'}
          </Button>
        </>
      }
    >
      {lastLabel ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-surface-500">Tracking Number</p>
              <p className="text-sm font-mono text-surface-200">{lastLabel.trackingNumber}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Carrier / Service</p>
              <p className="text-sm text-surface-200">{lastLabel.carrier} — {lastLabel.service}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Customer</p>
              <p className="text-sm text-surface-200">{lastLabel.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Printed At</p>
              <p className="text-sm text-surface-200">
                {new Date(lastLabel.printedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="border border-surface-700 rounded-lg overflow-hidden bg-white p-2">
            <iframe
              srcDoc={lastLabel.labelHtml}
              title="Label Preview"
              className="w-full border-none"
              style={{ height: '300px' }}
            />
          </div>

          {reprinted && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Label sent to printer — no new shipment or tracking number created
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-surface-500">
          <Printer className="h-8 w-8 mx-auto mb-3 text-surface-600" />
          <p className="text-sm">No carrier label has been printed this session.</p>
          <p className="text-xs mt-1">Labels are available for reprint until you print a new one or the session ends.</p>
        </div>
      )}
    </Modal>
  );
}
