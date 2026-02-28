'use client';
/* eslint-disable */

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { InventorySummary } from '@/components/packages/inventory-summary';
import { ConditionTagBadges } from '@/components/packages/condition-notes';
import { ConditionNotes } from '@/components/packages/condition-notes';
import { PackageLabelReprintModal } from '@/components/packages/label-reprint-modal';
import { VerificationBadge } from '@/components/packages/package-verification';
// Packages now fetched from API (mock-data removed)
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { InventoryPackage, PackageProgramType, ConditionTag } from '@/lib/types';
import {
  Package,
  Eye,
  Bell,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useActivityLog } from '@/components/activity-log-provider';
import type { Package as PackageType } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Carrier styling                                                           */
/* -------------------------------------------------------------------------- */
const carrierConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  ups: { label: 'UPS', bg: 'bg-amber-900/30', text: 'text-amber-500', dot: 'bg-amber-500' },
  fedex: { label: 'FedEx', bg: 'bg-indigo-900/30', text: 'text-indigo-600', dot: 'bg-indigo-400' },
  usps: { label: 'USPS', bg: 'bg-blue-900/30', text: 'text-blue-600', dot: 'bg-blue-400' },
  amazon: { label: 'Amazon', bg: 'bg-orange-900/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  dhl: { label: 'DHL', bg: 'bg-yellow-900/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  lasership: { label: 'LaserShip', bg: 'bg-green-900/30', text: 'text-green-400', dot: 'bg-green-400' },
  temu: { label: 'Temu', bg: 'bg-orange-900/30', text: 'text-orange-500', dot: 'bg-orange-500' },
  ontrac: { label: 'OnTrac', bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  walmart: { label: 'Walmart', bg: 'bg-blue-900/30', text: 'text-blue-300', dot: 'bg-blue-400' },
  target: { label: 'Target', bg: 'bg-red-900/30', text: 'text-red-400', dot: 'bg-red-400' } };

function CarrierBadge({ carrier }: { carrier: string }) {
  const cfg = carrierConfig[carrier.toLowerCase()] || {
    label: carrier,
    bg: 'bg-surface-700/30',
    text: 'text-surface-400',
    dot: 'bg-surface-400' };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <CarrierLogo carrier={carrier} size={14} />
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status label helper                                                       */
/* -------------------------------------------------------------------------- */
const statusLabels: Record<string, string> = {
  checked_in: 'Checked In',
  notified: 'Notified',
  ready: 'Ready',
  released: 'Released',
  returned: 'Returned' };

/* -------------------------------------------------------------------------- */
/*  Package type display                                                      */
/* -------------------------------------------------------------------------- */
const packageTypeLabels: Record<string, string> = {
  letter: 'Letter',
  pack: 'Pack',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
  oversized: 'Extra Large' };

/* -------------------------------------------------------------------------- */
/*  Days held calculator                                                      */
/* -------------------------------------------------------------------------- */
function daysHeld(checkedInAt: string): number {
  const now = new Date('2026-02-21T15:00:00');
  const checkedIn = new Date(checkedInAt);
  return Math.max(0, Math.floor((now.getTime() - checkedIn.getTime()) / 86400000));
}

/* -------------------------------------------------------------------------- */
/*  Toast banner                                                              */
/* -------------------------------------------------------------------------- */
interface ToastState {
  message: string;
  type: 'success' | 'info';
}

function ToastBanner({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
      <span>{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mock data: Extend packages with inventory fields                          */
/* -------------------------------------------------------------------------- */
const CONDITION_TAGS: ConditionTag[] = [
  'damaged',
  'open_resealed',
  'wet',
  'leaking',
  'oversized',
  'perishable',
  'fragile',
  'must_pickup_asap',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInventoryPackages(rawPackages: any[] = []): InventoryPackage[] {
  // Extend existing packages with program type + notes
  const extended: InventoryPackage[] = rawPackages.map((pkg, i) => ({
    ...pkg,
    programType: 'pmb' as PackageProgramType,
    conditionTags: i % 7 === 0 ? [CONDITION_TAGS[i % CONDITION_TAGS.length]] : [],
    customerNote: i % 5 === 0 ? 'Package slightly dented on one corner' : '',
    internalNote: i % 9 === 0 ? 'Customer called about this — handle with care' : '',
    conditionPhotos: [],
    verificationStatus: 'unverified' as const,
    putBackCount: 0,
  }));

  // Add carrier program packages (BAR-266)
  const carrierPackages: InventoryPackage[] = [
    {
      id: 'pkg_ap_1',
      trackingNumber: '1Z999AA100000001',
      carrier: 'ups',
      senderName: 'Amazon.com',
      packageType: 'medium',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageFee: 0,
      receivingFee: 0,
      quotaFee: 0,
      checkedInAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      customerId: '',
      programType: 'ups_ap',
      recipientName: 'Carlos Mendez',
      holdDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      conditionTags: [],
      conditionPhotos: [],
      verificationStatus: 'unverified',
      putBackCount: 0,
    },
    {
      id: 'pkg_ap_2',
      trackingNumber: '1Z999AA100000002',
      carrier: 'ups',
      senderName: 'Best Buy',
      packageType: 'large',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageFee: 0,
      receivingFee: 0,
      quotaFee: 0,
      checkedInAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      customerId: '',
      programType: 'ups_ap',
      recipientName: 'Angela Foster',
      holdDeadline: new Date(Date.now() - 1 * 86400000).toISOString(),
      conditionTags: ['damaged'],
      conditionPhotos: [],
      verificationStatus: 'unverified',
      putBackCount: 0,
    },
    {
      id: 'pkg_hal_1',
      trackingNumber: '748912345678901',
      carrier: 'fedex',
      senderName: 'Wayfair',
      packageType: 'large',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageFee: 0,
      receivingFee: 0,
      quotaFee: 0,
      checkedInAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      customerId: '',
      programType: 'fedex_hal',
      recipientName: 'David Chen',
      holdDeadline: new Date(Date.now() + 6 * 86400000).toISOString(),
      conditionTags: [],
      conditionPhotos: [],
      verificationStatus: 'unverified',
      putBackCount: 0,
    },
    {
      id: 'pkg_hal_2',
      trackingNumber: '748998765432109',
      carrier: 'fedex',
      senderName: 'Home Depot',
      packageType: 'xlarge',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageFee: 0,
      receivingFee: 0,
      quotaFee: 0,
      checkedInAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      customerId: '',
      programType: 'fedex_hal',
      recipientName: 'Sarah Phillips',
      holdDeadline: new Date(Date.now() - 5 * 86400000).toISOString(),
      conditionTags: ['oversized'],
      conditionPhotos: [],
      verificationStatus: 'unverified',
      putBackCount: 0,
    },
    {
      id: 'pkg_kinek_1',
      trackingNumber: 'TBA934857263001',
      carrier: 'amazon',
      senderName: 'Amazon.com',
      packageType: 'small',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageFee: 5.0,
      receivingFee: 3.0,
      quotaFee: 0,
      checkedInAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      customerId: '',
      programType: 'kinek',
      recipientName: 'Tom Rogers',
      kinekNumber: '4829371',
      holdDeadline: new Date(Date.now() + 4 * 86400000).toISOString(),
      conditionTags: [],
      conditionPhotos: [],
      verificationStatus: 'unverified',
      putBackCount: 0,
    },
    {
      id: 'pkg_kinek_2',
      trackingNumber: '1Z888BB200000003',
      carrier: 'ups',
      senderName: 'Nike',
      packageType: 'medium',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageFee: 8.0,
      receivingFee: 3.0,
      quotaFee: 0,
      checkedInAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      customerId: '',
      programType: 'kinek',
      recipientName: 'Lisa Wang',
      kinekNumber: '5938271',
      holdDeadline: new Date(Date.now() - 3 * 86400000).toISOString(),
      conditionTags: [],
      conditionPhotos: [],
      verificationStatus: 'unverified',
      putBackCount: 0,
    },
  ];

  return [...extended, ...carrierPackages];
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */
const PAGE_SIZE = 12;

export default function PackagesPage() {
  return (
    <Suspense>
      <PackagesContent />
    </Suspense>
  );
}

function PackagesContent() {
  const searchParams = useSearchParams();
  const [allPackages, setAllPackages] = useState<InventoryPackage[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [packagesLoading, setPackagesLoading] = useState(true);

  /* ── Fetch packages from API ────────────────────────────────── */
  useEffect(() => {
    setPackagesLoading(true);
    fetch('/api/packages?limit=100')
      .then((r) => r.json())
      .then((data) => {
        const built = buildInventoryPackages(data.packages ?? []);
        setAllPackages(built);
      })
      .catch((err) => console.error('Failed to fetch packages:', err))
      .finally(() => setPackagesLoading(false));
  }, []);

  // Filters
  const [statusTab, setStatusTab] = useState('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  /* Track local status overrides (mock data is read-only) */
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, PackageType['status']>
  >({});

  const { log: logActivity } = useActivityLog();

  /* Apply overrides to produce the live package list */
  const packages = useMemo(
    () =>
      rawPackages.map((pkg) =>
        statusOverrides[pkg.id]
          ? {
              ...pkg,
              status: statusOverrides[pkg.id],
              ...(statusOverrides[pkg.id] === 'notified' && {
                notifiedAt: new Date().toISOString(),
              }),
              ...(statusOverrides[pkg.id] === 'released' && {
                releasedAt: new Date().toISOString(),
              }),
            }
          : pkg
      ),
    [statusOverrides]
  );

  /* ---- Notify handler ---- */
  const handleNotify = useCallback(
    (pkg: PackageType) => {
      const customerName = pkg.customer
        ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
        : 'Unknown';
      const pmbNumber = pkg.customer?.pmbNumber || '';

      setStatusOverrides((prev) => ({ ...prev, [pkg.id]: 'notified' }));

      logActivity({
        action: 'notification.send',
        entityType: 'notification',
        entityId: pkg.id,
        entityLabel: customerName,
        description: `Sent package arrival notification to ${customerName} (${pmbNumber})`,
        metadata: {
          packageId: pkg.id,
          trackingNumber: pkg.trackingNumber,
          carrier: pkg.carrier,
          customerId: pkg.customerId,
        },
      });

      setToast({
        message: `Notification sent to ${customerName}`,
        type: 'success',
      });

      // Refresh selected package with new status if modal is open
      setSelectedPackage((prev) =>
        prev?.id === pkg.id ? { ...prev, status: 'notified', notifiedAt: new Date().toISOString() } : prev
      );
    },
    [logActivity]
  );

  /* ---- Release handler ---- */
  const handleRelease = useCallback(
    (pkg: PackageType) => {
      const customerName = pkg.customer
        ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
        : 'Unknown';
      const pmbNumber = pkg.customer?.pmbNumber || '';

      setStatusOverrides((prev) => ({ ...prev, [pkg.id]: 'released' }));

      logActivity({
        action: 'package.release',
        entityType: 'package',
        entityId: pkg.id,
        entityLabel: pkg.trackingNumber || pkg.id,
        description: `Released package to ${customerName} (${pmbNumber})`,
        metadata: {
          packageId: pkg.id,
          trackingNumber: pkg.trackingNumber,
          carrier: pkg.carrier,
          customerId: pkg.customerId,
          customerName,
          pmbNumber,
        },
      });

      setToast({
        message: `Package released to ${customerName}`,
        type: 'success',
      });

      // Close the modal after release
      setSelectedPackage(null);
    },
    [logActivity]
  );

  // Auto-open detail modal when navigated with ?highlight={id}
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      const target = packages.find((p) => p.id === highlightId);
      if (target) setSelectedPackage(target);
    }
  }, [searchParams, packages]);

  // Tab definitions with counts
  const tabs = useMemo(() => {
    const counts = {
      all: packages.length,
      checked_in: packages.filter((p) => p.status === 'checked_in').length,
      notified: packages.filter((p) => p.status === 'notified').length,
      ready: packages.filter((p) => p.status === 'ready').length,
      released: packages.filter((p) => p.status === 'released').length };
    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'checked_in', label: 'Checked In', count: counts.checked_in },
      { id: 'notified', label: 'Notified', count: counts.notified },
      { id: 'ready', label: 'Ready', count: counts.ready },
      { id: 'released', label: 'Released', count: counts.released },
    ];
  }, [packages]);

  // Filtered data
  const filtered = useMemo(() => {
    let data = packages;

    // Tab filter
    if (activeTab !== 'all') {
      data = data.filter((p) => p.status === activeTab);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          (p.trackingNumber?.toLowerCase().includes(q)) ||
          (p.customer?.firstName.toLowerCase().includes(q)) ||
          (p.customer?.lastName.toLowerCase().includes(q)) ||
          (p.customer?.pmbNumber.toLowerCase().includes(q)) ||
          (p.carrier.toLowerCase().includes(q)) ||
          (p.senderName?.toLowerCase().includes(q))
      );
    }

    return data;
  }, [activeTab, search, packages]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setPage(0);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {/* Page Header */}
      <PageHeader
        title="Package Management"
        description={`${packages.length} total packages · ${packages.filter((p) => p.status !== 'released').length} in inventory`}
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => (window.location.href = '/dashboard/packages/check-in')}
          >
            Check In Package
          </Button>
        }
      />

      {/* Tabs + Search */}
      <div className="space-y-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="Search by tracking #, customer, PMB, carrier..."
            value={search}
            onSearch={handleSearch}
            className="w-80"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Packages Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 bg-surface-900/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Tracking #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Carrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Checked In
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Days Held
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-16 text-center text-surface-500"
                  >
                    <Package className="mx-auto h-8 w-8 text-surface-600 mb-3" />
                    <p>No packages found</p>
                  </td>
                </tr>
              ) : (
                paged.map((pkg) => {
                  const held = daysHeld(pkg.checkedInAt);
                  const isOverdue = held > 7 && pkg.status !== 'released';
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className="border-b border-surface-700/60 table-row-hover cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Badge status={pkg.status}>
                          {statusLabels[pkg.status] || pkg.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-surface-300">
                          {pkg.trackingNumber || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <CarrierBadge carrier={pkg.carrier} />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-surface-200 font-medium text-sm">
                            {pkg.customer
                              ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                              : '—'}
                          </p>
                          <p className="text-xs text-surface-500">
                            {pkg.customer?.pmbNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-surface-300">
                        {packageTypeLabels[pkg.packageType]}
                      </td>
                      <td className="px-4 py-3">
                        {pkg.storageLocation ? (
                          <span className="text-xs font-mono text-surface-300 bg-surface-800 px-1.5 py-0.5 rounded">
                            {pkg.storageLocation}
                          </span>
                        ) : (
                          <span className="text-xs text-surface-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-surface-400 text-xs">
                        {formatDate(pkg.checkedInAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold',
                            isOverdue
                              ? 'bg-red-100 text-red-600'
                              : held > 3
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-surface-700/50 text-surface-400'
                          )}
                        >
                          {held}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPackage(pkg);
                            }}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {pkg.status === 'checked_in' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotify(pkg);
                              }}
                              title="Notify"
                            >
                              <Bell className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          {pkg.status !== 'released' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRelease(pkg);
                              }}
                              title="Release"
                            >
                              <PackageCheck className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/60">
            <span className="text-xs text-surface-500">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-xs text-surface-400">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Package Detail Modal */}
      {selectedPackage && (
        <Modal
          open={!!selectedPackage}
          onClose={() => setSelectedPackage(null)}
          title="Package Details"
          size="lg"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setSelectedPackage(null)}
              >
                Close
              </Button>
              {selectedPackage.status !== 'released' && (
                <>
                  {selectedPackage.status === 'checked_in' && (
                    <Button
                      variant="secondary"
                      leftIcon={<Bell className="h-4 w-4" />}
                      onClick={() => handleNotify(selectedPackage)}
                    >
                      Send Notification
                    </Button>
                  )}
                  <Button
                    leftIcon={<PackageCheck className="h-4 w-4" />}
                    onClick={() => handleRelease(selectedPackage)}
                  >
                    Release Package
                  </Button>
                </>
              )}
            </>
          }
        >
          <div className="space-y-6">
            {/* Status & Tracking */}
            <div className="flex items-center gap-3">
              <Badge status={selectedPackage.status}>
                {statusLabels[selectedPackage.status]}
              </Badge>
              {selectedPackage.hazardous && (
                <Badge variant="danger">⚠️ Hazardous</Badge>
              )}
              {selectedPackage.perishable && (
                <Badge variant="warning">🧊 Perishable</Badge>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoField
                label="Tracking Number"
                value={selectedPackage.trackingNumber || '—'}
                mono
              />
              <InfoField
                label="Carrier"
                value={
                  carrierConfig[selectedPackage.carrier.toLowerCase()]?.label ||
                  selectedPackage.carrier
                }
              />
              <InfoField
                label="Customer"
                value={
                  selectedPackage.customer
                    ? `${selectedPackage.customer.firstName} ${selectedPackage.customer.lastName}`
                    : '—'
                }
              />
              <InfoField
                label="PMB"
                value={selectedPackage.customer?.pmbNumber || '—'}
              />
              <InfoField label="Sender" value={selectedPackage.senderName || '—'} />
              <InfoField
                label="Package Type"
                value={packageTypeLabels[selectedPackage.packageType]}
              />
              <InfoField
                label="Checked In"
                value={formatDate(selectedPackage.checkedInAt)}
              />
              <InfoField
                label="Days Held"
                value={`${daysHeld(selectedPackage.checkedInAt)} days`}
              />
              <InfoField
                label="Receiving Fee"
                value={formatCurrency(selectedPackage.receivingFee)}
              />
              <InfoField
                label="Storage Fee"
                value={formatCurrency(selectedPackage.storageFee)}
              />
            </div>

            {/* Notes & Condition */}
            {(selectedPackage.notes || selectedPackage.condition) && (
              <div className="space-y-3 pt-2 border-t border-surface-800">
                {selectedPackage.condition && (
                  <InfoField label="Condition" value={selectedPackage.condition} />
                )}
                {selectedPackage.notes && (
                  <InfoField label="Notes" value={selectedPackage.notes} />
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper components                                                         */
/* -------------------------------------------------------------------------- */
function InfoField({
  label,
  value,
  mono }: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-surface-500 mb-0.5">{label}</p>
      <p
        className={cn(
          'text-sm text-surface-200',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </p>
    </div>
  );
}
