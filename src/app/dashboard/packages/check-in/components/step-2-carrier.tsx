'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  ScanBarcode, Camera, CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import type { DuplicatePackage } from './types';
import { carrierOptions, carrierSenderMap } from './types';

export interface Step2Props {
  trackingNumber: string;
  handleTrackingNumberChange: (e: React.ChangeEvent<HTMLInputElement> | string) => void;
  selectedCarrier: string;
  handleCarrierSelect: (carrier: string) => void;
  carrierAutoSuggested: boolean;
  setCarrierAutoSuggested: (v: boolean) => void;
  setSelectedCarrier: (v: string) => void;
  setCustomCarrierName: (v: string) => void;
  customCarrierName: string;
  senderName: string;
  setSenderName: (v: string) => void;
  senderSuggestions: string[];
  showSenderSuggestions: boolean;
  setShowSenderSuggestions: (v: boolean) => void;
  senderRef: React.RefObject<any>;
  checkingTracking: boolean;
  duplicatePackage: DuplicatePackage | null;
  duplicateAcknowledged: boolean;
  duplicateOverrideReason: string;
  setShowDuplicateModal: (v: boolean) => void;
  scanFeedback: string | null;
  handleScanResult: (result: string) => void;
  setStep: (v: number) => void;
  step: number;
}

export function Step2CarrierSender(props: Step2Props) {
  const {
    trackingNumber, handleTrackingNumberChange,
    selectedCarrier, handleCarrierSelect,
    carrierAutoSuggested, setCarrierAutoSuggested,
    setSelectedCarrier, setCustomCarrierName, customCarrierName,
    senderName, setSenderName, senderSuggestions,
    showSenderSuggestions, setShowSenderSuggestions,
    senderRef, checkingTracking,
    duplicatePackage, duplicateAcknowledged, duplicateOverrideReason,
    setShowDuplicateModal, scanFeedback, handleScanResult,
    setStep, step,
  } = props;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-1">
          Carrier & Sender
        </h2>
        <p className="text-sm text-surface-400">
          Scan or enter the tracking number — carrier auto-detects. Then confirm sender.
        </p>
      </div>

      {/* Tracking Number — moved here from Step 3 (BAR-239) */}
      <div className="max-w-lg">
        <label className="text-sm font-medium text-surface-300 mb-1.5 block">
          Tracking Number
        </label>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              placeholder="Enter or scan tracking number"
              value={trackingNumber}
              onChange={(e) => handleTrackingNumberChange(e.target.value)}
              leftIcon={<ScanBarcode className="h-5 w-5" />}
              className="!py-3"
            />
          </div>
          {/* BAR-11: Camera barcode scanner */}
          <BarcodeScanner onScan={handleScanResult} className="shrink-0 mt-0.5" />
        </div>

        {/* BAR-11: Scan success feedback */}
        {scanFeedback && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in-0 duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300 font-medium">{scanFeedback}</p>
          </div>
        )}

        {/* BAR-11: Keyboard wedge hint */}
        <p className="mt-1.5 text-xs text-surface-500">
          <Camera className="h-3 w-3 inline mr-1" />
          Tap &quot;Scan Barcode&quot; for camera, or use a USB scanner — it auto-detects
        </p>
        {trackingNumber.trim() && !selectedCarrier && (
          <p className="mt-1 text-xs text-amber-400">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Could not auto-detect carrier — please select below
          </p>
        )}
        {trackingNumber.trim() && selectedCarrier && carrierAutoSuggested && (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Carrier auto-detected: {selectedCarrier.toUpperCase()}
            </p>
            <button
              onClick={() => { setSelectedCarrier(''); setCarrierAutoSuggested(false); }}
              className="text-xs text-primary-400 hover:text-primary-300 underline"
            >
              Select Different Carrier
            </button>
          </div>
        )}
        {checkingTracking && (
          <p className="mt-1 text-xs text-surface-500 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking tracking number...
          </p>
        )}
        {/* BAR-328: Inline duplicate warning in Step 2 */}
        {duplicatePackage && !checkingTracking && (
          <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-300">
                  Duplicate tracking number detected
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Already checked in for {duplicatePackage.customerName} ({duplicatePackage.customerPmb}) — {duplicatePackage.status.replace('_', ' ')} since {new Date(duplicatePackage.checkedInAt).toLocaleDateString()}
                </p>
                {duplicateAcknowledged ? (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Override acknowledged{duplicateOverrideReason ? `: ${duplicateOverrideReason}` : ''}
                  </div>
                ) : (
                  <button
                    className="mt-2 text-xs text-primary-400 hover:text-primary-300 underline"
                    onClick={() => setShowDuplicateModal(true)}
                  >
                    Review &amp; override
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carrier Grid */}
      <div>
        <label className="text-sm font-medium text-surface-300 mb-3 block">
          Carrier {selectedCarrier && <span className="text-xs text-surface-500 ml-2">(tap to change)</span>}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {carrierOptions.map((carrier) => {
            const isActive = selectedCarrier === carrier.id;
            return (
              <button
                key={carrier.id}
                onClick={() => handleCarrierSelect(carrier.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 transition-all',
                  isActive
                    ? carrier.active
                    : carrier.color
                )}
              >
                <CarrierLogo carrier={carrier.id} size={28} />
                <span className="text-xs font-medium opacity-80">{carrier.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom carrier name when "Other" is selected */}
      {selectedCarrier === 'other' && (
        <div className="max-w-md">
          <Input
            label="Custom Carrier Name"
            placeholder="e.g. Veho, AxleHire, CDL..."
            value={customCarrierName}
            onChange={(e) => setCustomCarrierName(e.target.value)}
          />
        </div>
      )}

      {/* Sender Name with autocomplete (BAR-239) */}
      <div className="max-w-md relative" ref={senderRef}>
        <Input
          label="Sender Name"
          placeholder="e.g. Amazon.com, John Smith"
          value={senderName}
          onChange={(e) => {
            setSenderName(e.target.value);
            setShowSenderSuggestions(true);
          }}
          onFocus={() => {
            if (senderSuggestions.length > 0) setShowSenderSuggestions(true);
          }}
        />
        {/* Sender autocomplete dropdown (BAR-239) */}
        {showSenderSuggestions && senderSuggestions.length > 0 && senderName.length >= 2 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-surface-700 bg-surface-900 shadow-xl overflow-hidden">
            {senderSuggestions
              .filter((s) => s.toLowerCase() !== senderName.toLowerCase())
              .map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setSenderName(suggestion);
                    setShowSenderSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:bg-surface-800 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
