'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Mail, MessageSquare, Printer, AlertTriangle,
} from 'lucide-react';
import type { PackageDimensions } from '@/components/packages/camera-measure';
import { CheckboxOption, SummaryField } from './helpers';
import type { SearchCustomer, DuplicatePackage } from './types';
import { carrierOptions, packageTypeOptions } from './types';

export interface Step4Props {
  trackingNumber: string;
  selectedCarrier: string;
  senderName: string;
  packageType: string;
  packageDimensions: PackageDimensions;
  hazardous: boolean;
  perishable: boolean;
  condition: string;
  conditionOther: string;
  notes: string;
  storageLocation: string;
  requiresSignature: boolean;
  selectedCustomer: SearchCustomer | null;
  isWalkIn: boolean;
  walkInName: string;
  duplicatePackage: DuplicatePackage | null;
  duplicateAcknowledged: boolean;
  duplicateOverrideReason: string;
  submitError: string | null;
  setSubmitError: (v: string | null) => void;
  printLabelEnabled: boolean;
  setPrintLabelEnabled: (v: boolean) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  sendSms: boolean;
  setSendSms: (v: boolean) => void;
  setStep: (v: number) => void;
  step: number;
}

export function Step4ReviewConfirm(props: Step4Props) {
  const {
    trackingNumber, selectedCarrier, senderName,
    packageType, packageDimensions,
    hazardous, perishable, condition, conditionOther,
    notes, storageLocation, requiresSignature,
    selectedCustomer, isWalkIn, walkInName,
    duplicatePackage, duplicateAcknowledged, duplicateOverrideReason,
    submitError, setSubmitError,
    printLabelEnabled, setPrintLabelEnabled,
    sendEmail, setSendEmail, sendSms, setSendSms,
    setStep, step,
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">
          Confirm & Notify
        </h2>
        <p className="text-sm text-surface-400">
          Review the information and select notification options
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
          Package Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryField
            label="Customer"
            value={
              selectedCustomer
                ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                : isWalkIn ? walkInName : '—'
            }
          />
          <SummaryField
            label="PMB"
            value={isWalkIn ? 'Walk-In' : (selectedCustomer?.pmbNumber || '—')}
            mono
          />
          <SummaryField
            label="Store"
            value={isWalkIn ? '—' : (selectedCustomer?.platform || '—')}
          />
          <SummaryField
            label="Carrier"
            value={
              carrierOptions.find((c) => c.id === selectedCarrier)
                ?.label || '—'
            }
          />
          <SummaryField
            label="Sender"
            value={senderName || '—'}
          />
          <SummaryField
            label="Package Type"
            value={
              packageTypeOptions.find((p) => p.id === packageType)
                ?.label || '—'
            }
          />
          <SummaryField
            label="Tracking #"
            value={trackingNumber || 'Not provided'}
            mono
          />
          <SummaryField
            label="Condition"
            value={
              condition === 'other'
                ? conditionOther
                  ? `Other — ${conditionOther}`
                  : 'Other'
                : condition === 'partially_opened'
                  ? 'Partially Opened'
                  : condition.charAt(0).toUpperCase() + condition.slice(1)
            }
          />
          <SummaryField
            label="Special"
            value={
              [hazardous && 'Hazardous', perishable && 'Perishable', requiresSignature && 'Signature Required']
                .filter(Boolean)
                .join(', ') || 'None'
            }
          />
          {storageLocation && (
            <SummaryField
              label="Storage Location"
              value={storageLocation}
            />
          )}
        </div>
        {(packageDimensions.lengthIn || packageDimensions.widthIn || packageDimensions.heightIn) && (
          <div className="pt-3 border-t border-surface-800">
            <SummaryField
              label="Dimensions"
              value={`${packageDimensions.lengthIn || '–'} × ${packageDimensions.widthIn || '–'} × ${packageDimensions.heightIn || '–'} in${packageDimensions.weightLbs ? ` • ${packageDimensions.weightLbs} lbs` : ''}${packageDimensions.source === 'camera_ai' ? ' (📐 AI measured)' : ''}`}
            />
          </div>
        )}
        {notes && (
          <div className="pt-3 border-t border-surface-800">
            <SummaryField label="Notes" value={notes} />
          </div>
        )}

        {/* BAR-328: Duplicate override notice in summary */}
        {duplicatePackage && duplicateAcknowledged && (
          <div className="pt-3 border-t border-status-warning-500/20">
            <div className="p-3 rounded-lg border border-status-warning-500/20 bg-status-warning-500/5 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-status-warning-300 font-medium mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Duplicate Override Active
              </div>
              <div className="flex justify-between text-surface-400">
                <span>Original Package:</span>
                <span className="text-surface-300">{duplicatePackage.customerName} — {duplicatePackage.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-surface-400">
                <span>Override Reason:</span>
                <span className="text-surface-300">{duplicateOverrideReason}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preview */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
          Notification Settings
        </h3>

        {selectedCustomer?.email && (
          <div className="flex items-center gap-3 text-sm text-surface-400">
            <Mail className="h-4 w-4 text-status-info-600" />
            <span>
              Email will be sent to{' '}
              <span className="text-surface-200">
                {selectedCustomer.email}
              </span>
            </span>
          </div>
        )}
        {selectedCustomer?.phone && (
          <div className="flex items-center gap-3 text-sm text-surface-400">
            <MessageSquare className="h-4 w-4 text-status-success-600" />
            <span>
              SMS will be sent to{' '}
              <span className="text-surface-200">
                {selectedCustomer.phone}
              </span>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <CheckboxOption
            label="Print shelf label"
            checked={printLabelEnabled}
            onChange={setPrintLabelEnabled}
            icon={<Printer className="h-4 w-4" />}
          />
          <CheckboxOption
            label="Send email notification"
            checked={sendEmail}
            onChange={setSendEmail}
            icon={<Mail className="h-4 w-4" />}
            disabled={!selectedCustomer?.notifyEmail}
          />
          <CheckboxOption
            label="Send SMS notification"
            checked={sendSms}
            onChange={setSendSms}
            icon={<MessageSquare className="h-4 w-4" />}
            disabled={!selectedCustomer?.notifySms}
          />
        </div>
      </div>

      {/* Submit Error (BAR-260) */}
      {submitError && (
        <div className="p-4 rounded-xl border border-status-error-500/30 bg-status-error-500/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-status-error-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-status-error-300">Check-in failed</p>
            <p className="text-xs text-surface-400 mt-1">{submitError}</p>
            <button
              onClick={() => setSubmitError(null)}
              className="text-xs text-primary-400 hover:text-primary-300 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
