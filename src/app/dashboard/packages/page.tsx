'use client';

/**
 * BAR-266: Comprehensive Inventory for PMB, Access Point, Hold At Location, and Kinek
 * BAR-13:  Package Inventory Dashboard — aging indicators, filters, CSV export, summary
 * BAR-259: Reprint Package Label Action — per-row and bulk reprint
 *
 * Unified Package Management Dashboard showing all packages in inventory across
 * all program types (PMB, UPS AP, FedEx HAL, Kinek) with status/type filtering,
 * aging indicators, and quick actions.
 */

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  Printer,
  CheckSquare,
  LayoutGrid,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Carrier styling                                                           */
/* -------------------------------------------------------------------------- */
const carrierConfig: Record<string, { label: string; bg: string; text: string }> = {
  ups: { label: 'UPS', bg: 'bg-amber-900/30', text: 'text-amber-500' },
  fedex: { label: 'FedEx', bg: 'bg-indigo-900/30', text: 'text-indigo-600' },
  usps: { label: 'USPS', bg: 'bg-blue-900/30', text: 'text-blue-600' },
  amazon: { label: 'Amazon', bg: 'bg-orange-900/30', text: 'text-orange-400' },
  dhl: { label: 'DHL', bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
  lasership: { label: 'LaserShip', bg: 'bg-green-900/30', text: 'text-green-400' },
  temu: { label: 'Temu', bg: 'bg-orange-900/30', text: 'text-orange-500' },
  ontrac: { label: 'OnTrac', bg: 'bg-blue-900/30', text: 'text-blue-400' },
  walmart: { label: 'Walmart', bg: 'bg-blue-900/30', text: 'text-blue-300' },
  target: { label: 'Target', bg: 'bg-red-900/30', text: 'text-red-400' },
};

function CarrierBadge({ carrier }: { carrier: string }) {
  const cfg = carrierConfig[carrier.toLowerCase()] || {
    label: carrier,
    bg: 'bg-surface-700/30',
    text: 'text-surface-400',
  };
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
/*  Program type badge (BAR-266)                                              */
/* -------------------------------------------------------------------------- */
const programConfig: Record<
  PackageProgramType,
  { label: string; variant: 'default' | 'warning' | 'info' | 'muted'; emoji: string }
> = {
  pmb: { label: 'PMB', variant: 'default', emoji: '📬' },
  ups_ap: { label: 'UPS AP', variant: 'warning', emoji: '🟤' },
  fedex_hal: { label: 'FedEx HAL', variant: 'info', emoji: '🟣' },
  kinek: { label: 'Kinek', variant: 'muted', emoji: '🔵' },
};

function ProgramBadge({ type }: { type: PackageProgramType }) {
  const cfg = programConfig[type];
  return (
    <Badge variant={cfg.variant} className="text-[10px]">
      {cfg.emoji} {cfg.label}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status + label helpers                                                    */
/* -------------------------------------------------------------------------- */
const statusLabels: Record<string, string> = {
  checked_in: 'Checked In',
  notified: 'Notified',
  ready: 'Ready',
  released: 'Released',
  returned: 'Returned',
};

const packageTypeLabels: Record<string, string> = {
  letter: 'Letter',
  pack: 'Pack',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
  oversized: 'Extra Large',
};

/* -------------------------------------------------------------------------- */
/*  Days held + aging helpers (BAR-13)                                        */
/* -------------------------------------------------------------------------- */
function daysHeld(checkedInAt: string): number {
  const now = new Date();
  const checkedIn = new Date(checkedInAt);
  return Math.max(0, Math.floor((now.getTime() - checkedIn.getTime()) / 86400000));
}

type AgingColor = 'green' | 'yellow' | 'red';

function getAgingColor(days: number): AgingColor {
  if (days < 7) return 'green';
  if (days < 14) return 'yellow';
  return 'red';
}

const agingStyles: Record<AgingColor, string> = {
  green: 'bg-emerald-500/20 text-emerald-400',
  yellow: 'bg-amber-500/20 text-amber-400',
  red: 'bg-red-500/20 text-red-400',
};

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
  const [_packagesLoading, setPackagesLoading] = useState(true);

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

  // Selection (for bulk reprint)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Modals
  const [selectedPackage, setSelectedPackage] = useState<InventoryPackage | null>(null);
  const [reprintPackages, setReprintPackages] = useState<InventoryPackage[]>([]);
  const [showReprintModal, setShowReprintModal] = useState(false);

  // Auto-open from URL param
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      const target = allPackages.find((p) => p.id === highlightId);
      if (target) setSelectedPackage(target);
    }
  }, [searchParams, allPackages]);

  /* ── Status Tabs ── */
  const statusTabs = useMemo(() => {
    const inInventory = allPackages.filter(
      (p) => programFilter === 'all' || p.programType === programFilter
    );
    const counts = {
      all: inInventory.length,
      checked_in: inInventory.filter((p) => p.status === 'checked_in').length,
      notified: inInventory.filter((p) => p.status === 'notified').length,
      ready: inInventory.filter((p) => p.status === 'ready').length,
      released: inInventory.filter((p) => p.status === 'released').length,
    };
    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'checked_in', label: 'Checked In', count: counts.checked_in },
      { id: 'notified', label: 'Notified', count: counts.notified },
      { id: 'ready', label: 'Ready', count: counts.ready },
      { id: 'released', label: 'Released', count: counts.released },
    ];
  }, [allPackages, programFilter]);

  /* ── Filtered Data ── */
  const filtered = useMemo(() => {
    let data = allPackages;

    // Program filter (BAR-266)
    if (programFilter !== 'all') {
      data = data.filter((p) => p.programType === programFilter);
    }

    // Status tab
    if (statusTab !== 'all') {
      data = data.filter((p) => p.status === statusTab);
    }

    // Carrier filter
    if (carrierFilter !== 'all') {
      data = data.filter((p) => p.carrier.toLowerCase() === carrierFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.trackingNumber?.toLowerCase().includes(q) ||
          p.customer?.firstName.toLowerCase().includes(q) ||
          p.customer?.lastName.toLowerCase().includes(q) ||
          p.customer?.pmbNumber.toLowerCase().includes(q) ||
          p.carrier.toLowerCase().includes(q) ||
          p.senderName?.toLowerCase().includes(q) ||
          p.recipientName?.toLowerCase().includes(q) ||
          p.kinekNumber?.includes(q)
      );
    }

    return data;
  }, [allPackages, statusTab, programFilter, carrierFilter, search]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleTabChange = useCallback((tabId: string) => {
    setStatusTab(tabId);
    setPage(0);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  /* ── Selection ── */
  const toggleSelect = useCallback((pkgId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(paged.map((p) => p.id)));
  }, [paged]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  /* ── Bulk Reprint (BAR-259) ── */
  const handleBulkReprint = useCallback(() => {
    const selectedPkgs = allPackages.filter((p) => selected.has(p.id));
    setReprintPackages(selectedPkgs);
    setShowReprintModal(true);
  }, [allPackages, selected]);

  const handleSingleReprint = useCallback(
    (pkg: InventoryPackage) => {
      setReprintPackages([pkg]);
      setShowReprintModal(true);
    },
    []
  );

  /* ── CSV Export (BAR-13) ── */
  const handleExport = useCallback(() => {
    const headers = [
      'Status',
      'Type',
      'Tracking #',
      'Carrier',
      'Customer/Recipient',
      'PMB/ID',
      'Package Size',
      'Location',
      'Checked In',
      'Days Held',
      'Condition Tags',
      'Notes',
    ];
    const rows = filtered.map((pkg) => [
      statusLabels[pkg.status] || pkg.status,
      programConfig[pkg.programType]?.label || pkg.programType,
      pkg.trackingNumber || '',
      pkg.carrier,
      pkg.customer
        ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
        : pkg.recipientName || '',
      pkg.customer?.pmbNumber || pkg.kinekNumber || '',
      packageTypeLabels[pkg.packageType] || pkg.packageType,
      pkg.storageLocation || '',
      pkg.checkedInAt,
      String(daysHeld(pkg.checkedInAt)),
      (pkg.conditionTags || []).join('; '),
      pkg.customerNote || '',
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `package-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  /* ── Program type filter tabs (BAR-266) ── */
  const programTabs = useMemo(
    () => [
      { id: 'all', label: 'All Types', count: allPackages.length },
      {
        id: 'pmb',
        label: '📬 PMB',
        count: allPackages.filter((p) => p.programType === 'pmb').length,
      },
      {
        id: 'ups_ap',
        label: '🟤 UPS AP',
        count: allPackages.filter((p) => p.programType === 'ups_ap').length,
      },
      {
        id: 'fedex_hal',
        label: '🟣 FedEx HAL',
        count: allPackages.filter((p) => p.programType === 'fedex_hal').length,
      },
      {
        id: 'kinek',
        label: '🔵 Kinek',
        count: allPackages.filter((p) => p.programType === 'kinek').length,
      },
    ],
    [allPackages]
  );

  /* ── Unique carriers for filter ── */
  const uniqueCarriers = useMemo(
    () =>
      Array.from(new Set(allPackages.map((p) => p.carrier.toLowerCase()))).sort(),
    [allPackages]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Package Management"
        description={`${allPackages.length} total · ${allPackages.filter((p) => p.status !== 'released').length} in inventory`}
        actions={
          <div className="flex items-center gap-2">
            {selectMode && selected.size > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={handleBulkReprint}
              >
                Reprint ({selected.size})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                selectMode ? (
                  <LayoutGrid className="h-4 w-4" />
                ) : (
                  <CheckSquare className="h-4 w-4" />
                )
              }
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected(new Set());
              }}
            >
              {selectMode ? 'Done' : 'Select'}
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => (window.location.href = '/dashboard/packages/check-in')}
            >
              Check In
            </Button>
          </div>
        }
      />

      {/* Inventory Summary (BAR-13) */}
      <InventorySummary packages={allPackages} />

      {/* Program Type Tabs (BAR-266) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {programTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setProgramFilter(tab.id);
              setPage(0);
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
              programFilter === tab.id
                ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                : 'bg-surface-800/50 text-surface-400 hover:bg-surface-700/50 hover:text-surface-300'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px]',
                programFilter === tab.id
                  ? 'bg-primary-500/30 text-primary-300'
                  : 'bg-surface-700 text-surface-500'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Status Tabs + Search + Filters */}
      <div className="space-y-4">
        <Tabs tabs={statusTabs} activeTab={statusTab} onChange={handleTabChange} />

        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="Search tracking #, customer, PMB, Kinek #..."
            value={search}
            onSearch={handleSearch}
            className="w-80"
          />
          <Select
            value={carrierFilter}
            onChange={(e) => {
              setCarrierFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: 'all', label: 'All Carriers' },
              ...uniqueCarriers.map((c) => ({
                value: c,
                label: carrierConfig[c]?.label || c,
              })),
            ]}
            className="w-40"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExport}
            >
              Export CSV
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
                {selectMode && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === paged.length && paged.length > 0}
                      onChange={() =>
                        selected.size === paged.length ? deselectAll() : selectAll()
                      }
                      className="rounded border-surface-600"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Tracking #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Carrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Customer / Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                  Size
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
                    colSpan={selectMode ? 11 : 10}
                    className="px-4 py-16 text-center text-surface-500"
                  >
                    <Package className="mx-auto h-8 w-8 text-surface-600 mb-3" />
                    <p>No packages found</p>
                  </td>
                </tr>
              ) : (
                paged.map((pkg) => {
                  const held = daysHeld(pkg.checkedInAt);
                  const aging = getAgingColor(held);
                  const isNonPmb = pkg.programType !== 'pmb';
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() =>
                        selectMode ? toggleSelect(pkg.id) : setSelectedPackage(pkg)
                      }
                      className={cn(
                        'border-b border-surface-700/60 table-row-hover cursor-pointer',
                        selectMode && selected.has(pkg.id) && 'bg-primary-500/5'
                      )}
                    >
                      {selectMode && (
                        <td className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(pkg.id)}
                            onChange={() => toggleSelect(pkg.id)}
                            className="rounded border-surface-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Badge status={pkg.status}>
                          {statusLabels[pkg.status] || pkg.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ProgramBadge type={pkg.programType} />
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
                            {isNonPmb
                              ? pkg.recipientName || '—'
                              : pkg.customer
                                ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                                : '—'}
                          </p>
                          <p className="text-xs text-surface-500">
                            {isNonPmb
                              ? pkg.kinekNumber
                                ? `Kinek #${pkg.kinekNumber}`
                                : programConfig[pkg.programType].label
                              : pkg.customer?.pmbNumber}
                          </p>
                          {(pkg.conditionTags?.length ?? 0) > 0 && (
                            <div className="mt-1">
                              <ConditionTagBadges tags={pkg.conditionTags || []} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-surface-300 text-xs">
                        {packageTypeLabels[pkg.packageType] || pkg.packageType}
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
                            agingStyles[aging]
                          )}
                        >
                          {held}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={() => setSelectedPackage(pkg)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            onClick={() => handleSingleReprint(pkg)}
                            title="Reprint Label"
                          >
                            <Printer className="h-4 w-4 text-surface-400" />
                          </Button>
                          {pkg.status === 'checked_in' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
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

      {/* Package Detail Modal (BAR-266: type-specific views) */}
      {selectedPackage && (
        <PackageDetailModal
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)}
          onReprint={() => handleSingleReprint(selectedPackage)}
        />
      )}

      {/* Reprint Modal (BAR-259) */}
      <PackageLabelReprintModal
        open={showReprintModal}
        onClose={() => {
          setShowReprintModal(false);
          setReprintPackages([]);
        }}
        packages={reprintPackages}
        storeName="ShipOS Store"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Package Detail Modal                                                      */
/* -------------------------------------------------------------------------- */

function PackageDetailModal({
  pkg,
  onClose,
  onReprint,
}: {
  pkg: InventoryPackage;
  onClose: () => void;
  onReprint: () => void;
}) {
  const held = daysHeld(pkg.checkedInAt);
  const aging = getAgingColor(held);
  const isNonPmb = pkg.programType !== 'pmb';

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Package Details"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="secondary"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={onReprint}
          >
            Reprint Label
          </Button>
          {pkg.status !== 'released' && (
            <>
              <Button
                variant="secondary"
                leftIcon={<Bell className="h-4 w-4" />}
              >
                Send Notification
              </Button>
              <Button leftIcon={<PackageCheck className="h-4 w-4" />}>
                Release Package
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Status Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge status={pkg.status}>{statusLabels[pkg.status]}</Badge>
          <ProgramBadge type={pkg.programType} />
          {pkg.hazardous && <Badge variant="danger">⚠️ Hazardous</Badge>}
          {pkg.perishable && <Badge variant="warning">🧊 Perishable</Badge>}
          {pkg.verificationStatus && (
            <VerificationBadge status={pkg.verificationStatus} />
          )}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', agingStyles[aging])}>
            {held} days held
          </span>
        </div>

        {/* Info Grid — adapts to package type (BAR-266) */}
        <div className="grid grid-cols-2 gap-4">
          {isNonPmb ? (
            <>
              <DetailField label="Recipient Name" value={pkg.recipientName || '—'} />
              {pkg.kinekNumber && (
                <DetailField label="Kinek Number" value={pkg.kinekNumber} mono />
              )}
            </>
          ) : (
            <>
              <DetailField
                label="Customer"
                value={
                  pkg.customer
                    ? `${pkg.customer.firstName} ${pkg.customer.lastName}`
                    : '—'
                }
              />
              <DetailField label="PMB" value={pkg.customer?.pmbNumber || '—'} />
            </>
          )}
          <DetailField label="Tracking Number" value={pkg.trackingNumber || '—'} mono />
          <DetailField
            label="Carrier"
            value={carrierConfig[pkg.carrier.toLowerCase()]?.label || pkg.carrier}
          />
          <DetailField label="Sender" value={pkg.senderName || '—'} />
          <DetailField
            label="Package Type"
            value={packageTypeLabels[pkg.packageType] || pkg.packageType}
          />
          <DetailField label="Checked In" value={formatDate(pkg.checkedInAt)} />
          {pkg.holdDeadline && (
            <DetailField label="Hold Deadline" value={formatDate(pkg.holdDeadline)} />
          )}
          <DetailField label="Storage Location" value={pkg.storageLocation || '—'} />
          <DetailField label="Receiving Fee" value={formatCurrency(pkg.receivingFee)} />
          <DetailField label="Storage Fee" value={formatCurrency(pkg.storageFee)} />
          {pkg.programType === 'kinek' && (
            <DetailField
              label="Fee Owed"
              value={formatCurrency(pkg.storageFee + pkg.receivingFee)}
            />
          )}
        </div>

        {/* Condition Notes (BAR-39 — read-only view) */}
        {((pkg.conditionTags?.length ?? 0) > 0 ||
          pkg.customerNote ||
          pkg.internalNote ||
          (pkg.conditionPhotos?.length ?? 0) > 0) && (
          <div className="pt-2 border-t border-surface-800">
            <ConditionNotes
              selectedTags={pkg.conditionTags || []}
              customerNote={pkg.customerNote || ''}
              internalNote={pkg.internalNote || ''}
              photos={pkg.conditionPhotos || []}
              onTagsChange={() => {}}
              onCustomerNoteChange={() => {}}
              onInternalNoteChange={() => {}}
              onPhotosChange={() => {}}
              readOnly
              compact
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-surface-500 mb-0.5">{label}</p>
      <p className={cn('text-sm text-surface-200', mono && 'font-mono text-xs')}>
        {value}
      </p>
    </div>
  );
}
