'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Search,
  ArrowLeft,
  PackageCheck,
  Package,
  CheckCircle2,
  Hash,
  FileSignature } from 'lucide-react';
import { customers, packages } from '@/lib/mock-data';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Customer, Package as PackageType } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Carrier badge                                                             */
/* -------------------------------------------------------------------------- */
const carrierColors: Record<string, { bg: string; text: string; dot: string }> = {
  ups: { bg: 'bg-amber-900/30', text: 'text-amber-500', dot: 'bg-amber-500' },
  fedex: { bg: 'bg-purple-900/30', text: 'text-purple-400', dot: 'bg-purple-400' },
  usps: { bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  amazon: { bg: 'bg-orange-900/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  dhl: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', dot: 'bg-yellow-400' } };

const carrierLabels: Record<string, string> = {
  ups: 'UPS',
  fedex: 'FedEx',
  usps: 'USPS',
  amazon: 'Amazon',
  dhl: 'DHL' };

/* -------------------------------------------------------------------------- */
/*  Package type labels                                                       */
/* -------------------------------------------------------------------------- */
const pkgTypeLabels: Record<string, string> = {
  letter: 'Letter',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  oversized: 'Oversized' };

/* -------------------------------------------------------------------------- */
/*  Days held calculator                                                      */
/* -------------------------------------------------------------------------- */
function daysHeld(checkedInAt: string): number {
  const now = new Date('2026-02-21T15:00:00');
  return Math.max(0, Math.floor((now.getTime() - new Date(checkedInAt).getTime()) / 86400000));
}

/* -------------------------------------------------------------------------- */
/*  Platform display                                                          */
/* -------------------------------------------------------------------------- */
const platformVariant: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  physical: 'default',
  iPostal: 'info',
  anytime: 'success',
  postscan: 'warning' };

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function CheckOutPage() {
  const [pmbInput, setPmbInput] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [customerPackages, setCustomerPackages] = useState<PackageType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [releaseMode, setReleaseMode] = useState<'selected' | 'all'>('selected');
  const [lookupError, setLookupError] = useState('');

  // ---- Lookup handler ----
  const handleLookup = () => {
    setLookupError('');
    setFoundCustomer(null);
    setCustomerPackages([]);
    setSelectedIds(new Set());

    if (!pmbInput.trim()) {
      setLookupError('Please enter a PMB number');
      return;
    }

    // Normalize input — accept "0003", "PMB-0003", "pmb 0003" etc.
    const q = pmbInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const customer = customers.find((c) => {
      const norm = c.pmbNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return norm === q || norm.endsWith(q) || q.endsWith(norm.replace('PMB', ''));
    });

    if (!customer) {
      setLookupError(`No customer found for "${pmbInput}"`);
      return;
    }

    // Get unreleased packages for this customer
    const pkgs = packages.filter(
      (p) => p.customerId === customer.id && p.status !== 'released' && p.status !== 'returned'
    );

    setFoundCustomer(customer);
    setCustomerPackages(pkgs);
  };

  // ---- Selection helpers ----
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customerPackages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customerPackages.map((p) => p.id)));
    }
  };

  // ---- Fee calculations ----
  const packagesToRelease = useMemo(() => {
    if (releaseMode === 'all') return customerPackages;
    return customerPackages.filter((p) => selectedIds.has(p.id));
  }, [releaseMode, selectedIds, customerPackages]);

  const fees = useMemo(() => {
    const storageFees = packagesToRelease.reduce((sum, p) => {
      const held = daysHeld(p.checkedInAt);
      return sum + (held > 5 ? 5.0 : 0);
    }, 0);
    const receivingFees = packagesToRelease.reduce(
      (sum, p) => sum + p.receivingFee,
      0
    );
    const quotaOverage = packagesToRelease.reduce(
      (sum, p) => sum + p.quotaFee,
      0
    );
    const subtotal = storageFees + receivingFees + quotaOverage;
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;

    return { storageFees, receivingFees, quotaOverage, tax, total };
  }, [packagesToRelease]);

  // ---- Release handlers ----
  const handleReleaseSelected = () => {
    if (selectedIds.size === 0) return;
    setReleaseMode('selected');
    setShowConfirmModal(true);
  };

  const handleReleaseAll = () => {
    setReleaseMode('all');
    setShowConfirmModal(true);
  };

  const confirmRelease = () => {
    setShowConfirmModal(false);
    setShowSuccessModal(true);
  };

  const handleReset = () => {
    setPmbInput('');
    setFoundCustomer(null);
    setCustomerPackages([]);
    setSelectedIds(new Set());
    setShowSuccessModal(false);
    setLookupError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Check-Out"
        description="Release packages to customers"
        actions={
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => (window.location.href = '/dashboard/packages')}
          >
            Back to Packages
          </Button>
        }
      />

      {/* PMB Lookup */}
      <Card padding="lg">
        <div className="max-w-xl mx-auto text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary-600/15 mb-4">
            <Search className="h-7 w-7 text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">
            Enter or Scan PMB Number
          </h2>
          <p className="text-sm text-surface-400 mb-6">
            Look up a customer to release their packages
          </p>
          <div className="flex items-end gap-3 max-w-md mx-auto">
            <div className="flex-1">
              <Input
                placeholder="e.g. PMB-0003 or 0003"
                value={pmbInput}
                onChange={(e) => {
                  setPmbInput(e.target.value);
                  setLookupError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                error={lookupError || undefined}
                leftIcon={<Hash className="h-4 w-4" />}
              />
            </div>
            <Button onClick={handleLookup} className="shrink-0">
              Look Up
            </Button>
          </div>
        </div>
      </Card>

      {/* Customer Info + Packages */}
      {foundCustomer && (
        <>
          {/* Customer Card */}
          <Card padding="md">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-primary-300 text-sm font-bold">
                {foundCustomer.firstName[0]}
                {foundCustomer.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-white">
                    {foundCustomer.firstName} {foundCustomer.lastName}
                  </h3>
                  <Badge status={foundCustomer.status}>
                    {foundCustomer.status}
                  </Badge>
                  <Badge
                    variant={platformVariant[foundCustomer.platform] || 'default'}
                    dot={false}
                  >
                    {foundCustomer.platform}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-surface-400">
                  <span className="font-mono text-primary-400">
                    {foundCustomer.pmbNumber}
                  </span>
                  {foundCustomer.email && <span>{foundCustomer.email}</span>}
                  {foundCustomer.phone && <span>{foundCustomer.phone}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-white">
                  {customerPackages.length}
                </p>
                <p className="text-xs text-surface-400">
                  inventory item{customerPackages.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </Card>

          {/* Packages Table */}
          {customerPackages.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <Package className="mx-auto h-10 w-10 text-surface-600 mb-3" />
                <p className="text-surface-400 text-sm">
                  No packages currently in inventory for {foundCustomer.pmbNumber}
                </p>
              </div>
            </Card>
          ) : (
            <>
              <Card padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800 bg-surface-900/80">
                        <th className="px-4 py-3 text-left w-12">
                          <button
                            onClick={toggleSelectAll}
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded border transition-all',
                              selectedIds.size === customerPackages.length
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : selectedIds.size > 0
                                  ? 'bg-primary-600/50 border-primary-500 text-white'
                                  : 'bg-surface-900 border-surface-600'
                            )}
                          >
                            {selectedIds.size > 0 && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Tracking #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Carrier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Checked In
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Days Held
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Storage Fee
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                          Receiving Fee
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPackages.map((pkg) => {
                        const isSelected = selectedIds.has(pkg.id);
                        const held = daysHeld(pkg.checkedInAt);
                        const storageFee = held > 5 ? 5.0 : 0;
                        const cc = carrierColors[pkg.carrier.toLowerCase()];
                        return (
                          <tr
                            key={pkg.id}
                            onClick={() => toggleSelect(pkg.id)}
                            className={cn(
                              'border-b border-surface-800/50 cursor-pointer transition-colors',
                              isSelected
                                ? 'bg-primary-600/5'
                                : 'hover:bg-surface-800/50'
                            )}
                          >
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(pkg.id);
                                }}
                                className={cn(
                                  'flex h-5 w-5 items-center justify-center rounded border transition-all',
                                  isSelected
                                    ? 'bg-primary-600 border-primary-500 text-white'
                                    : 'bg-surface-900 border-surface-600'
                                )}
                              >
                                {isSelected && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-surface-300">
                                {pkg.trackingNumber || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {cc ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cc.bg} ${cc.text}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${cc.dot}`}
                                  />
                                  {carrierLabels[pkg.carrier.toLowerCase()] ||
                                    pkg.carrier}
                                </span>
                              ) : (
                                <span className="text-surface-400 text-xs">
                                  {pkg.carrier}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-surface-300">
                              {pkgTypeLabels[pkg.packageType] || pkg.packageType}
                            </td>
                            <td className="px-4 py-3 text-surface-400 text-xs">
                              {formatDate(pkg.checkedInAt)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                                  held > 7
                                    ? 'bg-red-500/20 text-red-400'
                                    : held > 3
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-surface-700/50 text-surface-400'
                                )}
                              >
                                {held}d
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-surface-300 text-xs">
                              {storageFee > 0
                                ? formatCurrency(storageFee)
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-surface-300 text-xs">
                              {formatCurrency(pkg.receivingFee)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Fee Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2" />
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-surface-300 mb-4">
                    Fee Summary
                  </h3>
                  <div className="space-y-2.5">
                    <FeeRow
                      label={`Storage Fees (${packagesToRelease.length} pkg${packagesToRelease.length !== 1 ? 's' : ''})`}
                      amount={fees.storageFees}
                    />
                    <FeeRow
                      label="Receiving Fees"
                      amount={fees.receivingFees}
                    />
                    <FeeRow
                      label="Quota Overage"
                      amount={fees.quotaOverage}
                    />
                    <div className="border-t border-surface-800 pt-2.5">
                      <FeeRow label="Tax (8.75%)" amount={fees.tax} />
                    </div>
                    <div className="border-t border-surface-700 pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          Total
                        </span>
                        <span className="text-lg font-bold text-white">
                          {formatCurrency(fees.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 mt-6">
                    <Button
                      fullWidth
                      leftIcon={<PackageCheck className="h-4 w-4" />}
                      onClick={handleReleaseSelected}
                      disabled={selectedIds.size === 0}
                    >
                      Release Selected ({selectedIds.size})
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={handleReleaseAll}
                    >
                      Release All ({customerPackages.length})
                    </Button>
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={handleReset}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Package Release"
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              leftIcon={<PackageCheck className="h-4 w-4" />}
              onClick={confirmRelease}
            >
              Confirm Release
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            You are about to release{' '}
            <span className="font-semibold text-white">
              {packagesToRelease.length} package
              {packagesToRelease.length !== 1 ? 's' : ''}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-white">
              {foundCustomer?.firstName} {foundCustomer?.lastName}
            </span>{' '}
            ({foundCustomer?.pmbNumber}).
          </p>

          <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-400">Total Fees</span>
              <span className="font-bold text-white">
                {formatCurrency(fees.total)}
              </span>
            </div>
          </div>

          {/* Signature Line */}
          <div className="pt-2">
            <label className="text-sm font-medium text-surface-300 block mb-2">
              Customer Signature
            </label>
            <div className="h-24 rounded-xl border-2 border-dashed border-surface-700 bg-surface-900/40 flex items-center justify-center">
              <div className="text-center">
                <FileSignature className="mx-auto h-6 w-6 text-surface-600 mb-1" />
                <p className="text-xs text-surface-500">
                  Tap or click to sign
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        open={showSuccessModal}
        onClose={handleReset}
        title="Packages Released"
        size="sm"
        persistent
        footer={
          <>
            <Button variant="secondary" onClick={handleReset}>
              New Checkout
            </Button>
            <Button
              onClick={() => (window.location.href = '/dashboard/packages')}
            >
              View Packages
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Successfully Released!
          </h3>
          <p className="text-sm text-surface-400 max-w-xs">
            {packagesToRelease.length} package
            {packagesToRelease.length !== 1 ? 's' : ''} released to{' '}
            <span className="text-surface-200 font-medium">
              {foundCustomer?.firstName} {foundCustomer?.lastName}
            </span>
            . Total charged:{' '}
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(fees.total)}
            </span>
          </p>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Fee Row Component                                                         */
/* -------------------------------------------------------------------------- */
function FeeRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-surface-400">{label}</span>
      <span className="text-surface-300">{formatCurrency(amount)}</span>
    </div>
  );
}
