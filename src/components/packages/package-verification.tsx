'use client';

/**
 * BAR-246: Package Label Verification Scan
 *
 * After customer identification, employees scan the QR code on the package
 * check-in label to verify the package actually belongs to the identified customer.
 * Prevents misdelivery (e.g., handing PMB 123's package to PMB 132).
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerificationStatus } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface PackageVerificationProps {
  /** The PMB number of the customer being checked out */
  expectedPmb: string;
  /** Callback when verification result changes */
  onVerify: (result: {
    scannedPmb: string;
    status: VerificationStatus;
    packageId?: string;
  }) => void;
  /** Whether tenant requires verification before release */
  required?: boolean;
  /** Current verification status */
  status: VerificationStatus;
  /** Override handler for mismatches */
  onOverride?: (reason: string) => void;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PackageVerification({
  expectedPmb,
  onVerify,
  required = false,
  status,
  onOverride,
  className,
}: PackageVerificationProps) {
  const [manualEntry, setManualEntry] = useState(false);
  const [manualPmb, setManualPmb] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  const verifyPmb = useCallback(
    (scannedValue: string) => {
      // Extract PMB from scanned QR/barcode. Format: "PMB-XXXX" or just the number
      const cleaned = scannedValue.replace(/^PMB[-\s]*/i, '').trim();
      const expectedCleaned = expectedPmb.replace(/^PMB[-\s]*/i, '').trim();

      const matches = cleaned === expectedCleaned;
      onVerify({
        scannedPmb: scannedValue,
        status: matches ? 'verified' : 'mismatch',
      });
    },
    [expectedPmb, onVerify]
  );

  const handleScan = useCallback(
    (value: string) => {
      verifyPmb(value);
    },
    [verifyPmb]
  );

  const handleManualSubmit = useCallback(() => {
    if (manualPmb.trim()) {
      verifyPmb(manualPmb.trim());
      setManualPmb('');
    }
  }, [manualPmb, verifyPmb]);

  const handleOverride = useCallback(() => {
    if (overrideReason.trim() && onOverride) {
      onOverride(overrideReason.trim());
      setShowOverride(false);
      setOverrideReason('');
    }
  }, [overrideReason, onOverride]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-surface-400" />
          <span className="text-sm font-semibold text-surface-200">
            Label Verification
          </span>
          {required && (
            <Badge variant="warning" className="text-[10px]">Required</Badge>
          )}
        </div>
        <VerificationBadge status={status} />
      </div>

      {/* Status Messages */}
      {status === 'verified' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Package Verified</p>
            <p className="text-xs text-emerald-400/70">
              Label PMB matches customer {expectedPmb}
            </p>
          </div>
        </div>
      )}

      {status === 'mismatch' && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-400">⚠ PMB Mismatch!</p>
              <p className="text-xs text-red-400/70">
                This package does NOT belong to {expectedPmb}. Release is blocked.
              </p>
            </div>
          </div>
          {onOverride && !showOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOverride(true)}
            >
              Override (with reason)
            </Button>
          )}
          {showOverride && (
            <div className="flex items-center gap-2">
              <Input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Enter override reason..."
                className="flex-1"
              />
              <Button size="sm" onClick={handleOverride} disabled={!overrideReason.trim()}>
                Confirm Override
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Scanner / Manual Entry */}
      {status === 'unverified' && (
        <div className="space-y-3">
          <p className="text-xs text-surface-400">
            Scan the QR code or barcode on the package check-in label to verify
            it belongs to <strong className="text-surface-300">{expectedPmb}</strong>.
          </p>

          <div className="flex items-center gap-2">
            <BarcodeScanner onScan={handleScan} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setManualEntry(!manualEntry)}
              leftIcon={<Keyboard className="h-4 w-4" />}
            >
              {manualEntry ? 'Hide Manual' : 'Manual Entry'}
            </Button>
          </div>

          {manualEntry && (
            <div className="flex items-center gap-2">
              <Input
                value={manualPmb}
                onChange={(e) => setManualPmb(e.target.value)}
                placeholder="Enter PMB from label..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button
                size="sm"
                onClick={handleManualSubmit}
                disabled={!manualPmb.trim()}
              >
                Verify
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Verification Badge                                                        */
/* -------------------------------------------------------------------------- */

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case 'verified':
      return (
        <Badge variant="success" className="text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    case 'mismatch':
      return (
        <Badge variant="danger" className="text-[10px]">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Mismatch
        </Badge>
      );
    default:
      return (
        <Badge variant="muted" className="text-[10px]">
          Unverified
        </Badge>
      );
  }
}
