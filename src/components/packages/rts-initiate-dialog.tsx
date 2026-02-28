'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  Undo2,
  Search,
  AlertTriangle,
  Package,
  Loader2,
} from 'lucide-react';

interface RtsInitiateDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-fill with a specific package (e.g. from check-in wizard no-results flow) */
  prefillPackageId?: string;
  prefillReason?: string;
}

const REASON_OPTIONS = [
  { value: 'no_matching_customer', label: 'No Matching Customer' },
  { value: 'closed_pmb', label: 'Closed PMB' },
  { value: 'expired_pmb', label: 'Expired PMB' },
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'storage_policy_expiry', label: 'Storage Policy Expiry' },
  { value: 'refused', label: 'Refused' },
  { value: 'unclaimed', label: 'Unclaimed' },
  { value: 'other', label: 'Other' },
];

const CARRIER_OPTIONS = [
  { value: 'usps', label: 'USPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'dhl', label: 'DHL' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'other', label: 'Other' },
];

interface PackageSearchResult {
  id: string;
  trackingNumber: string | null;
  carrier: string;
  packageType: string;
  senderName: string | null;
  status: string;
  storageLocation: string | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    pmbNumber: string;
  };
}

export function RtsInitiateDialog({
  onClose,
  onSuccess,
  prefillPackageId,
  prefillReason,
}: RtsInitiateDialogProps) {
  const [step, setStep] = useState<'search' | 'confirm'>(prefillPackageId ? 'confirm' : 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PackageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageSearchResult | null>(null);
  const [reason, setReason] = useState(prefillReason || '');
  const [reasonDetail, setReasonDetail] = useState('');
  const [carrier, setCarrier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Search packages
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/packages?search=${encodeURIComponent(searchQuery.trim())}&limit=10`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      // Filter out already released/rts packages
      const eligible = (data.packages || []).filter(
        (p: PackageSearchResult) => !['released', 'rts_initiated', 'rts_labeled', 'rts_completed'].includes(p.status),
      );
      setSearchResults(eligible);
    } catch {
      setError('Failed to search packages');
    } finally {
      setSearching(false);
    }
  };

  // Pre-fill package if provided
  const handlePrefill = async () => {
    if (!prefillPackageId) return;
    try {
      const res = await fetch(`/api/packages?search=${prefillPackageId}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.packages?.length > 0) {
          setSelectedPackage(data.packages[0]);
        }
      }
    } catch {
      // ignore
    }
  };

  // Load pre-fill on mount
  useState(() => {
    if (prefillPackageId) handlePrefill();
  });

  // Submit RTS
  const handleSubmit = async () => {
    if (!selectedPackage || !reason) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/packages/rts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          reason,
          reasonDetail: reasonDetail.trim() || undefined,
          carrier: carrier || selectedPackage.carrier,
          confirmed: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to initiate RTS');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate RTS');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Return to Sender"
      size="lg"
    >
      <div className="space-y-6">
        {step === 'search' && (
          <>
            {/* Search Step */}
            <div>
              <p className="text-sm text-surface-400 mb-4">
                Search for the package you want to return to sender by tracking number, sender name, or PMB.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Tracking #, sender name, or PMB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching} size="sm">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setCarrier(pkg.carrier);
                      setStep('confirm');
                    }}
                    className="w-full text-left p-3 rounded-lg border border-surface-700 hover:border-primary-500 hover:bg-surface-800/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-surface-400" />
                        <div>
                          <span className="text-sm font-medium text-surface-100">
                            {pkg.trackingNumber || 'No tracking #'}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-surface-400">
                            <CarrierLogo carrier={pkg.carrier} size={12} />
                            <span className="capitalize">{pkg.carrier}</span>
                            {pkg.senderName && <span>· {pkg.senderName}</span>}
                          </div>
                        </div>
                      </div>
                      {pkg.customer && (
                        <span className="text-xs text-surface-400">
                          PMB {pkg.customer.pmbNumber} · {pkg.customer.firstName} {pkg.customer.lastName}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-sm text-surface-500 text-center py-4">
                No eligible packages found. Already released or RTS items are excluded.
              </p>
            )}
          </>
        )}

        {step === 'confirm' && selectedPackage && (
          <>
            {/* Confirmation Step */}
            <div className="rounded-lg border border-amber-800/40 bg-amber-900/10 p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Confirm Return to Sender</p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    This will mark the package for return. This action is logged for USPS compliance and can only be cancelled before carrier handoff.
                  </p>
                </div>
              </div>
            </div>

            {/* Package Info */}
            <div className="rounded-lg bg-surface-800/50 border border-surface-700 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-5 w-5 text-surface-400" />
                <span className="text-sm font-medium text-surface-100">
                  {selectedPackage.trackingNumber || 'No tracking #'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-surface-400">
                <div>Carrier: <span className="text-surface-300 capitalize">{selectedPackage.carrier}</span></div>
                <div>Type: <span className="text-surface-300 capitalize">{selectedPackage.packageType}</span></div>
                {selectedPackage.senderName && (
                  <div>Sender: <span className="text-surface-300">{selectedPackage.senderName}</span></div>
                )}
                {selectedPackage.customer && (
                  <div>PMB: <span className="text-surface-300">{selectedPackage.customer.pmbNumber}</span></div>
                )}
                {selectedPackage.storageLocation && (
                  <div>Location: <span className="text-surface-300">{selectedPackage.storageLocation}</span></div>
                )}
              </div>
            </div>

            {/* Reason */}
            <Select
              label="Reason for Return *"
              options={REASON_OPTIONS}
              placeholder="Select reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {/* Reason detail */}
            <Textarea
              label="Additional Details"
              placeholder="Optional notes (e.g. PMB expired 2026-01-15, storage exceeded 60 days...)"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={2}
            />

            {/* Carrier override */}
            <Select
              label="Return Carrier"
              options={CARRIER_OPTIONS}
              value={carrier || selectedPackage.carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (prefillPackageId) {
                    onClose();
                  } else {
                    setStep('search');
                    setSelectedPackage(null);
                  }
                }}
              >
                {prefillPackageId ? 'Cancel' : 'Back to Search'}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4" />
                )}
                Confirm Return to Sender
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
