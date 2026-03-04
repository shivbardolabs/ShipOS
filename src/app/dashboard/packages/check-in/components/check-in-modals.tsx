'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { RtsInitiateDialog } from '@/components/packages/rts-initiate-dialog';
import { BatchSessionSummary } from '@/components/packages/batch-session-summary';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, ExternalLink, Hash,
  Loader2, Mail, MessageSquare, Package, Printer, RefreshCw,
  RotateCcw, Save, Snowflake, Truck, X, XIcon,
  AlertTriangle,
} from 'lucide-react';
import type { SearchCustomer, DuplicatePackage } from './types';

export interface CheckInModalsProps {
  step: number;
  setStep: (v: number) => void;
  isSubmitting: boolean;
  isOnline: boolean;
  showSuccess: boolean;
  setShowSuccess: (v: boolean) => void;
  checkedInPackageId: string | null;
  showCancelModal: boolean;
  setShowCancelModal: (v: boolean) => void;
  showRtsDialog: boolean;
  setShowRtsDialog: (v: boolean) => void;
  showDuplicateModal: boolean;
  setShowDuplicateModal: (v: boolean) => void;
  showSizeWarning: boolean;
  setShowSizeWarning: (v: boolean) => void;
  showPerishableWarning: boolean;
  setShowPerishableWarning: (v: boolean) => void;
  showBatchSummary: boolean;
  setShowBatchSummary: (v: boolean) => void;
  duplicatePackage: DuplicatePackage | null;
  setDuplicatePackage: (v: DuplicatePackage | null) => void;
  duplicateAcknowledged: boolean;
  setDuplicateAcknowledged: (v: boolean) => void;
  duplicateOverrideReason: string;
  setDuplicateOverrideReason: (v: string) => void;
  sizeWarningAcked: boolean;
  setSizeWarningAcked: (v: boolean) => void;
  perishableWarningAcked: boolean;
  setPerishableWarningAcked: (v: boolean) => void;
  selectedCustomer: SearchCustomer | null;
  selectedCarrier: string;
  trackingNumber: string;
  setTrackingNumber: (v: string) => void;
  sendEmail: boolean;
  sendSms: boolean;
  packageType: string;
  isWalkIn: boolean;
  walkInName: string;
  labelPrintFailed: boolean;
  setLabelPrintFailed: (v: boolean) => void;
  notificationFailed: boolean;
  setNotificationFailed: (v: boolean) => void;
  batchCount: number;
  setBatchCount: React.Dispatch<React.SetStateAction<number>>;
  batchSessionPackages: any[];
  setBatchSessionPackages: React.Dispatch<React.SetStateAction<any[]>>;
  batchSessionStart: Date;
  autoAdvanceTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  handleSubmit: () => void;
  handleReset: () => void;
  handleSaveDraft: () => void;
  handleClearAndReset: () => void;
  handleCheckInAnother: () => void;
  handleRetryLabelPrint: () => void;
  handleRetryNotification: () => void;
  handleGenerateTracking: () => void;
}

export function CheckInModals(props: CheckInModalsProps) {
  const {
    step, setStep, isSubmitting, isOnline,
    showSuccess, setShowSuccess, checkedInPackageId,
    showCancelModal, setShowCancelModal,
    showRtsDialog, setShowRtsDialog,
    showDuplicateModal, setShowDuplicateModal,
    showSizeWarning, setShowSizeWarning,
    showPerishableWarning, setShowPerishableWarning,
    showBatchSummary, setShowBatchSummary,
    duplicatePackage, setDuplicatePackage,
    duplicateAcknowledged, setDuplicateAcknowledged,
    duplicateOverrideReason, setDuplicateOverrideReason,
    sizeWarningAcked, setSizeWarningAcked,
    perishableWarningAcked, setPerishableWarningAcked,
    selectedCustomer, selectedCarrier, trackingNumber, setTrackingNumber,
    sendEmail, sendSms, packageType, isWalkIn, walkInName,
    labelPrintFailed, setLabelPrintFailed,
    notificationFailed, setNotificationFailed,
    batchCount, setBatchCount,
    batchSessionPackages, setBatchSessionPackages,
    batchSessionStart,
    autoAdvanceTimerRef,
    handleSubmit, handleReset, handleSaveDraft,
    handleClearAndReset, handleCheckInAnother,
    handleRetryLabelPrint, handleRetryNotification, handleGenerateTracking,
  } = props;

  return (
    <>

      {/* ================================================================== */}
      {/*  BAR-245: Size Warning Modal (Large / Extra Large)                  */}
      {/* ================================================================== */}
      <Modal
        open={showSizeWarning}
        onClose={() => { setShowSizeWarning(false); setSizeWarningAcked(true); }}
        title="Large Package Notice"
        size="sm"
        footer={
          <Button onClick={() => { setShowSizeWarning(false); setSizeWarningAcked(true); }}>
            OK
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mb-4">
            <Package className="h-7 w-7 text-amber-600" />
          </div>
          <p className="text-sm text-surface-300 max-w-xs">
            This customer will be notified this package will accrue <strong className="text-surface-100">storage fees</strong> after the free storage period ends.
          </p>
          <p className="mt-3 text-xs text-surface-500 max-w-xs">
            The notification will include: &ldquo;Due to its size, this package will accrue storage fees of $1/day if not picked up within 30 days of receipt.&rdquo;
          </p>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  BAR-245: Perishable Warning Modal                                  */}
      {/* ================================================================== */}
      <Modal
        open={showPerishableWarning}
        onClose={() => { setShowPerishableWarning(false); setPerishableWarningAcked(true); }}
        title="Perishable Package Notice"
        size="sm"
        footer={
          <Button onClick={() => { setShowPerishableWarning(false); setPerishableWarningAcked(true); }}>
            OK
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 mb-4">
            <Snowflake className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-sm text-surface-300 max-w-xs">
            This customer will be notified this package <strong className="text-surface-100">must be picked up within 24 hours</strong>.
          </p>
          <p className="mt-3 text-xs text-surface-500 max-w-xs">
            The notification will include: &ldquo;This package contains perishable goods. Please pick up within 24 hours or it may be disposed of.&rdquo;
          </p>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  BAR-328: Duplicate Tracking Number Modal (enhanced)                */}
      {/* ================================================================== */}
      <Modal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Duplicate Tracking Number"
        size="md"
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="secondary"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => {
                setShowDuplicateModal(false);
                window.open(`/dashboard/packages?id=${duplicatePackage?.id}`, '_blank');
              }}
            >
              View Existing
            </Button>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setShowDuplicateModal(false);
                setTrackingNumber('');
                setDuplicatePackage(null);
                setDuplicateAcknowledged(false);
                setDuplicateOverrideReason('');
              }}
            >
              Clear &amp; Re-enter
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Hash className="h-4 w-4" />}
              onClick={handleGenerateTracking}
            >
              Generate New
            </Button>
            <Button
              leftIcon={<AlertTriangle className="h-4 w-4" />}
              disabled={!duplicateOverrideReason.trim()}
              onClick={() => {
                setDuplicateAcknowledged(true);
                setShowDuplicateModal(false);
              }}
              className="!bg-amber-600 hover:!bg-amber-700 !text-white"
            >
              Override &amp; Continue
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-200">
                This tracking number is already in the system
              </p>
              <p className="text-xs text-surface-400 mt-1">
                Check-in is blocked by default. If this is a legitimate re-delivery (e.g., returned package, replacement), enter a reason below to override.
              </p>
            </div>
          </div>

          {/* Existing package details */}
          {duplicatePackage && (
            <div className="bg-surface-800/60 rounded-lg p-3 text-xs space-y-1.5 mb-4">
              <p className="text-xs font-medium text-surface-300 mb-2">Existing Package</p>
              <div className="flex justify-between">
                <span className="text-surface-500">Tracking:</span>
                <span className="font-mono text-surface-300">{duplicatePackage.trackingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Customer:</span>
                <span className="text-surface-300">{duplicatePackage.customerName} ({duplicatePackage.customerPmb})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Status:</span>
                <span className="text-surface-300 capitalize">{duplicatePackage.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Checked In:</span>
                <span className="text-surface-300">{new Date(duplicatePackage.checkedInAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Override reason */}
          <div>
            <label className="text-sm font-medium text-surface-300 mb-1.5 block">
              Override Reason <span className="text-red-400">*</span>
            </label>
            <Select
              value={duplicateOverrideReason}
              onChange={(e) => setDuplicateOverrideReason(e.target.value)}
              options={[
                { value: '', label: 'Select a reason...' },
                { value: 'Re-delivery', label: 'Re-delivery — package was returned and re-sent' },
                { value: 'Replacement', label: 'Replacement — carrier sent a replacement' },
                { value: 'Split shipment', label: 'Split shipment — same tracking, multiple boxes' },
                { value: 'Carrier reused tracking', label: 'Carrier reused tracking number' },
                { value: 'Other', label: 'Other' },
              ]}
            />
            <p className="mt-1.5 text-[11px] text-surface-500">
              This reason will be logged in the audit trail and linked to the original package.
            </p>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  Success Modal                                                      */}
      {/* ================================================================== */}
      <Modal
        open={showSuccess}
        onClose={handleReset}
        title="Package Checked In"
        size="sm"
        persistent
        footer={
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => (window.location.href = checkedInPackageId
                  ? `/dashboard/packages?id=${checkedInPackageId}`
                  : '/dashboard/packages')}
                className="flex-1"
              >
                View Package
              </Button>
              <Button onClick={handleReset} variant="secondary" className="flex-1">New Check-In</Button>
            </div>
            {/* BAR-9 Gap 3: Check in another for same customer */}
            {(selectedCustomer || isWalkIn) && (
              <Button onClick={handleCheckInAnother} className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Check in another for this customer
              </Button>
            )}
            {/* BAR-40: Done — show batch session summary */}
            {batchCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  // Add the last package to session list
                  if (checkedInPackageId && !batchSessionPackages.find((p) => p.id === checkedInPackageId)) {
                    setBatchSessionPackages((prev) => [
                      ...prev,
                      {
                        id: checkedInPackageId,
                        trackingNumber: trackingNumber || undefined,
                        carrier: selectedCarrier || 'other',
                        customerName: selectedCustomer
                          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                          : (walkInName || 'Walk-in'),
                        pmbNumber: selectedCustomer?.pmbNumber || 'N/A',
                        packageType: packageType || 'medium',
                        checkedInAt: new Date().toISOString(),
                        labelPrinted: true,
                        notified: sendEmail || sendSms,
                      },
                    ]);
                  }
                  // Send consolidated notification
                  if (selectedCustomer?.id) {
                    fetch(`/api/packages/batch-notify`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customerId: selectedCustomer.id }),
                    }).catch(() => {});
                  }
                  setShowBatchSummary(true);
                  setShowSuccess(false);
                }}
                className="w-full"
              >
                Done — View Session Summary ({batchCount + 1} packages)
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-surface-100 mb-1">
            Successfully Checked In!
          </h3>
          {/* BAR-9 Gap 3: Show batch count */}
          {batchCount > 0 && (
            <p className="text-xs text-primary-400 mb-2">
              📦 {batchCount + 1} packages checked in this session
            </p>
          )}
          <p className="text-sm text-surface-400 max-w-xs">
            Package for{' '}
            <span className="text-surface-200 font-medium">
              {isWalkIn
                ? walkInName
                : selectedCustomer
                  ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  : ''
              }
            </span>{' '}
            {!isWalkIn && selectedCustomer?.pmbNumber ? `(${selectedCustomer.pmbNumber}) ` : ''}
            has been checked in
            {(sendEmail || sendSms) ? ' and notifications have been sent.' : '.'}
          </p>
          {trackingNumber && (
            <p className="mt-3 font-mono text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
              {trackingNumber}
            </p>
          )}

          {/* BAR-9 Gap 6: Retry buttons for failed operations */}
          {(labelPrintFailed || notificationFailed) && (
            <div className="mt-4 w-full space-y-2">
              {labelPrintFailed && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                  <span className="text-amber-400 flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Label print failed
                  </span>
                  <div className="flex gap-2">
                    <button onClick={handleRetryLabelPrint} className="text-xs text-primary-400 hover:text-primary-300 font-medium">
                      Retry
                    </button>
                    <button onClick={() => setLabelPrintFailed(false)} className="text-xs text-surface-500 hover:text-surface-400">
                      Skip
                    </button>
                  </div>
                </div>
              )}
              {notificationFailed && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                  <span className="text-amber-400 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Notification failed
                  </span>
                  <div className="flex gap-2">
                    <button onClick={handleRetryNotification} className="text-xs text-primary-400 hover:text-primary-300 font-medium">
                      Retry
                    </button>
                    <button onClick={() => setNotificationFailed(false)} className="text-xs text-surface-500 hover:text-surface-400">
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  BAR-9 Gap 1: Cancel Confirmation Modal                             */}
      {/* ================================================================== */}
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Check-In?"
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)} className="flex-1">
              Continue Editing
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} className="flex-1">
              Save Progress
            </Button>
            <Button
              onClick={handleClearAndReset}
              className="flex-1 !bg-red-600 hover:!bg-red-700 !text-white"
            >
              Clear
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <p className="text-sm text-surface-300 mb-3">
            What would you like to do with your current progress?
          </p>
          <div className="space-y-2 text-xs text-surface-400">
            <p>• <strong className="text-surface-300">Save Progress</strong> — saves your current entries as a draft. You can resume later.</p>
            <p>• <strong className="text-surface-300">Clear</strong> — discards all entries and starts over from Step 1.</p>
          </div>
        </div>
      </Modal>

      {/* RTS Dialog — triggered from no-results flow (BAR-321) */}
      {showRtsDialog && (
        <RtsInitiateDialog
          onClose={() => setShowRtsDialog(false)}
          onSuccess={() => {
            setShowRtsDialog(false);
            handleReset();
          }}
          prefillReason="no_matching_customer"
        />
      )}

      {/* BAR-40: Batch Session Summary Modal */}
      {showBatchSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl">
            <BatchSessionSummary
              packages={batchSessionPackages}
              sessionStart={batchSessionStart}
              sessionEnd={new Date()}
              onDismiss={() => {
                setShowBatchSummary(false);
                setBatchSessionPackages([]);
                setBatchCount(0);
                handleReset();
              }}
              onGoToPackages={() => {
                window.location.href = '/dashboard/packages';
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
