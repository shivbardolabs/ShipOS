'use client';

import { useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, SearchInput, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { SignaturePad } from '@/components/ui/signature-pad';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CARRIER_PROGRAMS,
  ACCEPTED_ID_TYPES,
  detectProgramFromTracking,
} from '@/lib/carrier-program';
import type { CarrierProgramId } from '@/lib/carrier-program';
import {
  Package,
  ShieldCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  FileText,
  ArrowRight,
  Save,
  Plus,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface HeldPackage {
  id: string;
  trackingNumber: string | null;
  carrier: string;
  carrierProgram: string;
  recipientName: string | null;
  packageType: string;
  status: string;
  storageLocation: string | null;
  checkedInAt: string;
  holdDeadline: string | null;
  daysRemaining: number | null;
  agingStatus: 'ok' | 'warning' | 'overdue';
  carrierUploadStatus: string | null;
}

interface InventoryStats {
  total: number;
  ok: number;
  warning: number;
  overdue: number;
  byProgram: Record<string, number>;
}

interface CheckoutRecord {
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientIdType: string;
  checkedOutAt: string;
  uploadStatus: string;
  program: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data (would come from API in production)                             */
/* -------------------------------------------------------------------------- */

const MOCK_HELD: HeldPackage[] = [
  {
    id: 'pkg_hal_1',
    trackingNumber: '748912345678',
    carrier: 'fedex',
    carrierProgram: 'fedex_hal',
    recipientName: 'Maria Garcia',
    packageType: 'medium',
    status: 'checked_in',
    storageLocation: 'Shelf C2',
    checkedInAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    holdDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    daysRemaining: 5,
    agingStatus: 'ok',
    carrierUploadStatus: null,
  },
  {
    id: 'pkg_hal_2',
    trackingNumber: '748998765432',
    carrier: 'fedex',
    carrierProgram: 'fedex_hal',
    recipientName: 'James Wilson',
    packageType: 'large',
    status: 'checked_in',
    storageLocation: 'Shelf D1',
    checkedInAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    holdDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    daysRemaining: 2,
    agingStatus: 'warning',
    carrierUploadStatus: null,
  },
  {
    id: 'pkg_ups_1',
    trackingNumber: '1Z999AA10012345678',
    carrier: 'ups',
    carrierProgram: 'ups_access_point',
    recipientName: 'Sarah Chen',
    packageType: 'small',
    status: 'checked_in',
    storageLocation: 'Bin 7',
    checkedInAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    holdDeadline: new Date(Date.now() - 1 * 86400000).toISOString(),
    daysRemaining: -1,
    agingStatus: 'overdue',
    carrierUploadStatus: null,
  },
  {
    id: 'pkg_ups_2',
    trackingNumber: '1Z888BB20098765432',
    carrier: 'ups',
    carrierProgram: 'ups_access_point',
    recipientName: 'Robert Kim',
    packageType: 'medium',
    status: 'checked_in',
    storageLocation: 'Shelf A1',
    checkedInAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    holdDeadline: new Date(Date.now() + 6 * 86400000).toISOString(),
    daysRemaining: 6,
    agingStatus: 'ok',
    carrierUploadStatus: null,
  },
];

const MOCK_CHECKOUTS: CheckoutRecord[] = [
  {
    id: 'co_1',
    trackingNumber: '748900001111',
    recipientName: 'Laura Martinez',
    recipientIdType: 'drivers_license',
    checkedOutAt: new Date(Date.now() - 3600000).toISOString(),
    uploadStatus: 'pending',
    program: 'fedex_hal',
  },
  {
    id: 'co_2',
    trackingNumber: '1Z777CC30011112222',
    recipientName: 'David Park',
    recipientIdType: 'passport',
    checkedOutAt: new Date(Date.now() - 86400000).toISOString(),
    uploadStatus: 'uploaded',
    program: 'ups_access_point',
  },
];

const MOCK_STATS: InventoryStats = {
  total: MOCK_HELD.length,
  ok: MOCK_HELD.filter((p) => p.agingStatus === 'ok').length,
  warning: MOCK_HELD.filter((p) => p.agingStatus === 'warning').length,
  overdue: MOCK_HELD.filter((p) => p.agingStatus === 'overdue').length,
  byProgram: {
    fedex_hal: MOCK_HELD.filter((p) => p.carrierProgram === 'fedex_hal').length,
    ups_access_point: MOCK_HELD.filter((p) => p.carrierProgram === 'ups_access_point').length,
  },
};

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                             */
/* -------------------------------------------------------------------------- */

function AgingBadge({ status }: { status: 'ok' | 'warning' | 'overdue' }) {
  const config = {
    ok: { label: 'On time', variant: 'success' as const, icon: <CheckCircle2 className="h-3 w-3" /> },
    warning: { label: 'Expiring soon', variant: 'warning' as const, icon: <AlertTriangle className="h-3 w-3" /> },
    overdue: { label: 'Overdue', variant: 'danger' as const, icon: <XCircle className="h-3 w-3" /> },
  };
  const c = config[status];
  return (
    <Badge variant={c.variant} className="gap-1">
      {c.icon}
      {c.label}
    </Badge>
  );
}

function UploadBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') {
    return <Badge variant="warning">Pending upload</Badge>;
  }
  if (status === 'uploaded') return <Badge variant="info">Uploaded</Badge>;
  if (status === 'confirmed') return <Badge variant="success">Confirmed</Badge>;
  if (status === 'failed') return <Badge variant="danger">Upload failed</Badge>;
  return <Badge>{status}</Badge>;
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */

export default function CarrierProgramPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Checkout modal state
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<HeldPackage | null>(null);
  const [idType, setIdType] = useState('');
  const [idVerified, setIdVerified] = useState(false);
  const [, setSignature] = useState('');

  // Intake modal state
  const [intakeModal, setIntakeModal] = useState(false);
  const [intakeTracking, setIntakeTracking] = useState('');
  const [intakeProgram, setIntakeProgram] = useState<string>('');
  const [intakeRecipient, setIntakeRecipient] = useState('');
  const [intakeLocation, setIntakeLocation] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');

  // Settings
  const [settingsModal, setSettingsModal] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  const tabs = [
    { id: 'inventory', label: 'Hold Inventory', icon: <Package className="h-4 w-4" /> },
    { id: 'checkout', label: 'Check-Out', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'uploads', label: 'Carrier Uploads', icon: <Upload className="h-4 w-4" /> },
    { id: 'reconciliation', label: 'Reconciliation', icon: <FileText className="h-4 w-4" /> },
  ];

  /* ── Filtering ── */
  const filteredPackages = useMemo(() => {
    return MOCK_HELD.filter((pkg) => {
      if (programFilter !== 'all' && pkg.carrierProgram !== programFilter) return false;
      if (agingFilter !== 'all' && pkg.agingStatus !== agingFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = pkg.recipientName?.toLowerCase().includes(q);
        const matchesTracking = pkg.trackingNumber?.toLowerCase().includes(q);
        if (!matchesName && !matchesTracking) return false;
      }
      return true;
    });
  }, [programFilter, agingFilter, searchQuery]);

  /* ── Handlers ── */
  const openCheckout = useCallback((pkg: HeldPackage) => {
    setSelectedPkg(pkg);
    setIdType('');
    setIdVerified(false);
    setSignature('');
    setCheckoutModal(true);
  }, []);

  const handleCheckout = useCallback(() => {
    if (!selectedPkg || !idType || !idVerified) return;
    // In production, this would call POST /api/carrier-program/checkout
    setCheckoutModal(false);
    setSelectedPkg(null);
  }, [selectedPkg, idType, idVerified]);

  const handleTrackingScan = useCallback((value: string) => {
    setIntakeTracking(value);
    const detected = detectProgramFromTracking(value);
    if (detected) setIntakeProgram(detected);
  }, []);

  const handleBatchUpload = useCallback(async () => {
    setUploading(true);
    // In production: POST /api/carrier-program/upload with pending checkout IDs
    await new Promise((r) => setTimeout(r, 1500));
    setUploading(false);
  }, []);

  /* ── Stats Cards ── */
  const stats = MOCK_STATS;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carrier Program"
        description="Manage carrier programs and uploads."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSettingsModal(true)}>
              <Settings className="h-4 w-4 mr-1.5" />
              Program Settings
            </Button>
            <Button size="sm" onClick={() => setIntakeModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Intake Package
            </Button>
          </div>
        }
      />

      {/* Program Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Package className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-zinc-400">Total Held</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.ok}</div>
              <div className="text-xs text-zinc-400">On Time</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.warning}</div>
              <div className="text-xs text-zinc-400">Expiring Soon</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.overdue}</div>
              <div className="text-xs text-zinc-400">Overdue</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Program Badges */}
      <div className="flex items-center gap-3">
        {Object.entries(CARRIER_PROGRAMS).map(([id, prog]) => (
          <div
            key={id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
          >
            <CarrierLogo carrier={prog.carrier} size={20} />
            <span className="text-sm font-medium text-white">{prog.name}</span>
            <Badge variant="default">{stats.byProgram[id] ?? 0}</Badge>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ──────────────── INVENTORY TAB ──────────────── */}
      <TabPanel active={activeTab === 'inventory'}>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <SearchInput
              placeholder="Search recipient or tracking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Programs' },
                { value: 'fedex_hal', label: 'FedEx HAL' },
                { value: 'ups_access_point', label: 'UPS Access Point' },
              ]}
              className="w-48"
            />
            <Select
              value={agingFilter}
              onChange={(e) => setAgingFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'ok', label: '✅ On Time' },
                { value: 'warning', label: '⚠️ Expiring Soon' },
                { value: 'overdue', label: '🔴 Overdue' },
              ]}
              className="w-48"
            />
          </div>

          {/* Package List */}
          {filteredPackages.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No carrier program packages in hold inventory</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPackages.map((pkg) => (
                <Card key={pkg.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <CarrierLogo carrier={pkg.carrier} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {pkg.recipientName ?? 'Unknown Recipient'}
                        </span>
                        <Badge variant="default" className="text-[10px]">
                          {CARRIER_PROGRAMS[pkg.carrierProgram as CarrierProgramId]?.name ?? pkg.carrierProgram}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span className="font-mono">{pkg.trackingNumber}</span>
                        <span>•</span>
                        <span>{pkg.packageType}</span>
                        {pkg.storageLocation && (
                          <>
                            <span>•</span>
                            <span>📍 {pkg.storageLocation}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <AgingBadge status={pkg.agingStatus} />
                      <div className="text-xs text-zinc-500 mt-1">
                        {pkg.daysRemaining !== null
                          ? pkg.daysRemaining > 0
                            ? `${pkg.daysRemaining} days left`
                            : `${Math.abs(pkg.daysRemaining)} days overdue`
                          : '—'}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openCheckout(pkg)}>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Check Out
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </TabPanel>

      {/* ──────────────── CHECKOUT TAB ──────────────── */}
      <TabPanel active={activeTab === 'checkout'}>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Checkouts</CardTitle>
            </CardHeader>
            <CardContent>
              {MOCK_CHECKOUTS.length === 0 ? (
                <p className="text-zinc-400 text-sm py-4">No recent checkouts</p>
              ) : (
                <div className="space-y-3">
                  {MOCK_CHECKOUTS.map((co) => (
                    <div
                      key={co.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                    >
                      <CarrierLogo
                        carrier={CARRIER_PROGRAMS[co.program as CarrierProgramId]?.carrier ?? 'other'}
                        size={20}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-white">{co.recipientName}</div>
                        <div className="text-xs text-zinc-400 font-mono">{co.trackingNumber}</div>
                      </div>
                      <div className="text-sm text-zinc-400">
                        ID: {ACCEPTED_ID_TYPES.find((t) => t.value === co.recipientIdType)?.label ?? co.recipientIdType}
                      </div>
                      <div className="text-xs text-zinc-500">{formatDate(co.checkedOutAt)}</div>
                      <UploadBadge status={co.uploadStatus} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ──────────────── UPLOADS TAB ──────────────── */}
      <TabPanel active={activeTab === 'uploads'}>
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">Carrier Portal Uploads</h3>
                <p className="text-sm text-zinc-400">
                  Upload checkout data to FedEx HAL / UPS Access Point portals
                </p>
              </div>
              <Button size="sm" onClick={handleBatchUpload} disabled={uploading}>
                <Upload className="h-4 w-4 mr-1.5" />
                {uploading ? 'Uploading…' : 'Batch Upload Pending'}
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                <div className="text-xl font-bold text-amber-400">
                  {MOCK_CHECKOUTS.filter((c) => c.uploadStatus === 'pending').length}
                </div>
                <div className="text-xs text-zinc-400">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                <div className="text-xl font-bold text-blue-400">
                  {MOCK_CHECKOUTS.filter((c) => c.uploadStatus === 'uploaded').length}
                </div>
                <div className="text-xs text-zinc-400">Uploaded</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                <div className="text-xl font-bold text-emerald-400">
                  {MOCK_CHECKOUTS.filter((c) => c.uploadStatus === 'confirmed').length}
                </div>
                <div className="text-xs text-zinc-400">Confirmed</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                <div className="text-xl font-bold text-red-400">
                  {MOCK_CHECKOUTS.filter((c) => c.uploadStatus === 'failed').length}
                </div>
                <div className="text-xs text-zinc-400">Failed</div>
              </div>
            </div>
          </Card>
        </div>
      </TabPanel>

      {/* ──────────────── RECONCILIATION TAB ──────────────── */}
      <TabPanel active={activeTab === 'reconciliation'}>
        <div className="space-y-4">
          {Object.entries(CARRIER_PROGRAMS).map(([id, prog]) => (
            <Card key={id} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CarrierLogo carrier={prog.carrier} size={28} />
                <div>
                  <h3 className="font-semibold text-white">{prog.fullName}</h3>
                  <p className="text-xs text-zinc-400">Monthly reconciliation — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-white">
                    {stats.byProgram[id] ?? 0}
                  </div>
                  <div className="text-xs text-zinc-400">Currently Held</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {MOCK_CHECKOUTS.filter((c) => c.program === id).length}
                  </div>
                  <div className="text-xs text-zinc-400">Checked Out</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {MOCK_CHECKOUTS.filter((c) => c.program === id && c.uploadStatus === 'uploaded').length}
                  </div>
                  <div className="text-xs text-zinc-400">Uploaded</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {MOCK_CHECKOUTS.filter((c) => c.program === id && c.uploadStatus === 'confirmed').length}
                  </div>
                  <div className="text-xs text-zinc-400">Confirmed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-400">
                    {formatCurrency((MOCK_CHECKOUTS.filter((c) => c.program === id).length) * 3.00)}
                  </div>
                  <div className="text-xs text-zinc-400">Est. Compensation</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </TabPanel>

      {/* ──────────────── CHECKOUT MODAL ──────────────── */}
      <Modal
        open={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title={`Check Out — ${selectedPkg?.recipientName ?? ''}`}
      >
        {selectedPkg && (
          <div className="space-y-5">
            {/* Package info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
              <CarrierLogo carrier={selectedPkg.carrier} size={28} />
              <div>
                <div className="font-medium text-white">{selectedPkg.recipientName}</div>
                <div className="text-xs text-zinc-400 font-mono">{selectedPkg.trackingNumber}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {CARRIER_PROGRAMS[selectedPkg.carrierProgram as CarrierProgramId]?.fullName}
                </div>
              </div>
            </div>

            {/* ID Verification */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Photo ID Verification
              </h4>
              <p className="text-xs text-zinc-400 mb-3">
                Verify recipient&apos;s photo ID matches name on package before release
              </p>

              <Select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                options={[
                  { value: '', label: 'Select ID type…' },
                  ...ACCEPTED_ID_TYPES.map((t) => ({ value: t.value, label: t.label })),
                ]}
                className="mb-3"
              />

              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={idVerified}
                  onChange={(e) => setIdVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 text-indigo-500"
                />
                <div>
                  <div className="text-sm font-medium text-white">I have verified this ID</div>
                  <div className="text-xs text-zinc-400">
                    Name on ID matches &ldquo;{selectedPkg.recipientName}&rdquo;, photo matches recipient, ID is not expired
                  </div>
                </div>
              </label>
            </div>

            {/* Signature */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Recipient Signature</h4>
              <SignaturePad
                onSign={(data) => setSignature(data)}
                onClear={() => setSignature('')}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCheckoutModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={!idType || !idVerified}
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Release Package
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ──────────────── INTAKE MODAL ──────────────── */}
      <Modal
        open={intakeModal}
        onClose={() => setIntakeModal(false)}
        title="Intake Carrier Program Package"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tracking Number</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Scan or type tracking number"
                value={intakeTracking}
                onChange={(e) => handleTrackingScan(e.target.value)}
                className="flex-1"
              />
              <BarcodeScanner onScan={handleTrackingScan} />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Carrier Program</label>
            <Select
              value={intakeProgram}
              onChange={(e) => setIntakeProgram(e.target.value)}
              options={[
                { value: '', label: 'Select program…' },
                { value: 'fedex_hal', label: 'FedEx HAL (Hold at Location)' },
                { value: 'ups_access_point', label: 'UPS Access Point' },
              ]}
            />
            {intakeProgram && intakeTracking && (
              <p className="text-xs text-emerald-400 mt-1">
                ✓ Auto-detected from tracking number prefix
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Recipient Name</label>
            <Input
              placeholder="Name on package (general public recipient)"
              value={intakeRecipient}
              onChange={(e) => setIntakeRecipient(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              These are not PMB holders — enter the name from the carrier label
            </p>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Storage Location</label>
            <Input
              placeholder="e.g. Shelf A3, Bin 12"
              value={intakeLocation}
              onChange={(e) => setIntakeLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notes (optional)</label>
            <Textarea
              placeholder="Any special handling notes"
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIntakeModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={!intakeTracking || !intakeProgram || !intakeRecipient}
              onClick={() => setIntakeModal(false)}
            >
              <Package className="h-4 w-4 mr-1.5" />
              Receive Package
            </Button>
          </div>
        </div>
      </Modal>

      {/* ──────────────── SETTINGS MODAL ──────────────── */}
      <Modal
        open={settingsModal}
        onClose={() => setSettingsModal(false)}
        title="Carrier Program Settings"
        size="lg"
      >
        <div className="space-y-6">
          {Object.entries(CARRIER_PROGRAMS).map(([id, prog]) => (
            <Card key={id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <CarrierLogo carrier={prog.carrier} size={28} />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{prog.fullName}</h4>
                  <p className="text-xs text-zinc-400">{prog.portalUrl}</p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Location ID</label>
                  <Input placeholder="Carrier-assigned location ID" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Portal Username</label>
                  <Input placeholder="Portal login" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Hold Period (days)</label>
                  <Input type="number" defaultValue={7} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">
                    Compensation Rate ($/pkg)
                  </label>
                  <Input type="number" step="0.01" defaultValue={3.00} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Warning Days Before</label>
                  <Input type="number" defaultValue={2} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Max Capacity</label>
                  <Input type="number" defaultValue={0} placeholder="0 = unlimited" />
                </div>
              </div>
            </Card>
          ))}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setSettingsModal(false)}>
              <Save className="h-4 w-4 mr-1.5" />
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
