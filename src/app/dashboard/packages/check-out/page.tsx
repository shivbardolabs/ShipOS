'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import {
  Search,
  ArrowLeft,
  PackageCheck,
  Package,
  CheckCircle2,
  Hash,
  ScanLine,
  MessageSquare,
  Mail,
  Printer,
  Send,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  CreditCard,
  FileSignature,
  ChevronRight,
  User,
  X,
  BarChart3,
  CalendarClock,
  Wallet,
  TrendingUp,
  Gift,
  AlertTriangle,
  Receipt,
  BookOpen,
} from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { PerformedBy } from '@/components/ui/performed-by';
import { useActivityLog } from '@/components/activity-log-provider';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { customers, packages } from '@/lib/mock-data';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Customer, Package as PackageType } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Carrier badge                                                             */
/* -------------------------------------------------------------------------- */
const carrierColors: Record<string, { bg: string; text: string; dot: string }> = {
  ups: { bg: 'bg-amber-900/30', text: 'text-amber-500', dot: 'bg-amber-500' },
  fedex: { bg: 'bg-indigo-900/30', text: 'text-indigo-600', dot: 'bg-indigo-400' },
  usps: { bg: 'bg-blue-900/30', text: 'text-blue-600', dot: 'bg-blue-400' },
  amazon: { bg: 'bg-orange-900/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  dhl: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  lasership: { bg: 'bg-green-900/30', text: 'text-green-400', dot: 'bg-green-400' },
  temu: { bg: 'bg-orange-900/30', text: 'text-orange-500', dot: 'bg-orange-500' },
  ontrac: { bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  walmart: { bg: 'bg-blue-900/30', text: 'text-blue-300', dot: 'bg-blue-400' },
  target: { bg: 'bg-red-900/30', text: 'text-red-400', dot: 'bg-red-400' },
};

const carrierLabels: Record<string, string> = {
  ups: 'UPS',
  fedex: 'FedEx',
  usps: 'USPS',
  amazon: 'Amazon',
  dhl: 'DHL',
  lasership: 'LaserShip',
  temu: 'Temu',
  ontrac: 'OnTrac',
  walmart: 'Walmart',
  target: 'Target',
};

/* -------------------------------------------------------------------------- */
/*  Package type labels                                                       */
/* -------------------------------------------------------------------------- */
const pkgTypeLabels: Record<string, string> = {
  letter: 'Letter',
  pack: 'Pack',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra Large',
  oversized: 'Extra Large', // legacy fallback
};

/* -------------------------------------------------------------------------- */
/*  Days held calculator                                                      */
/* -------------------------------------------------------------------------- */
function daysHeld(checkedInAt: string): number {
  const now = new Date('2026-02-21T15:00:00');
  return Math.max(0, Math.floor((now.getTime() - new Date(checkedInAt).getTime()) / 86400000));
}

/* -------------------------------------------------------------------------- */
/*  Store display                                                             */
/* -------------------------------------------------------------------------- */
const platformVariant: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  iPostal: 'info',
  anytime: 'success',
  postscan: 'warning',
  other: 'default',
};

/* -------------------------------------------------------------------------- */
/*  Add-on services                                                           */
/* -------------------------------------------------------------------------- */
interface AddOn {
  id: string;
  icon: string;
  name: string;
  price: number;
  priceUnit: string;
  description: string;
  recommended?: boolean;
}

const addOnServices: AddOn[] = [
  { id: 'sms-notif', icon: '✉️', name: 'SMS Notification Setup', price: 2.99, priceUnit: '/mo', description: '98% open rate vs 20% email', recommended: true },
  { id: 'insurance', icon: '📦', name: 'Package Insurance', price: 1.50, priceUnit: '/pkg', description: 'Covers up to $500 per package' },
  { id: 'priority-alerts', icon: '🔔', name: 'Priority Alerts', price: 4.99, priceUnit: '/mo', description: 'Instant notifications for important packages' },
  { id: 'mail-forward', icon: '📫', name: 'Mail Forwarding', price: 9.99, priceUnit: '/mo', description: 'Forward to any US address' },
  { id: 'pkg-photos', icon: '🏷️', name: 'Package Photos', price: 0.99, priceUnit: '/pkg', description: 'Photo confirmation on arrival' },
];

/* -------------------------------------------------------------------------- */
/*  Mock Accounts Payable Ledger                                              */
/* -------------------------------------------------------------------------- */
interface AccountLedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'charge' | 'payment' | 'credit';
}

const customerLedgers: Record<string, AccountLedgerEntry[]> = {
  cust_001: [
    { id: 'le_001', date: '2026-02-03', description: 'Package receiving (3 pkgs)', amount: 9.00, type: 'charge' },
    { id: 'le_002', date: '2026-02-07', description: 'Storage fee — 7 days', amount: 5.00, type: 'charge' },
    { id: 'le_003', date: '2026-02-10', description: 'Mail forwarding service', amount: 9.99, type: 'charge' },
    { id: 'le_004', date: '2026-02-14', description: 'Package receiving (2 pkgs)', amount: 8.50, type: 'charge' },
    { id: 'le_005', date: '2026-02-18', description: 'SMS notification add-on', amount: 2.99, type: 'charge' },
  ],
  cust_003: [
    { id: 'le_010', date: '2026-02-01', description: 'Package receiving (5 pkgs)', amount: 22.50, type: 'charge' },
    { id: 'le_011', date: '2026-02-05', description: 'Payment received — thank you', amount: -45.00, type: 'payment' },
    { id: 'le_012', date: '2026-02-12', description: 'Package receiving (4 pkgs)', amount: 17.00, type: 'charge' },
    { id: 'le_013', date: '2026-02-15', description: 'Package insurance (2 pkgs)', amount: 3.00, type: 'charge' },
  ],
};

function getCustomerLedger(customerId: string): AccountLedgerEntry[] {
  return customerLedgers[customerId] || [
    { id: 'le_gen_1', date: '2026-02-05', description: 'Package receiving (2 pkgs)', amount: 6.00, type: 'charge' },
    { id: 'le_gen_2', date: '2026-02-12', description: 'Package receiving (1 pkg)', amount: 3.00, type: 'charge' },
  ];
}

function getLedgerBalance(entries: AccountLedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.type === 'payment' ? e.amount : e.amount), 0);
}

/* -------------------------------------------------------------------------- */
/*  Monthly Package Stats                                                     */
/* -------------------------------------------------------------------------- */
function getMonthlyPackageStats(customerId: string, allPackages: typeof packages) {
  const now = new Date('2026-02-21T15:00:00');
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const custPkgs = allPackages.filter((p) => p.customerId === customerId);
  const monthPkgs = custPkgs.filter((p) => new Date(p.checkedInAt) >= monthStart);
  const totalReceivingFees = monthPkgs.reduce((s, p) => s + p.receivingFee, 0);
  const totalStorageFees = monthPkgs.reduce((s, p) => s + (p.storageFee || 0), 0);
  const releasedThisMonth = monthPkgs.filter((p) => p.status === 'released').length;
  const pendingPickup = custPkgs.filter((p) => p.status !== 'released' && p.status !== 'returned').length;
  return { receivedThisMonth: monthPkgs.length, releasedThisMonth, pendingPickup, totalReceivingFees, totalStorageFees, totalFees: totalReceivingFees + totalStorageFees };
}

/* -------------------------------------------------------------------------- */
/*  Receipt option type                                                       */
/* -------------------------------------------------------------------------- */
type ReceiptMethod = 'sms' | 'email' | 'print' | 'sms+print';

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function CheckOutPage() {
  /* ---- Core state ---- */
  const [searchMode, setSearchMode] = useState<'pmb' | 'name'>('pmb');
  const [pmbInput, setPmbInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameResults, setNameResults] = useState<Customer[]>([]);
  const [showNameResults, setShowNameResults] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [customerPackages, setCustomerPackages] = useState<PackageType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lookupError, setLookupError] = useState('');

  /* ---- Tab state ---- */
  const [activeTab, setActiveTab] = useState('packages');

  /* ---- Add-on state ---- */
  const [enabledAddOns, setEnabledAddOns] = useState<Set<string>>(new Set());

  /* ---- Receipt state ---- */
  const [receiptMethod, setReceiptMethod] = useState<ReceiptMethod>('sms');

  /* ---- Payment mode: post to A/P vs collect now ---- */
  const [paymentMode, setPaymentMode] = useState<'post_to_account' | 'pay_now'>('post_to_account');

  /* ---- Success overlay ---- */
  const [showSuccess, setShowSuccess] = useState(false);

  /* ---- Select customer (shared) ---- */
  const selectCustomer = (customer: Customer) => {
    const pkgs = packages.filter(
      (p) => p.customerId === customer.id && p.status !== 'released' && p.status !== 'returned'
    );
    setFoundCustomer(customer);
    setCustomerPackages(pkgs);
    setShowNameResults(false);
    setNameResults([]);
    if (pkgs.length > 0) {
      setSelectedIds(new Set(pkgs.map((p) => p.id)));
    }
  };

  /* ---- PMB Lookup handler ---- */
  const handlePmbLookup = () => {
    setLookupError('');
    setFoundCustomer(null);
    setCustomerPackages([]);
    setSelectedIds(new Set());
    setActiveTab('packages');
    setEnabledAddOns(new Set());
    setReceiptMethod('sms');

    if (!pmbInput.trim()) {
      setLookupError('Please enter a PMB number');
      return;
    }

    const q = pmbInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const customer = customers.find((c) => {
      const norm = c.pmbNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return norm === q || norm.endsWith(q) || q.endsWith(norm.replace('PMB', ''));
    });

    if (!customer) {
      setLookupError(`No customer found for "${pmbInput}"`);
      return;
    }

    selectCustomer(customer);
  };

  /* ---- Name search handler ---- */
  const handleNameSearch = (query: string) => {
    setNameInput(query);
    setLookupError('');

    if (query.trim().length < 2) {
      setNameResults([]);
      setShowNameResults(false);
      return;
    }

    const q = query.trim().toLowerCase();
    const matches = customers.filter((c) => {
      if (c.status === 'closed') return false;
      const full = `${c.firstName} ${c.lastName}`.toLowerCase();
      const biz = (c.businessName || '').toLowerCase();
      const pmb = c.pmbNumber.toLowerCase();
      return full.includes(q) || biz.includes(q) || c.firstName.toLowerCase().startsWith(q) || c.lastName.toLowerCase().startsWith(q) || pmb.includes(q);
    });

    setNameResults(matches.slice(0, 8));
    setShowNameResults(matches.length > 0);
  };

  /* ---- Pick customer from name results ---- */
  const handleSelectFromResults = (customer: Customer) => {
    setFoundCustomer(null);
    setCustomerPackages([]);
    setSelectedIds(new Set());
    setActiveTab('packages');
    setEnabledAddOns(new Set());
    setReceiptMethod('sms');
    setNameInput(`${customer.firstName} ${customer.lastName}`);
    selectCustomer(customer);
  };

  /* ---- Legacy wrapper ---- */
  const handleLookup = () => {
    if (searchMode === 'pmb') {
      handlePmbLookup();
    } else {
      if (nameInput.trim().length < 2) {
        setLookupError('Enter at least 2 characters');
        return;
      }
      if (nameResults.length === 1) {
        handleSelectFromResults(nameResults[0]);
      } else if (nameResults.length === 0) {
        setLookupError(`No customer found for "${nameInput}"`);
      }
    }
  };

  /* ---- Selection helpers ---- */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(customerPackages.map((p) => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  /* ---- Add-on toggles ---- */
  const toggleAddOn = (id: string) => {
    setEnabledAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---- Fee calculations ---- */
  const selectedPackages = useMemo(
    () => customerPackages.filter((p) => selectedIds.has(p.id)),
    [selectedIds, customerPackages]
  );

  const fees = useMemo(() => {
    const packageFees = selectedPackages.reduce((sum, p) => sum + p.receivingFee, 0);
    const storageFees = selectedPackages.reduce((sum, p) => {
      const held = daysHeld(p.checkedInAt);
      return sum + (held > 5 ? 5.0 : 0);
    }, 0);
    const addOnTotal = addOnServices
      .filter((a) => enabledAddOns.has(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    const subtotal = packageFees + storageFees + addOnTotal;
    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    return { packageFees, storageFees, addOnTotal, subtotal, tax, total };
  }, [selectedPackages, enabledAddOns]);

  /* ---- Account stats for selected customer ---- */
  const accountStats = useMemo(() => {
    if (!foundCustomer) return null;
    const stats = getMonthlyPackageStats(foundCustomer.id, packages);
    const ledger = getCustomerLedger(foundCustomer.id);
    const runningBalance = getLedgerBalance(ledger);
    return { ...stats, ledger, runningBalance };
  }, [foundCustomer]);

  /* ---- Activity log ---- */
  const { log: logActivity, lastActionByVerb } = useActivityLog();
  const lastRelease = lastActionByVerb('package.release');

  /* ---- Release handler ---- */
  const handleRelease = () => {
    if (foundCustomer && selectedIds.size > 0) {
      logActivity({
        action: 'package.release',
        entityType: 'package',
        entityId: Array.from(selectedIds).join(','),
        entityLabel: `${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''}`,
        description: `Released ${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''} to ${foundCustomer.firstName} ${foundCustomer.lastName} (${foundCustomer.pmbNumber})`,
        metadata: {
          packageIds: Array.from(selectedIds),
          customerId: foundCustomer.id,
          customerName: `${foundCustomer.firstName} ${foundCustomer.lastName}`,
          pmbNumber: foundCustomer.pmbNumber,
        },
      });
    }
    setShowSuccess(true);
  };

  /* ---- Reset ---- */
  const handleReset = () => {
    setPmbInput('');
    setNameInput('');
    setNameResults([]);
    setShowNameResults(false);
    setFoundCustomer(null);
    setCustomerPackages([]);
    setSelectedIds(new Set());
    setEnabledAddOns(new Set());
    setReceiptMethod('sms');
    setPaymentMode('post_to_account');
    setActiveTab('packages');
    setShowSuccess(false);
    setLookupError('');
  };

  /* ---- Tab config ---- */
  const tabItems = [
    { id: 'packages', label: 'Packages', icon: <Package className="h-4 w-4" />, count: customerPackages.length },
    { id: 'addons', label: 'Services & Add-ons', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'account', label: 'Account Status', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'receipt', label: 'Receipt & Payment', icon: <CreditCard className="h-4 w-4" /> },
  ];

  /* ---- Receipt option labels ---- */
  const receiptMethodLabel: Record<ReceiptMethod, string> = {
    sms: `SMS receipt sent to ${foundCustomer?.phone || ''}`,
    email: `Email receipt sent to ${foundCustomer?.email || ''}`,
    print: 'Printed receipt',
    'sms+print': `SMS receipt + Printed copy`,
  };

  /* ============================================================================ */
  /*  Success overlay                                                             */
  /* ============================================================================ */
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="text-center max-w-md mx-auto px-6 animate-in fade-in-0 zoom-in-95 duration-300">
          {/* Animated checkmark */}
          <div className="relative mx-auto mb-8">
            <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-500/10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/25">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <div className="absolute -inset-4 rounded-full bg-emerald-500/5 animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-surface-100 mb-2">
            Packages Released Successfully!
          </h2>
          <p className="text-lg text-surface-300 mb-2">
            <span className="text-surface-100 font-semibold">{selectedPackages.length} package{selectedPackages.length !== 1 ? 's' : ''}</span>{' '}
            released to{' '}
            <span className="text-surface-100 font-semibold">{foundCustomer?.firstName} {foundCustomer?.lastName}</span>{' '}
            ({foundCustomer?.pmbNumber})
          </p>
          <p className="text-surface-400 mb-2">
            {paymentMode === 'post_to_account' ? (
              <>Posted to account: <span className="text-blue-500 font-bold text-lg">{formatCurrency(fees.total)}</span></>
            ) : (
              <>Total charged: <span className="text-emerald-600 font-bold text-lg">{formatCurrency(fees.total)}</span></>
            )}
          </p>
          {paymentMode === 'post_to_account' && (
            <p className="text-xs text-surface-500 mb-1">
              Will be included in the consolidated monthly invoice
            </p>
          )}
          <p className="text-sm text-surface-500 mb-10">
            {receiptMethodLabel[receiptMethod]}
          </p>

          <Button size="lg" onClick={handleReset} className="min-w-[200px]">
            New Checkout
          </Button>
        </div>
      </div>
    );
  }

  /* ============================================================================ */
  /*  Main render                                                                 */
  /* ============================================================================ */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Check-Out"
        description="Release packages to customers"
        badge={lastRelease ? <PerformedBy entry={lastRelease} showAction className="ml-2" /> : undefined}
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

      {/* ================================================================== */}
      {/*  Customer Lookup — PMB or Name                                     */}
      {/* ================================================================== */}
      <Card padding="lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
              <ScanLine className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Customer Lookup</h2>
              <p className="text-sm text-surface-400">Find a customer by PMB number or name to release their packages</p>
            </div>
          </div>

          {/* Search mode toggle */}
          <div className="flex gap-1 p-1 bg-surface-800/60 rounded-xl mb-4 max-w-xs">
            <button
              onClick={() => { setSearchMode('pmb'); setLookupError(''); setShowNameResults(false); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                searchMode === 'pmb'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
              )}
            >
              <Hash className="h-4 w-4" />
              PMB Number
            </button>
            <button
              onClick={() => { setSearchMode('name'); setLookupError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                searchMode === 'name'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
              )}
            >
              <User className="h-4 w-4" />
              Name
            </button>
          </div>

          {/* PMB input */}
          {searchMode === 'pmb' && (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  placeholder="e.g. PMB-0003 or 0003"
                  value={pmbInput}
                  onChange={(e) => {
                    setPmbInput(e.target.value);
                    setLookupError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePmbLookup()}
                  error={lookupError || undefined}
                  leftIcon={<Hash className="h-5 w-5" />}
                  className="!py-3.5 !text-lg !rounded-xl"
                />
              </div>
              <Button size="lg" onClick={handlePmbLookup} className="shrink-0 !px-8 !py-3.5 !rounded-xl">
                <Search className="h-5 w-5 mr-2" />
                Look Up
              </Button>
            </div>
          )}

          {/* Name input with live results */}
          {searchMode === 'name' && (
            <div className="relative">
              <div className="flex items-start gap-3">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Search by first name, last name, or business..."
                    value={nameInput}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLookup();
                      if (e.key === 'Escape') setShowNameResults(false);
                    }}
                    onFocus={() => { if (nameResults.length > 0) setShowNameResults(true); }}
                    error={lookupError || undefined}
                    leftIcon={<User className="h-5 w-5" />}
                    className="!py-3.5 !text-lg !rounded-xl"
                  />
                  {nameInput && (
                    <button
                      onClick={() => { setNameInput(''); setNameResults([]); setShowNameResults(false); setLookupError(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Results dropdown */}
              {showNameResults && nameResults.length > 0 && !foundCustomer && (
                <div className="absolute z-30 left-0 right-0 mt-2 bg-surface-850 border border-surface-700 rounded-xl shadow-2xl shadow-black/30 overflow-hidden max-h-[380px] overflow-y-auto">
                  <div className="px-4 py-2.5 border-b border-surface-800">
                    <p className="text-xs font-medium text-surface-500">
                      {nameResults.length} customer{nameResults.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  {nameResults.map((c) => {
                    const pendingPkgs = packages.filter(
                      (p) => p.customerId === c.id && p.status !== 'released' && p.status !== 'returned'
                    ).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectFromResults(c)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-800/60 transition-colors text-left border-b border-surface-800/50 last:border-b-0"
                      >
                        <CustomerAvatar
                          firstName={c.firstName}
                          lastName={c.lastName}
                          photoUrl={c.photoUrl}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-surface-100">{c.firstName} {c.lastName}</span>
                            <span className="font-mono text-xs text-primary-500 font-medium">{c.pmbNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.businessName && (
                              <span className="text-xs text-surface-500">{c.businessName}</span>
                            )}
                            {!c.businessName && c.email && (
                              <span className="text-xs text-surface-500">{c.email}</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {pendingPkgs > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-900/30 text-amber-400 text-xs font-semibold">
                              <Package className="h-3 w-3" />
                              {pendingPkgs}
                            </span>
                          ) : (
                            <span className="text-xs text-surface-600">No packages</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Hint */}
              {!showNameResults && !foundCustomer && nameInput.length === 0 && (
                <p className="text-xs text-surface-500 mt-2">
                  Start typing a name to search. Use PMB number for fastest lookup.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ================================================================== */}
      {/*  Post-lookup: Tab-Based Checkout                                   */}
      {/* ================================================================== */}
      {foundCustomer && (
        <>
          {/* ---- Customer Info Banner ---- */}
          <Card padding="md">
            <div className="flex items-center gap-4">
              <CustomerAvatar
                firstName={foundCustomer.firstName}
                lastName={foundCustomer.lastName}
                photoUrl={foundCustomer.photoUrl}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-surface-100">
                    {foundCustomer.firstName} {foundCustomer.lastName}
                  </h3>
                  <Badge status={foundCustomer.status}>{foundCustomer.status}</Badge>
                  <Badge variant={platformVariant[foundCustomer.platform] || 'default'} dot={false}>
                    {foundCustomer.platform}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-surface-400">
                  <span className="font-mono text-primary-600 font-semibold">{foundCustomer.pmbNumber}</span>
                  {foundCustomer.email && <span>{foundCustomer.email}</span>}
                  {foundCustomer.phone && <span>{foundCustomer.phone}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-surface-100">{customerPackages.length}</p>
                <p className="text-xs text-surface-400">package{customerPackages.length !== 1 ? 's' : ''} in inventory</p>
              </div>
            </div>
          </Card>

          {customerPackages.length === 0 ? (
            <Card>
              <div className="py-16 text-center">
                <Package className="mx-auto h-12 w-12 text-surface-600 mb-4" />
                <p className="text-surface-400">No packages currently in inventory for {foundCustomer.pmbNumber}</p>
              </div>
            </Card>
          ) : (
            <>
              {/* ---- Tab Navigation ---- */}
              <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

              {/* ============================================================ */}
              {/*  Tab 1: Packages                                             */}
              {/* ============================================================ */}
              <TabPanel active={activeTab === 'packages'}>
                {/* Select / Deselect controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={selectAll}
                      disabled={selectedIds.size === customerPackages.length}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAll}
                      disabled={selectedIds.size === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <p className="text-sm text-surface-400">
                    <span className="text-surface-100 font-semibold">{selectedIds.size}</span> of {customerPackages.length} selected
                  </p>
                </div>

                {/* Package list — large touch targets */}
                <div className="space-y-2">
                  {customerPackages.map((pkg) => {
                    const isSelected = selectedIds.has(pkg.id);
                    const held = daysHeld(pkg.checkedInAt);
                    const storageFee = held > 5 ? 5.0 : 0;
                    const cc = carrierColors[pkg.carrier.toLowerCase()];
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => toggleSelect(pkg.id)}
                        className={cn(
                          'glass-card p-4 flex items-center gap-4 cursor-pointer transition-all duration-150',
                          isSelected
                            ? 'ring-1 ring-primary-500/50 bg-primary-50/60'
                            : 'hover:bg-surface-800/50'
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(pkg.id); }}
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
                            isSelected
                              ? 'bg-primary-600 border-primary-500 text-surface-100'
                              : 'bg-surface-900 border-surface-600 hover:border-surface-400'
                          )}
                        >
                          {isSelected && <CheckCircle2 className="h-4 w-4" />}
                        </button>

                        {/* Carrier badge */}
                        <div className="shrink-0">
                          {cc ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cc.bg} ${cc.text}`}>
                              <CarrierLogo carrier={pkg.carrier} size={16} />
                              {carrierLabels[pkg.carrier.toLowerCase()] || pkg.carrier}
                            </span>
                          ) : (
                            <span className="text-surface-400 text-xs">{pkg.carrier}</span>
                          )}
                        </div>

                        {/* Tracking & type */}
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm text-surface-200 truncate">
                            {pkg.trackingNumber || '—'}
                          </p>
                          <p className="text-xs text-surface-500 mt-0.5">
                            {pkgTypeLabels[pkg.packageType] || pkg.packageType} • {formatDate(pkg.checkedInAt)}
                          </p>
                        </div>

                        {/* Days held */}
                        <div className="shrink-0 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold min-w-[42px]',
                              held > 7
                                ? 'bg-red-100 text-red-600'
                                : held > 3
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-surface-700/50 text-surface-400'
                            )}
                          >
                            {held}d
                          </span>
                        </div>

                        {/* Fees */}
                        <div className="shrink-0 text-right min-w-[80px]">
                          <p className="text-sm font-semibold text-surface-200">{formatCurrency(pkg.receivingFee)}</p>
                          {storageFee > 0 && (
                            <p className="text-xs text-yellow-400">+{formatCurrency(storageFee)} storage</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Continue button */}
                <div className="flex justify-end mt-6">
                  <Button
                    size="lg"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => setActiveTab('addons')}
                    disabled={selectedIds.size === 0}
                  >
                    Continue to Add-ons
                  </Button>
                </div>
              </TabPanel>

              {/* ============================================================ */}
              {/*  Tab 2: Services & Add-ons (UPSELL)                          */}
              {/* ============================================================ */}
              <TabPanel active={activeTab === 'addons'}>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-surface-100 mb-1">Recommended Services</h3>
                  <p className="text-sm text-surface-400">Enhance your customer&apos;s experience with these optional add-ons</p>
                </div>

                <div className="space-y-3">
                  {addOnServices.map((addon) => {
                    const isEnabled = enabledAddOns.has(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddOn(addon.id)}
                        className={cn(
                          'glass-card p-5 flex items-center gap-4 cursor-pointer transition-all duration-150',
                          isEnabled
                            ? 'ring-1 ring-primary-500/50 bg-primary-50/60'
                            : 'hover:bg-surface-800/50'
                        )}
                      >
                        {/* Icon */}
                        <div className="text-2xl shrink-0 w-10 text-center">{addon.icon}</div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-surface-100">{addon.name}</h4>
                            {addon.recommended && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-surface-400 mt-0.5">{addon.description}</p>
                        </div>

                        {/* Price */}
                        <div className="shrink-0 text-right mr-2">
                          <p className="text-base font-bold text-surface-100">{formatCurrency(addon.price)}</p>
                          <p className="text-xs text-surface-500">{addon.priceUnit}</p>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAddOn(addon.id); }}
                          className="shrink-0"
                        >
                          {isEnabled ? (
                            <ToggleRight className="h-8 w-8 text-primary-600" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-surface-600" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add-on subtotal */}
                {enabledAddOns.size > 0 && (
                  <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-primary-50 border border-primary-500/20">
                    <span className="text-sm text-primary-300">Add-on subtotal</span>
                    <span className="text-lg font-bold text-surface-100">{formatCurrency(fees.addOnTotal)}</span>
                  </div>
                )}

                {/* Navigate */}
                <div className="flex justify-between mt-6">
                  <Button variant="ghost" onClick={() => setActiveTab('packages')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Packages
                  </Button>
                  <Button
                    size="lg"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => setActiveTab('account')}
                  >
                    Continue to Account
                  </Button>
                </div>
              </TabPanel>

              {/* ============================================================ */}
              {/*  Tab 3: Account Status                                       */}
              {/* ============================================================ */}
              <TabPanel active={activeTab === 'account'}>
                {foundCustomer && accountStats && (
                  <div className="space-y-6">
                    {/* Stat cards row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                            <Package className="h-4 w-4 text-blue-400" />
                          </div>
                          <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Received</span>
                        </div>
                        <p className="text-2xl font-bold text-surface-100">{accountStats.receivedThisMonth}</p>
                        <p className="text-xs text-surface-500 mt-1">packages this month</p>
                      </div>
                      <div className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </div>
                          <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Released</span>
                        </div>
                        <p className="text-2xl font-bold text-surface-100">{accountStats.releasedThisMonth}</p>
                        <p className="text-xs text-surface-500 mt-1">picked up this month</p>
                      </div>
                      <div className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10">
                            <Wallet className="h-4 w-4 text-yellow-400" />
                          </div>
                          <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Fees This Month</span>
                        </div>
                        <p className="text-2xl font-bold text-surface-100">{formatCurrency(accountStats.totalFees)}</p>
                        <p className="text-xs text-surface-500 mt-1">receiving + storage</p>
                      </div>
                      <div className="glass-card p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                            <BookOpen className="h-4 w-4 text-red-400" />
                          </div>
                          <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Account Balance</span>
                        </div>
                        <p className={cn("text-2xl font-bold", accountStats.runningBalance > 0 ? "text-red-400" : "text-emerald-400")}>
                          {formatCurrency(Math.abs(accountStats.runningBalance))}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">{accountStats.runningBalance > 0 ? 'outstanding' : 'credit'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Left: A/P Ledger */}
                      <div className="lg:col-span-3">
                        <Card padding="md">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-surface-100">Accounts Payable Ledger</h3>
                            <Badge variant="info" className="text-xs">Feb 2026</Badge>
                          </div>
                          <div className="space-y-0 divide-y divide-surface-800">
                            {accountStats.ledger.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    entry.type === 'payment' ? "bg-emerald-500/10" : entry.type === 'credit' ? "bg-blue-500/10" : "bg-surface-800"
                                  )}>
                                    {entry.type === 'payment' ? (
                                      <CreditCard className="h-4 w-4 text-emerald-400" />
                                    ) : entry.type === 'credit' ? (
                                      <Gift className="h-4 w-4 text-blue-400" />
                                    ) : (
                                      <Receipt className="h-4 w-4 text-surface-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm text-surface-200">{entry.description}</p>
                                    <p className="text-xs text-surface-500">{entry.date}</p>
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-sm font-semibold tabular-nums",
                                  entry.type === 'payment' ? "text-emerald-400" : "text-surface-300"
                                )}>
                                  {entry.type === 'payment' ? '-' : '+'}{formatCurrency(Math.abs(entry.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-surface-700 pt-3 mt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-surface-300">Running Balance</span>
                              <span className={cn("text-lg font-bold", accountStats.runningBalance > 0 ? "text-red-400" : "text-emerald-400")}>
                                {formatCurrency(Math.abs(accountStats.runningBalance))}
                              </span>
                            </div>
                            <p className="text-xs text-surface-500 mt-1">
                              {accountStats.runningBalance > 0 ? 'Included in consolidated monthly invoice' : 'Account is current'}
                            </p>
                          </div>
                        </Card>
                      </div>

                      {/* Right: Renewal & Incentives */}
                      <div className="lg:col-span-2 space-y-4">
                        <Card padding="md">
                          <h3 className="text-base font-semibold text-surface-100 mb-4">Renewal Status</h3>
                          {(() => {
                            const renewalDate = foundCustomer.renewalDate;
                            const daysUntil = renewalDate
                              ? Math.ceil((new Date(renewalDate).getTime() - new Date('2026-02-21T15:00:00').getTime()) / 86400000)
                              : null;
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-surface-400">Plan</span>
                                  <span className="text-sm font-medium text-surface-200">{foundCustomer.billingTerms || 'Monthly'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-surface-400">Platform</span>
                                  <Badge variant="info" className="text-xs capitalize">{foundCustomer.platform}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-surface-400">Renewal Date</span>
                                  <span className="text-sm font-medium text-surface-200">
                                    {renewalDate ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                </div>
                                {daysUntil !== null && (
                                  <div className={cn(
                                    "flex items-center gap-2 p-3 rounded-xl",
                                    daysUntil <= 14 ? "bg-red-500/10 border border-red-500/20" :
                                    daysUntil <= 30 ? "bg-yellow-500/10 border border-yellow-500/20" :
                                    "bg-emerald-500/10 border border-emerald-500/20"
                                  )}>
                                    {daysUntil <= 14 ? (
                                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                                    ) : (
                                      <CalendarClock className="h-4 w-4 text-emerald-400 shrink-0" />
                                    )}
                                    <div>
                                      <p className={cn(
                                        "text-sm font-semibold",
                                        daysUntil <= 14 ? "text-red-400" : daysUntil <= 30 ? "text-yellow-400" : "text-emerald-400"
                                      )}>
                                        {daysUntil <= 0 ? 'Renewal Overdue!' : daysUntil + ' days until renewal'}
                                      </p>
                                      <p className="text-xs text-surface-500">
                                        {daysUntil <= 14 ? 'Remind customer to renew' : daysUntil <= 30 ? 'Approaching renewal window' : 'Account in good standing'}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-surface-400">Customer Since</span>
                                  <span className="text-sm text-surface-300">
                                    {new Date(foundCustomer.dateOpened).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </Card>

                        <Card padding="md">
                          <h3 className="text-base font-semibold text-surface-100 mb-3">Incentives & Offers</h3>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                                <Gift className="h-4 w-4 text-purple-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-surface-200">Referral Bonus</p>
                                <p className="text-xs text-surface-500">Earn $25 credit for each referral. Share code with customer.</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                                <TrendingUp className="h-4 w-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-surface-200">Annual Plan Upgrade</p>
                                <p className="text-xs text-surface-500">Save 15% by switching from {foundCustomer.billingTerms || 'Monthly'} to Annual billing.</p>
                              </div>
                            </div>
                            {accountStats.receivedThisMonth >= 5 && (
                              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                                  <Sparkles className="h-4 w-4 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-surface-200">High-Volume Customer</p>
                                  <p className="text-xs text-surface-500">{accountStats.receivedThisMonth}+ packages this month — eligible for volume discount.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>

                    <div className="flex justify-between mt-2">
                      <Button variant="ghost" onClick={() => setActiveTab('addons')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Add-ons
                      </Button>
                      <Button
                        size="lg"
                        rightIcon={<ChevronRight className="h-4 w-4" />}
                        onClick={() => setActiveTab('receipt')}
                      >
                        Continue to Payment
                      </Button>
                    </div>
                  </div>
                )}
              </TabPanel>

              {/* ============================================================ */}
              {/*  Tab 4: Receipt & Payment                                    */}
              {/* ============================================================ */}
              <TabPanel active={activeTab === 'receipt'}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left column: Payment mode + Fee breakdown */}
                  <div className="lg:col-span-3 space-y-6">
                    {/* Payment mode toggle */}
                    <Card padding="md">
                      <h3 className="text-base font-semibold text-surface-100 mb-4">Payment Method</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPaymentMode('post_to_account')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            paymentMode === 'post_to_account'
                              ? "border-primary-500 bg-primary-50"
                              : "border-surface-700 bg-surface-900/50 hover:border-surface-500"
                          )}
                        >
                          <BookOpen className={cn("h-6 w-6", paymentMode === 'post_to_account' ? "text-primary-600" : "text-surface-400")} />
                          <div className="text-center">
                            <p className={cn("text-sm font-semibold", paymentMode === 'post_to_account' ? "text-surface-100" : "text-surface-300")}>Post to Account</p>
                            <p className="text-xs text-surface-500 mt-0.5">Add to monthly invoice</p>
                          </div>
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                            paymentMode === 'post_to_account' ? "bg-emerald-100 text-emerald-600" : "bg-surface-700 text-surface-400"
                          )}>Recommended</span>
                        </button>
                        <button
                          onClick={() => setPaymentMode('pay_now')}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                            paymentMode === 'pay_now'
                              ? "border-primary-500 bg-primary-50"
                              : "border-surface-700 bg-surface-900/50 hover:border-surface-500"
                          )}
                        >
                          <CreditCard className={cn("h-6 w-6", paymentMode === 'pay_now' ? "text-primary-600" : "text-surface-400")} />
                          <div className="text-center">
                            <p className={cn("text-sm font-semibold", paymentMode === 'pay_now' ? "text-surface-100" : "text-surface-300")}>Collect Now</p>
                            <p className="text-xs text-surface-500 mt-0.5">Charge at checkout</p>
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-transparent">&nbsp;</span>
                        </button>
                      </div>

                      {/* A/P context when posting to account */}
                      {paymentMode === 'post_to_account' && accountStats && (
                        <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium text-blue-300">Account Balance</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-surface-100">{formatCurrency(accountStats.runningBalance)}</span>
                            <span className="text-xs text-surface-500">current balance</span>
                          </div>
                          <p className="text-xs text-surface-500 mt-1">
                            This checkout of {formatCurrency(fees.total)} will be added. Consolidated invoice sent end of month.
                          </p>
                        </div>
                      )}
                    </Card>

                    <Card padding="md">
                      <h3 className="text-base font-semibold text-surface-100 mb-5">Fee Breakdown</h3>

                      {/* Package fees */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Package Fees</p>
                        {selectedPackages.map((pkg) => (
                          <div key={pkg.id} className="flex items-center justify-between py-1.5 text-sm">
                            <span className="text-surface-400">
                              {carrierLabels[pkg.carrier.toLowerCase()] || pkg.carrier} — {pkg.trackingNumber?.slice(-8) || 'N/A'} ({pkgTypeLabels[pkg.packageType]})
                            </span>
                            <span className="text-surface-300">{formatCurrency(pkg.receivingFee)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Storage fees */}
                      {fees.storageFees > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Storage Fees</p>
                          {selectedPackages
                            .filter((p) => daysHeld(p.checkedInAt) > 5)
                            .map((pkg) => (
                              <div key={pkg.id} className="flex items-center justify-between py-1.5 text-sm">
                                <span className="text-surface-400">
                                  {pkg.trackingNumber?.slice(-8) || 'N/A'} — {daysHeld(pkg.checkedInAt)} days @ $1.00/day (max $5)
                                </span>
                                <span className="text-yellow-400">{formatCurrency(5.0)}</span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Add-on services */}
                      {fees.addOnTotal > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Add-on Services</p>
                          {addOnServices.filter((a) => enabledAddOns.has(a.id)).map((addon) => (
                            <div key={addon.id} className="flex items-center justify-between py-1.5 text-sm">
                              <span className="text-surface-400">{addon.icon} {addon.name}</span>
                              <span className="text-surface-300">{formatCurrency(addon.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Totals */}
                      <div className="border-t border-surface-800 pt-3 mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-surface-400">Subtotal</span>
                          <span className="text-surface-300">{formatCurrency(fees.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-surface-400">Tax (8.75%)</span>
                          <span className="text-surface-300">{formatCurrency(fees.tax)}</span>
                        </div>
                      </div>
                      <div className="border-t border-surface-700 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-surface-100">Total</span>
                          <span className="text-2xl font-bold text-surface-100">{formatCurrency(fees.total)}</span>
                        </div>
                        {paymentMode === 'post_to_account' && accountStats && (
                          <p className="text-xs text-surface-500 mt-2">
                            New account balance after posting: <span className="text-surface-300 font-medium">{formatCurrency(accountStats.runningBalance + fees.total)}</span>
                          </p>
                        )}
                      </div>
                    </Card>

                    {/* Signature */}
                    <Card padding="md">
                      <label className="text-sm font-semibold text-surface-300 block mb-3">Customer Signature</label>
                      <div className="h-28 rounded-xl border-2 border-dashed border-surface-700 bg-surface-900/40 flex items-center justify-center">
                        <div className="text-center">
                          <FileSignature className="mx-auto h-7 w-7 text-surface-600 mb-1.5" />
                          <p className="text-xs text-surface-500">Tap or click to sign</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Right column: Receipt delivery + Actions */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card padding="md">
                      <h3 className="text-base font-semibold text-surface-100 mb-4">Receipt Delivery</h3>
                      <div className="space-y-2">
                        <ReceiptOption
                          icon={<MessageSquare className="h-5 w-5" />}
                          label="SMS Receipt"
                          sublabel={foundCustomer.phone || 'No phone on file'}
                          recommended
                          selected={receiptMethod === 'sms'}
                          onClick={() => setReceiptMethod('sms')}
                        />
                        <ReceiptOption
                          icon={<Mail className="h-5 w-5" />}
                          label="Email Receipt"
                          sublabel={foundCustomer.email || 'No email on file'}
                          selected={receiptMethod === 'email'}
                          onClick={() => setReceiptMethod('email')}
                        />
                        <ReceiptOption
                          icon={<Printer className="h-5 w-5" />}
                          label="Print Receipt"
                          sublabel="Thermal printer"
                          selected={receiptMethod === 'print'}
                          onClick={() => setReceiptMethod('print')}
                        />
                        <ReceiptOption
                          icon={<Send className="h-5 w-5" />}
                          label="SMS + Print"
                          sublabel="Both digital and physical"
                          selected={receiptMethod === 'sms+print'}
                          onClick={() => setReceiptMethod('sms+print')}
                        />
                      </div>
                    </Card>

                    {/* Action buttons */}
                    <div className="space-y-3">
                      {paymentMode === 'post_to_account' ? (
                        <Button
                          fullWidth
                          size="lg"
                          leftIcon={<BookOpen className="h-5 w-5" />}
                          onClick={handleRelease}
                          disabled={selectedIds.size === 0}
                          className="!py-4 !text-base !rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-900/30"
                        >
                          Post to Account & Release {selectedIds.size} Pkg{selectedIds.size !== 1 ? 's' : ''}
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          size="lg"
                          leftIcon={<PackageCheck className="h-5 w-5" />}
                          onClick={handleRelease}
                          disabled={selectedIds.size === 0}
                          className="!py-4 !text-base !rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-900/30"
                        >
                          Collect {formatCurrency(fees.total)} & Release {selectedIds.size} Pkg{selectedIds.size !== 1 ? 's' : ''}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        fullWidth
                        size="lg"
                        onClick={handleReset}
                        className="!py-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Navigate back */}
                <div className="flex justify-start mt-6">
                  <Button variant="ghost" onClick={() => setActiveTab('account')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Account Status
                  </Button>
                </div>
              </TabPanel>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Receipt Option Component                                                  */
/* -------------------------------------------------------------------------- */
function ReceiptOption({
  icon,
  label,
  sublabel,
  recommended,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  recommended?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-surface-700 bg-surface-900/50 hover:border-surface-500'
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        selected ? 'bg-primary-50 text-primary-600' : 'bg-surface-800 text-surface-400'
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', selected ? 'text-surface-100' : 'text-surface-300')}>{label}</span>
          {recommended && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">
              75% prefer this
            </span>
          )}
        </div>
        <p className="text-xs text-surface-500 truncate">{sublabel}</p>
      </div>
      <div className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
        selected ? 'border-primary-500 bg-primary-500' : 'border-surface-600'
      )}>
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}
