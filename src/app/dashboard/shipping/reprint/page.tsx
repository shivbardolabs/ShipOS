'use client';

/**
 * BAR-84: Reprint Last Carrier Shipping Label
 *
 * Quick-access page to reprint the most recently printed carrier label.
 * No duplicate shipment or tracking number created — just reprints the HTML.
 *
 * Labels are session-based: available until a new label is printed or
 * the session ends.
 */

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  Printer,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { CarrierLabelRecord } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Session-based label storage                                               */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'shipos_last_carrier_labels';

function getStoredLabels(): CarrierLabelRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Mock label for demo                                                       */
/* -------------------------------------------------------------------------- */

const MOCK_LABELS: CarrierLabelRecord[] = [
  {
    id: 'lbl_001',
    trackingNumber: '1Z999AA10000000001',
    carrier: 'ups',
    service: 'UPS Ground',
    labelHtml: `<html><body style="font-family:Arial;padding:20px;width:4in;height:6in;">
      <h1 style="font-size:24pt;">UPS GROUND</h1>
      <p style="font-size:14pt;font-weight:bold;">TRACKING: 1Z999AA10000000001</p>
      <hr/>
      <p><strong>FROM:</strong> ShipOS Store<br/>123 Main St<br/>New York, NY 10001</p>
      <hr/>
      <p><strong>TO:</strong> John Smith<br/>456 Oak Ave<br/>Los Angeles, CA 90001</p>
      <div style="text-align:center;margin-top:20px;">
        <div style="height:60px;background:repeating-linear-gradient(90deg,#000 0 2px,#fff 2px 4px);width:80%;margin:auto;"></div>
      </div>
    </body></html>`,
    printedAt: new Date(Date.now() - 3600000).toISOString(),
    shipmentId: 'ship_001',
    customerName: 'John Smith',
  },
  {
    id: 'lbl_002',
    trackingNumber: '7489 1234 5678 9012',
    carrier: 'fedex',
    service: 'FedEx Express Saver',
    labelHtml: `<html><body style="font-family:Arial;padding:20px;width:4in;height:6in;">
      <h1 style="font-size:24pt;color:#4D148C;">FEDEX EXPRESS SAVER</h1>
      <p style="font-size:14pt;font-weight:bold;">TRACKING: 7489 1234 5678 9012</p>
      <hr/>
      <p><strong>FROM:</strong> ShipOS Store<br/>123 Main St<br/>New York, NY 10001</p>
      <hr/>
      <p><strong>TO:</strong> Sarah Johnson<br/>789 Elm Blvd<br/>Chicago, IL 60601</p>
    </body></html>`,
    printedAt: new Date(Date.now() - 7200000).toISOString(),
    shipmentId: 'ship_002',
    customerName: 'Sarah Johnson',
  },
];

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function ReprintPage() {
  const [labels, setLabels] = useState<CarrierLabelRecord[]>([]);
  const [printedIds, setPrintedIds] = useState<Set<string>>(new Set());
  const [selectedLabel, setSelectedLabel] = useState<CarrierLabelRecord | null>(null);

  useEffect(() => {
    const stored = getStoredLabels();
    setLabels(stored.length > 0 ? stored : MOCK_LABELS);
  }, []);

  const handlePrint = useCallback((label: CarrierLabelRecord) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(label.labelHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    setPrintedIds((prev) => new Set([...prev, label.id]));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reprint Carrier Label"
        description="Reprint a recently printed shipping label — no duplicate shipment created"
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => (window.location.href = '/dashboard/shipping')}
          >
            Back to Shipping
          </Button>
        }
      />

      {/* Info Banner */}
      <Card padding="md" className="border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300">No Duplicate Shipment</p>
            <p className="text-xs text-blue-400/70">
              Reprinting a label does NOT create a new shipment or tracking number.
              It simply re-outputs the same label for printing. Labels are available
              for the current session.
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Labels */}
      {labels.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <Printer className="mx-auto h-10 w-10 text-surface-600 mb-4" />
            <p className="text-surface-400">No labels printed this session</p>
            <p className="text-xs text-surface-600 mt-1">
              Labels appear here after printing from the shipping page
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider">
            Recent Labels ({labels.length})
          </h3>

          {labels.map((label) => (
            <Card key={label.id} padding="md">
              <div className="flex items-center gap-4">
                {/* Carrier logo */}
                <div className="shrink-0">
                  <CarrierLogo carrier={label.carrier} size={32} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-surface-200">
                      {label.customerName}
                    </p>
                    <Badge variant="muted" className="text-[10px]">
                      {label.service}
                    </Badge>
                    {printedIds.has(label.id) && (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Reprinted
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-xs text-surface-400">
                    {label.trackingNumber}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-surface-500">
                    <Clock className="h-3 w-3" />
                    <span>Printed {formatDate(label.printedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelectedLabel(
                        selectedLabel?.id === label.id ? null : label
                      )
                    }
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={
                      printedIds.has(label.id) ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )
                    }
                    onClick={() => handlePrint(label)}
                  >
                    {printedIds.has(label.id) ? 'Print Again' : 'Print'}
                  </Button>
                </div>
              </div>

              {/* Preview Iframe */}
              {selectedLabel?.id === label.id && (
                <div className="mt-4 border border-surface-700 rounded-lg overflow-hidden bg-white p-2">
                  <iframe
                    srcDoc={label.labelHtml}
                    title="Label Preview"
                    className="w-full border-none"
                    style={{ height: '350px' }}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="text-center text-xs text-surface-600">
        <Package className="h-3.5 w-3.5 inline mr-1" />
        Tip: Use <kbd className={cn(
          'mx-0.5 px-1.5 py-0.5 rounded border text-[10px] font-mono',
          'border-surface-700 bg-surface-800 text-surface-400'
        )}>Ctrl+P</kbd> to print the focused label
      </div>
    </div>
  );
}
