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
  CreditCard,
  ChevronRight,
  User,
  X,
  BookOpen,
  QrCode,
  Undo2,
  Clock,
  ShieldCheck,
  IdCard,
} from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { SignaturePad } from '@/components/ui/signature-pad';
import { PerformedBy } from '@/components/ui/performed-by';
import { useActivityLog } from '@/components/activity-log-provider';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { SignatureTagPrint } from '@/components/packages/signature-tag-print';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { QRCode } from '@/components/packages/qr-generator';
import { PackageVerification } from '@/components/packages/package-verification';
import { Modal } from '@/components/ui/modal';
import { customers, packages } from '@/lib/mock-data';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import type { Customer, Package as PackageType, VerificationStatus, PutBackReason } from '@/lib/types';

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
  physical: 'warning',
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
  const [searchMode, setSearchMode] = useState<'pmb' | 'name' | 'tracking'>('pmb');
  const [pmbInput, setPmbInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
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

  /* ---- Release signature state — captured during checkout (BAR-189) ---- */
  const [releaseSignature, setReleaseSignature] = useState<string | null>(null);
  /** BAR-189: Signature capture method — touchscreen or payment terminal */
  const [signatureMethod, setSignatureMethod] = useState<'touchscreen' | 'terminal'>('touchscreen');
  /** BAR-189: Signature required flag (configurable per tenant; default true) */
  const [signatureRequired] = useState(true);
  /** BAR-189: Terminal signature status */
  const [terminalSignatureStatus, setTerminalSignatureStatus] = useState<'idle' | 'requesting' | 'captured' | 'failed'>('idle');

  /* ---- Payment mode: post to A/P vs collect now ---- */
  const [paymentMode, setPaymentMode] = useState<'post_to_account' | 'pay_now'>('post_to_account');

  /* ---- Pickup delegation state ---- */
  const [showDelegate, setShowDelegate] = useState(false);
  const [delegateName, setDelegateName] = useState('');
  const [delegateIdType, setDelegateIdType] = useState('');
  const [delegateIdNumber, setDelegateIdNumber] = useState('');

  /* ---- BAR-187: QR Scan & Put-Back state ---- */
  const [showQrModal, setShowQrModal] = useState(false);
  const [putBackPkg, setPutBackPkg] = useState<PackageType | null>(null);
  const [putBackReason, setPutBackReason] = useState<PutBackReason | ''>('');
  const [showPutBackModal, setShowPutBackModal] = useState(false);

  /* ---- BAR-246: Label Verification Scan state ---- */
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const [showVerification, setShowVerification] = useState(false);

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

  /* ---- BAR-187: QR-code based customer lookup ---- */
  const handleQrScan = (value: string) => {
    // QR encodes PMB number e.g. "PMB-0003"
    const cleaned = value.replace(/^PMB[-\s]*/i, '').trim();
    const customer = customers.find((c) => {
      const norm = c.pmbNumber.replace(/[^A-Z0-9]/gi, '');
      return norm.endsWith(cleaned) || cleaned.endsWith(norm.replace(/PMB/i, ''));
    });
    if (customer) {
      selectCustomer(customer);
      setPmbInput(customer.pmbNumber);
    } else {
      setLookupError(`No customer found for QR code "${value}"`);
    }
  };

  /* ---- BAR-187: Put-Back handler (preserves checkedInAt/storage timer) ---- */
  const handlePutBack = async (pkg: PackageType, reason: PutBackReason) => {
    try {
      await fetch('/api/packages/put-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, reason }),
      });
      logActivity({
        action: 'package.check_in',
        entityType: 'package',
        entityId: pkg.id,
        entityLabel: pkg.trackingNumber || pkg.id,
        description: `Put back package for ${foundCustomer?.firstName} ${foundCustomer?.lastName} — reason: ${reason}`,
        metadata: { putBack: true, reason },
      });
      // Remove from selected & packages list
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(pkg.id);
        return next;
      });
      setCustomerPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    } catch {
      // Silent — optimistic UI update
    } finally {
      setShowPutBackModal(false);
      setPutBackPkg(null);
      setPutBackReason('');
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
    setReleaseSignature(null);

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
    setReleaseSignature(null);
    setNameInput(`${customer.firstName} ${customer.lastName}`);
    selectCustomer(customer);
  };

  /* ---- Tracking number lookup (BAR-256) ---- */
  const handleTrackingLookup = () => {
    setLookupError('');
    setFoundCustomer(null);
    setCustomerPackages([]);
    setSelectedIds(new Set());
    setActiveTab('packages');
    setEnabledAddOns(new Set());
    setReceiptMethod('sms');
    setReleaseSignature(null);

    if (!trackingInput.trim()) {
      setLookupError('Please enter a tracking number');
      return;
    }

    const q = trackingInput.trim().toUpperCase();
    // Find packages matching this tracking number
    const matchingPkgs = packages.filter(
      (p) => p.trackingNumber && p.trackingNumber.toUpperCase().includes(q) && p.status !== 'released' && p.status !== 'returned'
    );

    if (matchingPkgs.length === 0) {
      setLookupError(`No unreleased package found with tracking "${trackingInput}"`);
      return;
    }

    // Find the customer for the first matching package
    const pkg = matchingPkgs[0];
    const customer = customers.find((c) => c.id === pkg.customerId);
    if (!customer) {
      setLookupError('Package found but customer record is missing');
      return;
    }

    // Load all unreleased packages for that customer (not just the matched one)
    const allPkgs = packages.filter(
      (p) => p.customerId === customer.id && p.status !== 'released' && p.status !== 'returned'
    );
    setFoundCustomer(customer);
    setCustomerPackages(allPkgs);
    // Pre-select only the tracked package
    setSelectedIds(new Set(matchingPkgs.map((p) => p.id)));
  };

  /* ---- Legacy wrapper ---- */
  const handleLookup = () => {
    if (searchMode === 'pmb') {
      handlePmbLookup();
    } else if (searchMode === 'tracking') {
      handleTrackingLookup();
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

  /* ---- Release handler (BAR-12: POST to API for DB persistence) ---- */
  const [isReleasing, setIsReleasing] = useState(false);

  const handleRelease = async () => {
    if (!foundCustomer || selectedIds.size === 0 || isReleasing) return;
    /* BAR-189: Block release if signature is required but not captured */
    if (signatureRequired && !releaseSignature) return;
    setIsReleasing(true);

    try {
      const res = await fetch('/api/packages/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageIds: Array.from(selectedIds),
          customerId: foundCustomer.id,
          releaseSignature: releaseSignature || undefined,
          signatureMethod: signatureMethod,
          receiptMethod: receiptMethod || 'none',
        }),
      });

      const data = await res.json();

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
          hasSignature: !!releaseSignature,
          released: data.released ?? selectedIds.size,
        },
      });
    } catch {
      // Fallback: still log locally if API fails
      logActivity({
        action: 'package.release',
        entityType: 'package',
        entityId: Array.from(selectedIds).join(','),
        entityLabel: `${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''}`,
        description: `Released ${selectedIds.size} package${selectedIds.size > 1 ? 's' : ''} to ${foundCustomer.firstName} ${foundCustomer.lastName} (${foundCustomer.pmbNumber})`,
        metadata: {
          packageIds: Array.from(selectedIds),
          customerId: foundCustomer.id,
          pmbNumber: foundCustomer.pmbNumber,
          hasSignature: !!releaseSignature,
          apiError: true,
        },
      });
    } finally {
      setIsReleasing(false);
      setShowSuccess(true);
    }
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
              <p className="text-sm text-surface-400">Find a customer by PMB number, name, or tracking number to release their packages</p>
            </div>
          </div>

          {/* Search mode toggle */}
          <div className="flex gap-1 p-1 bg-surface-800/60 rounded-xl mb-4 max-w-md">
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
              PMB
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
            <button
              onClick={() => { setSearchMode('tracking'); setLookupError(''); setShowNameResults(false); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                searchMode === 'tracking'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
              )}
            >
              <ScanLine className="h-4 w-4" />
              Tracking #
            </button>
          </div>

          {/* BAR-187: QR code scanner for customer lookup */}
          <div className="flex items-center gap-3 mb-4">
            <BarcodeScanner onScan={handleQrScan} />
            <span className="text-xs text-surface-500">Scan customer QR code for instant lookup</span>
            {foundCustomer && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<QrCode className="h-4 w-4" />}
                onClick={() => setShowQrModal(true)}
              >
                Show QR
              </Button>
            )}
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

          {/* Tracking number input (BAR-256) */}
          {searchMode === 'tracking' && (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter or scan tracking number..."
                  value={trackingInput}
                  onChange={(e) => {
                    setTrackingInput(e.target.value);
                    setLookupError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrackingLookup()}
                  error={lookupError || undefined}
                  leftIcon={<ScanLine className="h-5 w-5" />}
                  className="!py-3.5 !text-lg !rounded-xl"
                />
                <p className="text-xs text-surface-500 mt-2">
                  Enter a full or partial tracking number to find the package and its owner
                </p>
              </div>
              <Button size="lg" onClick={handleTrackingLookup} className="shrink-0 !px-8 !py-3.5 !rounded-xl">
                <Search className="h-5 w-5 mr-2" />
                Look Up
              </Button>
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

                        {/* BAR-187: Storage duration */}
                        <div className="shrink-0 text-center min-w-[60px]">
                          <div className="flex items-center gap-1 text-xs text-surface-500">
                            <Clock className="h-3 w-3" />
                            <span>{held}d stored</span>
                          </div>
                        </div>

                        {/* Fees */}
                        <div className="shrink-0 text-right min-w-[80px]">
                          <p className="text-sm font-semibold text-surface-200">{formatCurrency(pkg.receivingFee)}</p>
                          {storageFee > 0 && (
                            <p className="text-xs text-yellow-400">+{formatCurrency(storageFee)} storage</p>
                          )}
                        </div>

                        {/* BAR-187: Put-back action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPutBackPkg(pkg);
                            setShowPutBackModal(true);
                          }}
                          className="shrink-0 p-1.5 rounded-lg text-surface-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Put Back"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* BAR-246: Label Verification Scan */}
                {selectedIds.size > 0 && (
                  <Card padding="md" className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-4 w-4 text-surface-400" />
                      <h4 className="text-sm font-semibold text-surface-200">
                        Label Verification Scan
                      </h4>
                      <button
                        onClick={() => setShowVerification(!showVerification)}
                        className="ml-auto text-xs text-primary-400 hover:text-primary-300"
                      >
                        {showVerification ? 'Hide' : 'Verify Package Labels'}
                      </button>
                    </div>
                    {showVerification && foundCustomer && (
                      <PackageVerification
                        expectedPmb={foundCustomer.pmbNumber}
                        onVerify={(result) => setVerificationStatus(result.status)}
                        status={verificationStatus}
                        onOverride={() => setVerificationStatus('verified')}
                      />
                    )}
                    {!showVerification && (
                      <p className="text-xs text-surface-500">
                        Optional: scan package labels to verify they match this customer before release.
                      </p>
                    )}
                  </Card>
                )}

                {/* BAR-187: Photo ID display during verification */}
                {foundCustomer?.photoUrl && selectedIds.size > 0 && (
                  <Card padding="md" className="mt-4">
                    <div className="flex items-center gap-3">
                      <IdCard className="h-4 w-4 text-surface-400" />
                      <h4 className="text-sm font-semibold text-surface-200">
                        Customer Photo ID
                      </h4>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <CustomerAvatar
                        firstName={foundCustomer.firstName}
                        lastName={foundCustomer.lastName}
                        photoUrl={foundCustomer.photoUrl}
                        size="lg"
                      />
                      <div>
                        <p className="text-sm font-medium text-surface-200">
                          {foundCustomer.firstName} {foundCustomer.lastName}
                        </p>
                        <p className="text-xs text-surface-500 font-mono">
                          {foundCustomer.pmbNumber}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                          Verify the person matches the photo before release.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Continue button */}
                <div className="flex justify-end mt-6">
                  <Button
                    size="lg"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => setActiveTab('receipt')}
                    disabled={selectedIds.size === 0}
                  >
                    Continue to Payment
                  </Button>
                </div>
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

                    {/* ── Pickup Delegation (Enhanced Checkout) ──────────────── */}
                    <Card padding="md">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-surface-100">Pickup Delegation</h3>
                        <button
                          onClick={() => setShowDelegate(!showDelegate)}
                          className={cn(
                            "relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer",
                            showDelegate ? 'bg-primary-600' : 'bg-surface-700'
                          )}
                        >
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full bg-white transition-transform shadow-sm',
                              showDelegate ? 'translate-x-6' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>
                      {!showDelegate ? (
                        <p className="text-xs text-surface-500">
                          Enable if someone other than the customer is picking up the packages.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-surface-500 mb-3">
                            Person picking up on behalf of {foundCustomer?.firstName} {foundCustomer?.lastName}:
                          </p>
                          <Input
                            label="Delegate Name"
                            value={delegateName}
                            onChange={(e) => setDelegateName(e.target.value)}
                            placeholder="Full name of person picking up"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-surface-400 mb-1.5">ID Type</label>
                              <select
                                value={delegateIdType}
                                onChange={(e) => setDelegateIdType(e.target.value)}
                                className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200"
                              >
                                <option value="">Select...</option>
                                <option value="drivers_license">Driver&apos;s License</option>
                                <option value="passport">Passport</option>
                                <option value="state_id">State ID</option>
                                <option value="military_id">Military ID</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <Input
                              label="ID Number"
                              value={delegateIdNumber}
                              onChange={(e) => setDelegateIdNumber(e.target.value)}
                              placeholder="Last 4 digits"
                            />
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* BAR-189: Signature Capture — Enhanced checkout signature */}
                    <Card padding="md">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                          Customer Signature
                          {signatureRequired && (
                            <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">Required</span>
                          )}
                        </label>
                        {/* BAR-189: Capture method toggle */}
                        <div className="flex rounded-lg border border-surface-700 overflow-hidden">
                          <button
                            onClick={() => setSignatureMethod('touchscreen')}
                            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                              signatureMethod === 'touchscreen'
                                ? 'bg-primary-600 text-white'
                                : 'text-surface-400 hover:text-surface-200'
                            }`}
                          >
                            Touchscreen
                          </button>
                          <button
                            onClick={() => {
                              setSignatureMethod('terminal');
                              setTerminalSignatureStatus('idle');
                            }}
                            className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                              signatureMethod === 'terminal'
                                ? 'bg-primary-600 text-white'
                                : 'text-surface-400 hover:text-surface-200'
                            }`}
                          >
                            Payment Terminal
                          </button>
                        </div>
                      </div>

                      {releaseSignature ? (
                        <div className="space-y-2">
                          <div className="h-28 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={releaseSignature} alt="Customer signature" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              ✓ Captured via {signatureMethod === 'terminal' ? 'payment terminal' : 'touchscreen'}
                            </span>
                            <button
                              onClick={() => {
                                setReleaseSignature(null);
                                setTerminalSignatureStatus('idle');
                              }}
                              className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
                            >
                              Clear &amp; re-sign
                            </button>
                          </div>
                        </div>
                      ) : signatureMethod === 'touchscreen' ? (
                        <SignaturePad
                          onSign={(dataUrl) => setReleaseSignature(dataUrl)}
                          height={112}
                          label=""
                        />
                      ) : (
                        /* BAR-189: Payment terminal signature capture */
                        <div className="flex flex-col items-center justify-center py-6 rounded-xl border border-dashed border-surface-700 bg-surface-800/20">
                          {terminalSignatureStatus === 'idle' && (
                            <>
                              <p className="text-sm text-surface-400 mb-3">Send signature request to payment terminal</p>
                              <button
                                onClick={() => {
                                  setTerminalSignatureStatus('requesting');
                                  // Simulate terminal response after 3s
                                  setTimeout(() => {
                                    setTerminalSignatureStatus('captured');
                                    setReleaseSignature('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIj48cGF0aCBkPSJNMTAgNTAgQzMwIDIwLCA2MCA4MCwgOTAgNDAgQzEyMCAwLCAxNTAgOTAsIDE4MCA1MCBDMjEwIDEwLCAyNDAgNzAsIDI4MCA0MCIgc3Ryb2tlPSIjMzMzIiBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=');
                                  }, 3000);
                                }}
                                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                              >
                                Request Terminal Signature
                              </button>
                            </>
                          )}
                          {terminalSignatureStatus === 'requesting' && (
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-8 w-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                              <p className="text-sm text-primary-400">Waiting for customer to sign on terminal...</p>
                              <button
                                onClick={() => setTerminalSignatureStatus('idle')}
                                className="text-xs text-surface-500 hover:text-surface-300"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* BAR-189: Missing signature warning */}
                      {signatureRequired && !releaseSignature && (
                        <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                          ⚠ Signature required before release
                        </p>
                      )}
                    </Card>

                    {/* BAR-100: Signature Tag Printing */}
                    {foundCustomer && customerPackages.length > 0 && (
                      <SignatureTagPrint
                        packages={customerPackages}
                        customer={foundCustomer}
                        selectedIds={selectedIds}
                      />
                    )}
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
                          disabled={selectedIds.size === 0 || (signatureRequired && !releaseSignature)}
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
                          disabled={selectedIds.size === 0 || (signatureRequired && !releaseSignature)}
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
                  <Button variant="ghost" onClick={() => setActiveTab('packages')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Packages
                  </Button>
                </div>
              </TabPanel>
            </>
          )}
        </>
      )}
      {/* BAR-187: Customer QR Code Modal */}
      {foundCustomer && (
        <Modal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="Customer QR Code"
          size="sm"
        >
          <div className="flex flex-col items-center py-4">
            <QRCode value={foundCustomer.pmbNumber} size={200} modules={21} />
            <p className="text-sm font-semibold text-surface-200 mt-3">
              {foundCustomer.firstName} {foundCustomer.lastName}
            </p>
            <p className="text-xs text-surface-500 font-mono">{foundCustomer.pmbNumber}</p>
            <p className="text-xs text-surface-600 mt-3">
              Show this QR at pickup for instant identification
            </p>
          </div>
        </Modal>
      )}

      {/* BAR-187: Put-Back Modal */}
      <Modal
        open={showPutBackModal}
        onClose={() => {
          setShowPutBackModal(false);
          setPutBackPkg(null);
          setPutBackReason('');
        }}
        title="Put Back Package"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowPutBackModal(false);
                setPutBackPkg(null);
                setPutBackReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={!putBackReason}
              onClick={() => {
                if (putBackPkg && putBackReason) {
                  handlePutBack(putBackPkg, putBackReason as PutBackReason);
                }
              }}
              leftIcon={<Undo2 className="h-4 w-4" />}
            >
              Put Back
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-400">
            Return this package to inventory. The <strong className="text-surface-300">storage timer will
            be preserved</strong> (checkedInAt stays the same).
          </p>
          {putBackPkg && (
            <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700 text-sm">
              <p className="text-surface-200 font-mono">{putBackPkg.trackingNumber || 'N/A'}</p>
              <p className="text-xs text-surface-500">{putBackPkg.carrier}</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-surface-400 mb-2 block">Reason for Put-Back</label>
            <div className="space-y-2">
              {([
                { id: 'customer_not_present' as const, label: 'Customer not present' },
                { id: 'wrong_package' as const, label: 'Wrong package selected' },
                { id: 'id_mismatch' as const, label: 'ID mismatch' },
                { id: 'customer_declined' as const, label: 'Customer declined pickup' },
                { id: 'other' as const, label: 'Other reason' },
              ]).map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setPutBackReason(reason.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border text-sm transition-all',
                    putBackReason === reason.id
                      ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                      : 'border-surface-700 bg-surface-800/30 text-surface-400 hover:bg-surface-700/30'
                  )}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
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
