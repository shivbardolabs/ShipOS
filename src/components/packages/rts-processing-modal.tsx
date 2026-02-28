'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { cn, formatDate } from '@/lib/utils';
import {
  Printer,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Mail,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface RtsRecord {
  id: string;
  step: string;
  reason: string;
  reasonDetail: string | null;
  carrier: string | null;
  returnTrackingNumber: string | null;
  carrierNotes: string | null;
  pmbNumber: string | null;
  initiatedAt: string;
  labelPrintedAt: string | null;
  carrierHandoffAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason?: string | null;
  packageId: string | null;
  mailPieceId: string | null;
  package?: {
    trackingNumber: string | null;
    carrier: string;
    packageType: string;
    senderName: string | null;
    storageLocation: string | null;
    customer?: { firstName: string; lastName: string; pmbNumber: string };
  } | null;
  mailPiece?: {
    type: string;
    sender: string | null;
  } | null;
}

interface RtsProcessingModalProps {
  record: RtsRecord;
  onClose: () => void;
  onUpdate: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */
const REASON_LABELS: Record<string, string> = {
  no_matching_customer: 'No Matching Customer',
  closed_pmb: 'Closed PMB',
  expired_pmb: 'Expired PMB',
  customer_request: 'Customer Request',
  storage_policy_expiry: 'Storage Policy Expiry',
  refused: 'Refused',
  unclaimed: 'Unclaimed',
  other: 'Other',
};

const CARRIER_PROCEDURES: Record<string, { title: string; steps: string[] }> = {
  usps: {
    title: 'USPS Return Procedures',
    steps: [
      'Cross out the delivery barcode on the label',
      'Write "RETURN TO SENDER" clearly on the package',
      'Mark reason: "Attempted – Not Known", "No Such Number", "Refused", etc.',
      'Do NOT remove the original label',
      'Place in outgoing mail / give to carrier during next pickup',
      'Log scan in USPS CMRA portal (if applicable)',
    ],
  },
  fedex: {
    title: 'FedEx Return Procedures',
    steps: [
      'Create a FedEx Return Label via Ship Manager or fedex.com',
      'Apply the new return label over the original',
      'Schedule a FedEx pickup or drop at a FedEx location',
      'Note the new tracking number for the return shipment',
      'For FedEx HAL packages — use the HAL Return process in the portal',
    ],
  },
  ups: {
    title: 'UPS Return Procedures',
    steps: [
      'Create a UPS Return Label via UPS.com or CampusShip',
      'Apply the return label over the original shipping label',
      'Schedule a UPS pickup or drop at a UPS Access Point / Store',
      'Note the new tracking number for the return shipment',
      'For Access Point packages — use the AP Return process in the portal',
    ],
  },
  dhl: {
    title: 'DHL Return Procedures',
    steps: [
      'Create a DHL Return Label via MyDHL+ or contact DHL support',
      'Apply the return label to the package',
      'Schedule a DHL pickup or drop at a DHL ServicePoint',
      'Note the new tracking number for the return shipment',
    ],
  },
  other: {
    title: 'General Return Procedures',
    steps: [
      'Contact the carrier for return procedures',
      'Create or obtain a return shipping label',
      'Apply the return label to the package',
      'Schedule pickup or drop off at the carrier\'s location',
      'Record the return tracking number',
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Stepper visual                                                            */
/* -------------------------------------------------------------------------- */
const STEPS = [
  { key: 'initiated', label: 'Initiated', icon: Clock },
  { key: 'label_printed', label: 'Label Printed', icon: Printer },
  { key: 'carrier_handoff', label: 'Carrier Handoff', icon: Truck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function getStepIndex(step: string): number {
  if (step === 'cancelled') return -1;
  return STEPS.findIndex((s) => s.key === step);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function RtsProcessingModal({ record, onClose, onUpdate }: RtsProcessingModalProps) {
  const [returnTrackingNumber, setReturnTrackingNumber] = useState(record.returnTrackingNumber || '');
  const [carrierNotes, setCarrierNotes] = useState(record.carrierNotes || '');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentStepIdx = getStepIndex(record.step);
  const isCancelled = record.step === 'cancelled';
  const isCompleted = record.step === 'completed';
  const isTerminal = isCancelled || isCompleted;

  const carrierKey = record.carrier?.toLowerCase() || 'other';
  const procedures = CARRIER_PROCEDURES[carrierKey] || CARRIER_PROCEDURES.other;

  const performAction = async (action: string) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/packages/rts/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          returnTrackingNumber: returnTrackingNumber.trim() || undefined,
          carrierNotes: carrierNotes.trim() || undefined,
          cancelReason: cancelReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="RTS Processing"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Stepper */}
        <div className="flex items-center justify-between px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = currentStepIdx > i;
            const isCurrent = currentStepIdx === i;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      isDone
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-primary-600 border-primary-500 text-white'
                          : isCancelled
                            ? 'bg-red-900/30 border-red-800/50 text-red-400'
                            : 'bg-surface-800 border-surface-600 text-surface-400',
                    )}
                  >
                    {isCancelled ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] mt-1.5 font-medium',
                      isDone || isCurrent ? 'text-surface-200' : 'text-surface-500',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 mt-[-16px]',
                      isDone ? 'bg-emerald-600' : 'bg-surface-700',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">RTS Cancelled</p>
                {record.cancelReason && (
                  <p className="text-xs text-red-400/80 mt-0.5">Reason: {record.cancelReason}</p>
                )}
                <p className="text-xs text-surface-500 mt-0.5">
                  {record.cancelledAt && formatDate(record.cancelledAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Item Details */}
        <div className="rounded-lg bg-surface-800/50 border border-surface-700 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-200">
            {record.packageId ? <Package className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {record.package?.trackingNumber || record.mailPiece?.sender || record.id}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <Detail label="Carrier" value={record.carrier} capitalize />
            <Detail label="Reason" value={REASON_LABELS[record.reason] || record.reason} />
            <Detail label="PMB" value={record.pmbNumber} />
            {record.package?.storageLocation && (
              <Detail label="Location" value={record.package.storageLocation} />
            )}
            {record.reasonDetail && (
              <div className="col-span-2">
                <Detail label="Notes" value={record.reasonDetail} />
              </div>
            )}
            <Detail label="Initiated" value={formatDate(record.initiatedAt)} />
            {record.labelPrintedAt && <Detail label="Label Printed" value={formatDate(record.labelPrintedAt)} />}
            {record.carrierHandoffAt && <Detail label="Carrier Handoff" value={formatDate(record.carrierHandoffAt)} />}
            {record.completedAt && <Detail label="Completed" value={formatDate(record.completedAt)} />}
            {record.returnTrackingNumber && (
              <div className="col-span-2">
                <Detail label="Return Tracking" value={record.returnTrackingNumber} mono />
              </div>
            )}
          </div>
        </div>

        {/* Carrier-specific procedures (shown for active steps) */}
        {!isTerminal && (
          <div className="rounded-lg border border-surface-700 bg-surface-800/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              {record.carrier && <CarrierLogo carrier={record.carrier} size={18} />}
              <h4 className="text-sm font-medium text-surface-200">{procedures.title}</h4>
            </div>
            <ol className="space-y-1.5 text-xs text-surface-400 list-decimal list-inside">
              {procedures.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Action inputs (for advancing steps) */}
        {!isTerminal && (
          <div className="space-y-4">
            {(record.step === 'label_printed' || record.step === 'carrier_handoff') && (
              <Input
                label="Return Tracking Number"
                placeholder="Enter the return tracking number..."
                value={returnTrackingNumber}
                onChange={(e) => setReturnTrackingNumber(e.target.value)}
              />
            )}
            {(record.step === 'initiated' || record.step === 'label_printed') && (
              <Textarea
                label="Carrier Notes (optional)"
                placeholder="Any carrier-specific notes..."
                value={carrierNotes}
                onChange={(e) => setCarrierNotes(e.target.value)}
                rows={2}
              />
            )}
          </div>
        )}

        {/* Cancel form */}
        {showCancel && !isTerminal && (
          <div className="rounded-lg border border-red-800/40 bg-red-900/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">Cancel RTS</span>
            </div>
            <Textarea
              label="Cancellation Reason *"
              placeholder="Why is this RTS being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCancel(false)}>
                Never mind
              </Button>
              <Button
                size="sm"
                onClick={() => performAction('cancel')}
                disabled={!cancelReason.trim() || submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Action Buttons */}
        {!isTerminal && !showCancel && (
          <div className="flex items-center justify-between pt-2 border-t border-surface-700/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancel(true)}
              className="text-red-400 hover:text-red-300"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel RTS
            </Button>
            <div className="flex items-center gap-2">
              {record.step === 'initiated' && (
                <Button
                  size="sm"
                  onClick={() => performAction('print_label')}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  Mark Label Printed
                </Button>
              )}
              {record.step === 'label_printed' && (
                <Button
                  size="sm"
                  onClick={() => performAction('carrier_handoff')}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Record Carrier Handoff
                </Button>
              )}
              {record.step === 'carrier_handoff' && (
                <Button
                  size="sm"
                  onClick={() => performAction('complete')}
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Close for terminal states */}
        {isTerminal && (
          <div className="flex justify-end pt-2 border-t border-surface-700/50">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail row helper                                                         */
/* -------------------------------------------------------------------------- */
function Detail({
  label,
  value,
  capitalize,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  capitalize?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <span className="text-surface-500">{label}: </span>
      <span
        className={cn(
          'text-surface-300',
          capitalize && 'capitalize',
          mono && 'font-mono',
        )}
      >
        {value}
      </span>
    </div>
  );
}
