'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/input';
import {
  UserCheck,
  Package,
  Search,
  CheckCircle2,
  Printer,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  BAR-241: Edge Case — Customer Arrives During Package Staging              */
/*                                                                            */
/*  Queue Jump Modal: lets staff search for a specific package in the active  */
/*  batch, pull it out, complete its check-in immediately, and hand it off    */
/*  to the waiting customer — without losing batch session state.             */
/* -------------------------------------------------------------------------- */

export interface StagingPackage {
  /** Temporary ID for the staging session */
  id: string;
  trackingNumber: string;
  carrier: string;
  customerName: string;
  pmbNumber: string;
  /** Status within the staging batch */
  stagingStatus: 'scanned' | 'labeled' | 'released';
  /** When this package was scanned into the batch */
  scannedAt: string;
}

interface QueueJumpModalProps {
  open: boolean;
  onClose: () => void;
  /** All packages currently in the staging batch */
  stagingQueue: StagingPackage[];
  /** Callback when a package is "queue jumped" — process it immediately */
  onQueueJump: (pkg: StagingPackage) => void;
  /** Callback when a package is released directly to the customer */
  onQuickRelease: (pkg: StagingPackage) => void;
}

export function QueueJumpModal({
  open,
  onClose,
  stagingQueue,
  onQueueJump,
  onQuickRelease,
}: QueueJumpModalProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredPackages = useMemo(() => {
    if (!search.trim()) return stagingQueue;
    const q = search.toLowerCase();
    return stagingQueue.filter(
      (pkg) =>
        pkg.trackingNumber.toLowerCase().includes(q) ||
        pkg.customerName.toLowerCase().includes(q) ||
        pkg.pmbNumber.toLowerCase().includes(q) ||
        pkg.carrier.toLowerCase().includes(q)
    );
  }, [stagingQueue, search]);

  const selectedPkg = stagingQueue.find((p) => p.id === selectedId);

  const handleQueueJump = () => {
    if (selectedPkg) {
      onQueueJump(selectedPkg);
      setSelectedId(null);
      setSearch('');
    }
  };

  const handleQuickRelease = () => {
    if (selectedPkg) {
      onQuickRelease(selectedPkg);
      setSelectedId(null);
      setSearch('');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setSelectedId(null);
        setSearch('');
        onClose();
      }}
      title="Customer Waiting — Queue Jump"
      size="lg"
      footer={
        selectedPkg ? (
          <div className="flex items-center gap-2 w-full">
            <Button variant="ghost" onClick={() => setSelectedId(null)}>
              Back
            </Button>
            <div className="flex-1" />
            <Button
              variant="secondary"
              onClick={handleQueueJump}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Print Label & Check In
            </Button>
            <Button
              onClick={handleQuickRelease}
              leftIcon={<UserCheck className="h-4 w-4" />}
            >
              Release to Customer
            </Button>
          </div>
        ) : undefined
      }
    >
      {!selectedPkg ? (
        <div className="space-y-4">
          {/* Explanation banner */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <UserCheck className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-surface-200">
                Customer is here to pick up a package
              </p>
              <p className="text-xs text-surface-400 mt-0.5">
                Search for their package below. The batch session will be
                preserved — you can resume after serving the customer.
              </p>
            </div>
          </div>

          {/* Search */}
          <SearchInput
            placeholder="Search by name, PMB, tracking, or carrier…"
            value={search}
            onSearch={setSearch}
          />

          {/* Package list */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredPackages.length === 0 ? (
              <div className="py-8 text-center text-surface-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-surface-600" />
                <p className="text-sm">
                  {search
                    ? 'No packages match your search'
                    : 'No packages in the staging queue'}
                </p>
              </div>
            ) : (
              filteredPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedId(pkg.id)}
                  className={cn(
                    'w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                    'border-surface-700/50 bg-surface-900/60 hover:border-primary-500/50 hover:bg-surface-800/60'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800 text-surface-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-200">
                        {pkg.customerName}
                      </span>
                      <span className="text-xs font-mono text-primary-400">
                        {pkg.pmbNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-surface-500 truncate font-mono">
                        {pkg.trackingNumber}
                      </span>
                      <Badge
                        variant={
                          pkg.stagingStatus === 'released'
                            ? 'success'
                            : pkg.stagingStatus === 'labeled'
                              ? 'info'
                              : 'muted'
                        }
                      >
                        {pkg.stagingStatus}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-surface-500 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── Selected Package Detail ────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl border border-primary-500/30 bg-primary-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-surface-200">
                {selectedPkg.customerName}
              </p>
              <p className="text-sm font-mono text-primary-400">
                {selectedPkg.pmbNumber}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-800/40">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-surface-500 mb-0.5">
                Tracking #
              </p>
              <p className="text-sm font-mono text-surface-200">
                {selectedPkg.trackingNumber}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-surface-500 mb-0.5">
                Carrier
              </p>
              <p className="text-sm text-surface-200">
                {selectedPkg.carrier.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-surface-500 mb-0.5">
                Status
              </p>
              <Badge
                variant={
                  selectedPkg.stagingStatus === 'released'
                    ? 'success'
                    : selectedPkg.stagingStatus === 'labeled'
                      ? 'info'
                      : 'muted'
                }
              >
                {selectedPkg.stagingStatus}
              </Badge>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-surface-500 mb-0.5">
                Scanned At
              </p>
              <p className="text-sm text-surface-200">
                {new Date(selectedPkg.scannedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-surface-200">
                Ready for queue jump
              </p>
              <p className="text-xs text-surface-400 mt-0.5">
                Choose <strong>Print Label & Check In</strong> to finalize
                this package and print its label, or{' '}
                <strong>Release to Customer</strong> to hand it off
                immediately (skips notification since customer is present).
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
