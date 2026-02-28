'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Printer,
  Trash2,
  Eye,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { printLabel, renderPackageLabel } from '@/lib/labels';
import type { PackageLabelData } from '@/lib/labels';

/* -------------------------------------------------------------------------- */
/*  BAR-41: Automated Label Printing — Batch Queue Component                  */
/*                                                                            */
/*  Manages a queue of labels for batch printing during high-volume sessions. */
/*  Shows label count, preview, and batch print controls.                     */
/* -------------------------------------------------------------------------- */

export interface QueuedLabel {
  id: string;
  packageId: string;
  customerName: string;
  pmbNumber: string;
  trackingNumber: string;
  carrier: string;
  checkedInAt: string;
  storeName: string;
  /** BAR-266: Program type label (e.g. Store, iPostal, UPS Access Point) */
  programType?: string;
  /** BAR-266: Package condition from Step 3 */
  condition?: string;
  /** BAR-266: Perishable flag */
  perishable?: boolean;
  /** BAR-266: Carrier program flag (UPS AP, FedEx HAL, Amazon) */
  isCarrierProgram?: boolean;
  /** Pre-rendered label HTML (if already generated) */
  labelHtml?: string;
}

export type PrintMode = 'per-package' | 'batch';

interface LabelPrintQueueProps {
  /** Labels currently in the queue */
  queue: QueuedLabel[];
  /** Print mode: per-package auto-print or batch queue */
  printMode: PrintMode;
  /** Callback when a label is removed from queue */
  onRemoveFromQueue: (id: string) => void;
  /** Callback when all labels are printed */
  onBatchPrintComplete: () => void;
  /** Callback to clear the entire queue */
  onClearQueue: () => void;
  className?: string;
}

export function LabelPrintQueue({
  queue,
  printMode,
  onRemoveFromQueue,
  onBatchPrintComplete,
  onClearQueue,
  className,
}: LabelPrintQueueProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const generateLabelHtml = useCallback((label: QueuedLabel): string => {
    const data: PackageLabelData = {
      pmbNumber: label.pmbNumber,
      customerName: label.customerName,
      trackingNumber: label.trackingNumber,
      carrier: label.carrier,
      checkedInAt: label.checkedInAt,
      packageId: label.packageId,
      storeName: label.storeName,
      programType: label.programType,
      condition: label.condition,
      perishable: label.perishable,
      isCarrierProgram: label.isCarrierProgram,
    };
    return renderPackageLabel(data);
  }, []);

  const handlePrintAll = useCallback(async () => {
    if (queue.length === 0) return;
    setPrinting(true);
    setPrintError(null);

    try {
      // Generate all label HTML
      const allLabelsHtml = queue
        .map((label) => {
          const html = label.labelHtml || generateLabelHtml(label);
          // Strip the HTML wrapper to get just the body content
          return html;
        })
        .join('\n<div style="page-break-after: always;"></div>\n');

      printLabel(allLabelsHtml);
      onBatchPrintComplete();
    } catch {
      setPrintError('Failed to print labels. Please try again.');
    } finally {
      setPrinting(false);
    }
  }, [queue, generateLabelHtml, onBatchPrintComplete]);

  const handlePreviewLabel = useCallback(
    (index: number) => {
      setPreviewIndex(index);
      setShowPreview(true);
    },
    []
  );

  if (printMode !== 'batch') return null;

  return (
    <>
      {/* Queue Status Bar */}
      <Card padding="md" className={cn('relative', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-200">
                Label Print Queue
              </p>
              <p className="text-xs text-surface-400">
                {queue.length === 0
                  ? 'No labels queued — check in packages to add them'
                  : `${queue.length} label${queue.length !== 1 ? 's' : ''} queued for printing`}
              </p>
            </div>
            {queue.length > 0 && (
              <Badge variant="info" dot>
                {queue.length}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreviewLabel(0)}
                  leftIcon={<Eye className="h-4 w-4" />}
                >
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearQueue}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrintAll}
                  disabled={printing}
                  leftIcon={<Printer className="h-4 w-4" />}
                >
                  {printing ? 'Printing…' : `Print All (${queue.length})`}
                </Button>
              </>
            )}
          </div>
        </div>

        {printError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/5 rounded-lg p-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {printError}
            <button
              onClick={handlePrintAll}
              className="ml-auto text-xs font-medium text-red-300 hover:text-red-200 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Queue Items (collapsed list) */}
        {queue.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
            {queue.map((label, idx) => (
              <div
                key={label.id}
                className="flex items-center justify-between rounded-lg bg-surface-800/40 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-surface-500 w-5 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-primary-400 shrink-0">
                    {label.pmbNumber}
                  </span>
                  <span className="text-sm text-surface-300 truncate">
                    {label.customerName}
                  </span>
                  <span className="text-xs text-surface-500 truncate">
                    {label.carrier.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handlePreviewLabel(idx)}
                    className="p-1.5 rounded-md text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                    title="Preview label"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveFromQueue(label.id)}
                    className="p-1.5 rounded-md text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove from queue"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Label Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={`Label Preview (${previewIndex + 1} of ${queue.length})`}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPreviewIndex(Math.max(0, previewIndex - 1))
                }
                disabled={previewIndex === 0}
              >
                ← Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPreviewIndex(
                    Math.min(queue.length - 1, previewIndex + 1)
                  )
                }
                disabled={previewIndex >= queue.length - 1}
              >
                Next →
              </Button>
            </div>
            <Button
              size="sm"
              onClick={handlePrintAll}
              disabled={printing}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Print All ({queue.length})
            </Button>
          </div>
        }
      >
        {queue[previewIndex] && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-surface-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>
                {queue[previewIndex].customerName} —{' '}
                <span className="font-mono text-primary-400">
                  {queue[previewIndex].pmbNumber}
                </span>
              </span>
            </div>
            <div
              className="border border-surface-700 rounded-lg overflow-hidden bg-white"
              style={{ width: '4in', maxWidth: '100%' }}
            >
              <iframe
                srcDoc={generateLabelHtml(queue[previewIndex])}
                title="Label Preview"
                style={{
                  width: '4in',
                  height: '6in',
                  border: 'none',
                  transform: 'scale(0.6)',
                  transformOrigin: 'top left',
                  maxWidth: '100%',
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
