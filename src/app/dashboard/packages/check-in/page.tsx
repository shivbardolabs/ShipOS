'use client';
/* eslint-disable */

import { useState, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  ScanBarcode,
  Package,
  Mail,
  MessageSquare,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
  Eye,
  RefreshCw,
  Hash,
  Loader2 } from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { PerformedBy } from '@/components/ui/performed-by';
import { useActivityLog } from '@/components/activity-log-provider';
import { detectCarrier } from '@/lib/carrier-detection';
import { ENRICHABLE_CARRIERS } from '@/lib/carrier-api';
import { printLabel, renderPackageLabel } from '@/lib/labels';
// customers now fetched from API
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface SearchCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  businessName?: string | null;
  pmbNumber: string;
  platform: string;
  status: string;
  notifyEmail: boolean;
  notifySms: boolean;
  activePackageCount?: number;
}

interface DuplicatePackage {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  checkedInAt: string;
  customerName: string;
  customerPmb: string;
}

/* -------------------------------------------------------------------------- */
/*  Step Config                                                               */
/* -------------------------------------------------------------------------- */
const STEPS = [
  { id: 1, label: 'Identify Customer' },
  { id: 2, label: 'Carrier & Sender' },
  { id: 3, label: 'Package Details' },
  { id: 4, label: 'Confirm & Notify' },
];

/* -------------------------------------------------------------------------- */
/*  Carrier Config                                                            */
/* -------------------------------------------------------------------------- */
const carrierOptions = [
  { id: 'amazon', label: 'Amazon', color: 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20', active: 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/30' },
  { id: 'ups', label: 'UPS', color: 'border-amber-700/40 bg-amber-900/20 text-amber-500 hover:bg-amber-900/30', active: 'border-amber-600 bg-amber-900/30 ring-1 ring-amber-500/30' },
  { id: 'fedex', label: 'FedEx', color: 'border-indigo-300/40 bg-indigo-50 text-indigo-600 hover:bg-indigo-100', active: 'border-indigo-500 bg-indigo-100 ring-1 ring-indigo-500/30' },
  { id: 'usps', label: 'USPS', color: 'border-blue-500/40 bg-blue-50 text-blue-600 hover:bg-blue-100', active: 'border-blue-500 bg-blue-100 ring-1 ring-blue-500/30' },
  { id: 'dhl', label: 'DHL', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20', active: 'border-yellow-500 bg-yellow-500/20 ring-1 ring-yellow-500/30' },
  { id: 'lasership', label: 'LaserShip', color: 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20', active: 'border-green-500 bg-green-500/20 ring-1 ring-green-500/30' },
  { id: 'temu', label: 'Temu', color: 'border-orange-600/40 bg-orange-600/10 text-orange-500 hover:bg-orange-600/20', active: 'border-orange-600 bg-orange-600/20 ring-1 ring-orange-600/30' },
  { id: 'ontrac', label: 'OnTrac', color: 'border-blue-600/40 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20', active: 'border-blue-600 bg-blue-600/20 ring-1 ring-blue-600/30' },
  { id: 'walmart', label: 'Walmart', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20', active: 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500/30' },
  { id: 'target', label: 'Target', color: 'border-red-500/40 bg-red-50 text-red-600 hover:bg-red-100', active: 'border-red-500 bg-red-100 ring-1 ring-red-500/30' },
  { id: 'other', label: 'Other', color: 'border-surface-600/40 bg-surface-700/20 text-surface-400 hover:bg-surface-700/30', active: 'border-surface-500 bg-surface-700/30 ring-1 ring-surface-500/30' },
];

const carrierSenderMap: Record<string, string> = {
  amazon: 'Amazon.com',
  ups: '',
  fedex: '',
  usps: '',
  dhl: '',
  lasership: '',
  temu: 'Temu.com',
  ontrac: '',
  walmart: 'Walmart Inc',
  target: 'Target Corporation',
  other: '' };

/* -------------------------------------------------------------------------- */
/*  Package type config                                                       */
/* -------------------------------------------------------------------------- */
const packageTypeOptions = [
  { id: 'letter', label: 'Letter', icon: '✉️', desc: 'Envelope / Flat' },
  { id: 'pack', label: 'Pack', icon: '📨', desc: 'Bubble mailer / Soft pack' },
  { id: 'small', label: 'Small', icon: '📦', desc: 'Up to 2 lbs' },
  { id: 'medium', label: 'Medium', icon: '📦', desc: 'Up to 8 lbs' },
  { id: 'large', label: 'Large', icon: '📦', desc: 'Up to 15 lbs' },
  { id: 'xlarge', label: 'Extra Large', icon: '🏗️', desc: '20+ lbs / Bulky' },
];

/* -------------------------------------------------------------------------- */
/*  Package Program Types (BAR-266)                                           */
/* -------------------------------------------------------------------------- */
type PackageProgram = 'pmb' | 'ups_ap' | 'fedex_hal' | 'kinek' | 'amazon';

const packageProgramOptions: {
  id: PackageProgram;
  label: string;
  icon: string;
  desc: string;
  color: string;
  activeColor: string;
}[] = [
  {
    id: 'pmb',
    label: 'PMB',
    icon: '📬',
    desc: 'Private Mailbox customer',
    color: 'border-primary-500/40 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20',
    activeColor: 'border-primary-500 bg-primary-500/20 ring-1 ring-primary-500/30',
  },
  {
    id: 'ups_ap',
    label: 'UPS AP',
    icon: '📦',
    desc: 'UPS Access Point',
    color: 'border-amber-700/40 bg-amber-900/20 text-amber-500 hover:bg-amber-900/30',
    activeColor: 'border-amber-600 bg-amber-900/30 ring-1 ring-amber-500/30',
  },
  {
    id: 'fedex_hal',
    label: 'FedEx HAL',
    icon: '📦',
    desc: 'FedEx Hold At Location',
    color: 'border-indigo-300/40 bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    activeColor: 'border-indigo-500 bg-indigo-100 ring-1 ring-indigo-500/30',
  },
  {
    id: 'kinek',
    label: 'KINEK',
    icon: '📦',
    desc: 'KINEK network',
    color: 'border-teal-500/40 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20',
    activeColor: 'border-teal-500 bg-teal-500/20 ring-1 ring-teal-500/30',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    icon: '📦',
    desc: 'Amazon packages',
    color: 'border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
    activeColor: 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/30',
  },
];

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function CheckInPage() {
  const [step, setStep] = useState(1);

  // Step 1 — Package Program (BAR-266)
  const [packageProgram, setPackageProgram] = useState<PackageProgram>('pmb');

  // Step 1 — Customer (BAR-38: enhanced lookup) — used when program = 'pmb'
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'pmb' | 'name' | 'phone' | 'company'>('pmb');
  const [selectedCustomer, setSelectedCustomer] = useState<SearchCustomer | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [dbCustomers, setDbCustomers] = useState<SearchCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Step 1 — Recipient (BAR-266) — used when program != 'pmb'
  const [recipientName, setRecipientName] = useState('');
  const [kinekNumber, setKinekNumber] = useState('');

  // TODO: In production, fetch enabled programs from client settings API
  // For now, all carrier programs are visible (PMB is always enabled)
  const enabledPrograms = useMemo(() => {
    // PMB is always available; carrier programs filtered by client settings
    // This will be replaced by an API call to /api/settings/carrier-programs
    return packageProgramOptions;
  }, []);

  // Step 2 — Carrier (BAR-37: enhanced auto-detect, BAR-240: API enrichment)
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [carrierAutoSuggested, setCarrierAutoSuggested] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [customCarrierName, setCustomCarrierName] = useState('');
  const [senderSuggestions, setSenderSuggestions] = useState<string[]>([]);
  const [showSenderSuggestions, setShowSenderSuggestions] = useState(false);
  const senderRef = useRef<HTMLDivElement>(null);

  // Step 3 — Package Details (BAR-245: conditional popups, duplicate tracking)
  const [packageType, setPackageType] = useState('');
  const [hazardous, setHazardous] = useState(false);
  const [perishable, setPerishable] = useState(false);
  const [condition, setCondition] = useState('good');
  const [conditionOther, setConditionOther] = useState('');
  const [notes, setNotes] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [requiresSignature, setRequiresSignature] = useState(false);

  // BAR-245: Popup modals for size/perishable warnings
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [showPerishableWarning, setShowPerishableWarning] = useState(false);
  const [sizeWarningAcked, setSizeWarningAcked] = useState(false);
  const [perishableWarningAcked, setPerishableWarningAcked] = useState(false);

  // BAR-245: Duplicate tracking number detection
  const [duplicatePackage, setDuplicatePackage] = useState<DuplicatePackage | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [checkingTracking, setCheckingTracking] = useState(false);

  // Step 4 — Notify
  const [printLabel, setPrintLabel] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);

  // Submit state (BAR-260: actually save to DB)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkedInPackageId, setCheckedInPackageId] = useState<string | null>(null);

  // Fetch customers from API with debounced search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    customerDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({ limit: '10', status: 'active' });
      if (customerSearch.trim()) params.set('search', customerSearch.trim());
      fetch(`/api/customers?${params}`)
        .then((r) => r.json())
        .then((data) => setCustomers(data.customers ?? []))
        .catch((err) => console.error('Failed to fetch customers:', err));
    }, customerSearch ? 300 : 0);
    return () => { if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current); };
  }, [customerSearch]);

  const filteredCustomers = customers;

  /* ── BAR-37: Enhanced carrier detection from tracking number ─────────── */
  const handleTrackingNumberChange = useCallback(
    (value: string) => {
      setTrackingNumber(value);

      if (value.trim().length < 6) {
        setCarrierDetectionResult(null);
        return;
      }

      const result = detectCarrier(value);
      if (result) {
        setCarrierDetectionResult({
          confidence: result.confidence,
          rule: result.matchedRule,
        });
        setSelectedCarrier(result.carrierId);
      } else {
        setCarrierDetectionResult(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ======================================================================== */
  /*  Step 2: Sender autocomplete from history (BAR-239)                      */
  /* ======================================================================== */
  const fetchSenderSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSenderSuggestions([]); return; }
    try {
      const res = await fetch(`/api/packages/senders?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSenderSuggestions(data.senders || []);
      }
    } catch {
      // Fail silently — autocomplete is optional
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSenderSuggestions(senderName);
    }, 200);
    return () => clearTimeout(timer);
  }, [senderName, fetchSenderSuggestions]);

  // Close sender suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (senderRef.current && !senderRef.current.contains(e.target as Node)) {
        setShowSenderSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-suggest carrier from tracking number (BAR-239)
  const suggestCarrierFromTracking = (tracking: string) => {
    const t = tracking.trim().toUpperCase();
    if (t.startsWith('1Z')) return 'ups';
    if (/^TBA/.test(t)) return 'amazon';
    if (/^(FX|[0-9]{12,15}$)/.test(t) && !t.startsWith('9')) return 'fedex';
    if (/^(9[0-9]{15,})$/.test(t) || /^(94|92|93|94|70|71|72|73|74|75|76|77|78|79)/.test(t) && t.length > 18) return 'usps';
    if (/^[0-9]{10}$/.test(t)) return 'dhl';
    if (/^1LS/.test(t)) return 'lasership';
    if (/^C[0-9]{8}/.test(t)) return 'ontrac';
    return '';
  };

  /* ======================================================================== */
  /*  Step 3: Duplicate tracking check (BAR-245)                              */
  /* ======================================================================== */
  const checkDuplicateTracking = useCallback(async (tracking: string) => {
    if (!tracking.trim()) { setDuplicatePackage(null); return; }
    setCheckingTracking(true);
    try {
      const res = await fetch(`/api/packages/check-tracking?tracking=${encodeURIComponent(tracking.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setDuplicatePackage(data.package);
          setShowDuplicateModal(true);
        } else {
          setDuplicatePackage(null);
        }
      }
    } catch {
      // Fail silently
    } finally {
      setCheckingTracking(false);
    }
  }, []);

  // Check tracking when moving to Step 3
  useEffect(() => {
    if (step === 3 && trackingNumber.trim()) {
      checkDuplicateTracking(trackingNumber);
    }
  }, [step, trackingNumber, checkDuplicateTracking]);

  // BAR-245: Show popup when Large/XL selected
  useEffect(() => {
    if ((packageType === 'large' || packageType === 'xlarge') && !sizeWarningAcked) {
      setShowSizeWarning(true);
    }
  }, [packageType, sizeWarningAcked]);

  // BAR-245: Show popup when perishable toggled on
  useEffect(() => {
    if (perishable && !perishableWarningAcked) {
      setShowPerishableWarning(true);
    }
  }, [perishable, perishableWarningAcked]);

  /* ======================================================================== */
  /*  Validation                                                              */
  /* ======================================================================== */
  const canProceed = (() => {
    switch (step) {
      case 1:
        if (packageProgram === 'pmb') {
          return !!selectedCustomer || (isWalkIn && walkInName.trim().length > 0);
        }
        if (packageProgram === 'kinek') {
          return recipientName.trim().length > 0 && /^\d{7}$/.test(kinekNumber.trim());
        }
        // ups_ap, fedex_hal, amazon — just need recipient name
        return recipientName.trim().length > 0;
      case 2:
        return !!selectedCarrier && !!trackingNumber.trim();
      case 3:
        return !!packageType;
      case 4:
        return true;
      default:
        return false;
    }
  })();

  // Handle carrier selection with auto-fill sender
  const handleCarrierSelect = (carrierId: string) => {
    setSelectedCarrier(carrierId);
    setCarrierAutoSuggested(false);
    const autoSender = carrierSenderMap[carrierId];
    if (autoSender) setSenderName(autoSender);
    else setSenderName('');
  };

  // Handle barcode scan (BAR-37 + BAR-240)
  const handleBarcodeScan = useCallback(
    (value: string) => {
      setTrackingNumber(value);
      const result = detectCarrier(value);
      if (result) {
        setCarrierDetectionResult({
          confidence: result.confidence,
          rule: result.matchedRule,
        });
        handleCarrierSelect(result.carrierId);
        // Trigger carrier API enrichment
        fetchCarrierApiData(value, result.carrierId);
      }
    },
    [fetchCarrierApiData] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── Resolve display name & PMB for current recipient ──────────────── */
  const resolveRecipient = useCallback(() => {
    if (packageProgram !== 'pmb') {
      const progLabel = packageProgram === 'ups_ap' ? 'UPS AP'
        : packageProgram === 'fedex_hal' ? 'FedEx HAL'
        : packageProgram === 'kinek' ? 'KINEK'
        : 'Amazon';
      return {
        name: recipientName || 'Unknown',
        pmb: packageProgram === 'kinek' ? kinekNumber : progLabel,
      };
    }
    return {
      name: isWalkIn
        ? walkInName
        : selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : 'Unknown',
      pmb: isWalkIn ? 'WALK-IN' : (selectedCustomer?.pmbNumber || '—'),
    };
  }, [packageProgram, recipientName, kinekNumber, isWalkIn, walkInName, selectedCustomer]);

  /* ── BAR-266: Resolve program type label for label printing ─────────── */
  const resolveProgramType = useCallback((): string => {
    if (packageProgram === 'pmb') {
      if (isWalkIn) return 'Walk-In';
      return selectedCustomer?.platform || 'Store';
    }
    if (packageProgram === 'ups_ap') return 'UPS Access Point';
    if (packageProgram === 'fedex_hal') return 'FedEx HAL';
    if (packageProgram === 'kinek') return 'KINEK';
    if (packageProgram === 'amazon') return 'Amazon Hub';
    return '';
  }, [packageProgram, isWalkIn, selectedCustomer]);

  /* ── BAR-266: Resolve condition display for label ───────────────────── */
  const resolveConditionLabel = useCallback((): string => {
    if (condition === 'other') return conditionOther || 'Other';
    if (condition === 'partially_opened') return 'Partially Opened';
    return condition.charAt(0).toUpperCase() + condition.slice(1);
  }, [condition, conditionOther]);

  /* ── BAR-266: Is this a carrier program (non-PMB, non-KINEK)? ─────── */
  const isCarrierProgram = packageProgram === 'ups_ap' || packageProgram === 'fedex_hal' || packageProgram === 'amazon';

  /* ── BAR-41: Label printing ──────────────────────────────────────────── */
  const addToLabelQueue = useCallback(
    (pkgId: string) => {
      const { name: custName, pmb } = resolveRecipient();

      const newLabel: QueuedLabel = {
        id: `lbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        packageId: pkgId,
        customerName: custName,
        pmbNumber: pmb,
        trackingNumber: trackingNumber || 'N/A',
        carrier: selectedCarrier === 'other'
          ? (customCarrierName || 'Other')
          : (selectedCarrier || 'Unknown'),
        checkedInAt: new Date().toISOString(),
        storeName: 'ShipOS Store',
        programType: resolveProgramType(),
        condition: resolveConditionLabel(),
        perishable,
        isCarrierProgram,
      };

      setLabelQueue((prev) => [...prev, newLabel]);
      return newLabel;
    },
    [resolveRecipient, resolveProgramType, resolveConditionLabel, perishable, isCarrierProgram, trackingNumber, selectedCarrier, customCarrierName]
  );

  const handleAutoprint = useCallback(
    (pkgId: string) => {
      const { name: custName, pmb } = resolveRecipient();
      const carrier = selectedCarrier === 'other'
        ? (customCarrierName || 'Other')
        : (selectedCarrier || 'Unknown');

      const html = renderPackageLabel({
        pmbNumber: pmb,
        customerName: custName,
        trackingNumber: trackingNumber || 'N/A',
        carrier,
        checkedInAt: new Date().toISOString(),
        packageId: pkgId,
        storeName: 'ShipOS Store',
        programType: resolveProgramType(),
        condition: resolveConditionLabel(),
        perishable,
        isCarrierProgram,
      });
      printLabel(html);
    },
    [resolveRecipient, resolveProgramType, resolveConditionLabel, perishable, isCarrierProgram, trackingNumber, selectedCarrier, customCarrierName]
  );

  /* ── BAR-241: Staging / queue jump ───────────────────────────────────── */
  const addToStagingQueue = useCallback(
    (pkgId: string) => {
      const { name: custName, pmb } = resolveRecipient();

      const staging: StagingPackage = {
        id: pkgId,
        trackingNumber: trackingNumber || 'N/A',
        carrier: selectedCarrier || 'unknown',
        customerName: custName,
        pmbNumber: pmb,
        stagingStatus: 'scanned',
        scannedAt: new Date().toISOString(),
      };
      setStagingQueue((prev) => [...prev, staging]);
    },
    [resolveRecipient, trackingNumber, selectedCarrier]
  );

  const handleQueueJump = useCallback(
    (pkg: StagingPackage) => {
      // Mark as labeled in staging queue
      setStagingQueue((prev) =>
        prev.map((p) =>
          p.id === pkg.id ? { ...p, stagingStatus: 'labeled' as const } : p
        )
      );
      // Print label immediately
      const html = renderPackageLabel({
        pmbNumber: pkg.pmbNumber,
        customerName: pkg.customerName,
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        checkedInAt: new Date().toISOString(),
        packageId: pkg.id,
        storeName: 'ShipOS Store',
        programType: resolveProgramType(),
        condition: resolveConditionLabel(),
        perishable,
        isCarrierProgram,
      });
      printLabel(html);
    },
    [resolveProgramType, resolveConditionLabel, perishable, isCarrierProgram]
  );

  const handleQuickRelease = useCallback(
    (pkg: StagingPackage) => {
      // Mark as released — skip notification since customer is present
      setStagingQueue((prev) =>
        prev.map((p) =>
          p.id === pkg.id ? { ...p, stagingStatus: 'released' as const } : p
        )
      );
      logActivity({
        action: 'package.release',
        entityType: 'package',
        entityId: pkg.id,
        entityLabel: pkg.trackingNumber,
        description: `Queue jump: released ${pkg.carrier.toUpperCase()} package to ${pkg.customerName} (${pkg.pmbNumber}) — customer was present during staging`,
        metadata: { queueJump: true, carrier: pkg.carrier },
      });
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleEndBatchSession = useCallback(() => {
    setBatchSessionActive(false);
    // Don't clear staging queue — labels may still need printing
  }, []);

  // Handle submit

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const carrierLabel = selectedCarrier === 'other'
      ? (customCarrierName || 'Other')
      : (selectedCarrier ? selectedCarrier.toUpperCase() : 'Unknown');
    const { name: resolvedName, pmb: resolvedPmb } = resolveRecipient();
    const custLabel = packageProgram === 'pmb'
      ? (isWalkIn
          ? `Walk-in: ${walkInName}`
          : selectedCustomer
            ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.pmbNumber})`
            : '')
      : `${resolvedName} (${resolvedPmb})`;

    try {
      const res = await fetch('/api/packages/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageProgram,
          customerId: selectedCustomer?.id || undefined,
          trackingNumber: trackingNumber || undefined,
          carrier: selectedCarrier === 'other' ? (customCarrierName || 'other') : selectedCarrier,
          senderName: senderName || undefined,
          packageType,
          hazardous,
          perishable,
          condition,
          conditionOther: condition === 'other' ? conditionOther : undefined,
          notes: notes.trim() || null,
          storageLocation: storageLocation.trim() || null,
          requiresSignature,
          storageLocation: storageLocation || undefined,
          notes: notes || undefined,
          isWalkIn: packageProgram === 'pmb' ? isWalkIn : false,
          walkInName: packageProgram === 'pmb' && isWalkIn ? walkInName : undefined,
          recipientName: packageProgram !== 'pmb' ? recipientName : undefined,
          kinekNumber: packageProgram === 'kinek' ? kinekNumber : undefined,
          conditionTags: conditionTags.length > 0 ? conditionTags : undefined,
          customerNote: customerNote || undefined,
          internalNote: internalNote || undefined,
          conditionPhotos: conditionPhotos.length > 0 ? conditionPhotos : undefined,
          sendEmail: printMode === 'batch' ? false : sendEmail, // BAR-41: delay notifications in batch mode
          sendSms: printMode === 'batch' ? false : sendSms,
          printLabel: printLabelEnabled,
          // BAR-240: Include enrichment data
          carrierApiData: carrierApiData ? {
            senderName: carrierApiData.sender?.name,
            senderAddress: carrierApiData.sender?.address,
            recipientName: carrierApiData.recipient?.name,
            recipientAddress: carrierApiData.recipient?.address,
            serviceType: carrierApiData.serviceType,
          } : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check in package');
      }

      // Store the package ID for the success modal
      setCheckedInPackageId(data.package?.id || null);

      // Also log to client-side activity log for immediate UI feedback
      const carrierLabel = selectedCarrier === 'other'
        ? (customCarrierName || 'Other')
        : (selectedCarrier ? selectedCarrier.toUpperCase() : 'Unknown');
      const custLabel = isWalkIn
        ? `Walk-in: ${walkInName}`
        : selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.pmbNumber})`
          : '';

      logActivity({
        action: 'package.check_in',
        entityType: 'package',
        entityId: data.package?.id || `pkg_${Date.now()}`,
        entityLabel: trackingNumber || `${carrierLabel} package`,
        description: `Checked in ${carrierLabel} package for ${custLabel}`,
        metadata: {
          packageProgram,
          carrier: selectedCarrier === 'other' ? customCarrierName : selectedCarrier,
          trackingNumber,
          packageType,
          customerId: selectedCustomer?.id,
          customerName: custLabel,
          recipientName: packageProgram !== 'pmb' ? recipientName : undefined,
          kinekNumber: packageProgram === 'kinek' ? kinekNumber : undefined,
          hazardous,
          perishable,
          requiresSignature,
          storageLocation: storageLocation || undefined,
          isWalkIn: packageProgram === 'pmb' ? isWalkIn : false,
          walkInName: packageProgram === 'pmb' && isWalkIn ? walkInName : undefined,
          notificationSent: data.notification?.sent ?? false,
          printMode,
          carrierDetection: carrierDetectionResult,
          carrierApiEnriched: !!carrierApiData,
        },
      });
    } catch (err) {
      // Log activity with error flag as fallback
      logActivity({
        action: 'package.check_in',
        entityType: 'package',
        entityId: `pkg_${Date.now()}`,
        entityLabel: trackingNumber || `${carrierLabel} package`,
        description: `Checked in ${carrierLabel} package for ${custLabel}`,
        metadata: {
          packageProgram,
          carrier: selectedCarrier === 'other' ? customCarrierName : selectedCarrier,
          trackingNumber,
          packageType,
          customerId: selectedCustomer?.id,
          customerName: custLabel,
          recipientName: packageProgram !== 'pmb' ? recipientName : undefined,
          kinekNumber: packageProgram === 'kinek' ? kinekNumber : undefined,
          apiError: true,
        },
      });
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setSubmitError(message);
      console.error('[CheckIn] Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for new check-in
  const handleReset = () => {
    setStep(1);
    setPackageProgram('pmb');
    setCustomerSearch('');
    setSearchMode('pmb');
    setSelectedCustomer(null);
    setIsWalkIn(false);
    setWalkInName('');
    setRecipientName('');
    setKinekNumber('');
    setSelectedCarrier('');
    setCarrierAutoSuggested(false);
    setCustomCarrierName('');
    setSenderName('');
    setSenderSuggestions([]);
    setPackageType('');
    setTrackingNumber('');
    setHazardous(false);
    setPerishable(false);
    setRequiresSignature(false);
    setCondition('good');
    setConditionOther('');
    setNotes('');
    setStorageLocation('');
    setPrintLabel(true);
    setSendEmail(true);
    setSendSms(true);
    setShowSuccess(false);
    setSubmitError(null);
    setCheckedInPackageId(null);
    setDuplicatePackage(null);
    setSizeWarningAcked(false);
    setPerishableWarningAcked(false);
  };

  // Generate a unique tracking number (BAR-245)
  const handleGenerateTracking = () => {
    const prefix = selectedCarrier ? selectedCarrier.toUpperCase().slice(0, 3) : 'PKG';
    const generated = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setTrackingNumber(generated);
    setDuplicatePackage(null);
    setShowDuplicateModal(false);
  };

  /* ======================================================================== */
  /*  Store badge                                                             */
  /* ======================================================================== */
  const platformColors: Record<string, string> = {
    physical: 'warning',
    iPostal: 'info',
    anytime: 'success',
    postscan: 'warning',
    other: 'default' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check In Package"
        description="Process a new incoming package"
        badge={lastCheckIn ? <PerformedBy entry={lastCheckIn} showAction className="ml-2" /> : undefined}
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

      {/* Step Progress Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => {
                if (s.id < step) setStep(s.id);
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all',
                step === s.id
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : s.id < step
                    ? 'text-emerald-600 cursor-pointer hover:bg-surface-800'
                    : 'text-surface-500 cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  step === s.id
                    ? 'bg-primary-600 text-white'
                    : s.id < step
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-surface-700 text-surface-500'
                )}
              >
                {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-px w-8 sm:w-12',
                  s.id < step ? 'bg-emerald-500/40' : 'bg-surface-700'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card padding="lg">
        {/* ================================================================ */}
        {/*  Step 1: Identify Customer / Recipient (BAR-266 enhanced)        */}
        {/* ================================================================ */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Identify Recipient
              </h2>
              <p className="text-sm text-surface-400">
                Select the package program, then identify the recipient
              </p>
            </div>

            {/* Package Program Selector (BAR-266) */}
            <div>
              <label className="text-sm font-medium text-surface-300 mb-3 block">
                Package Program
              </label>
              <div className="flex flex-wrap gap-2">
                {enabledPrograms.map((prog) => {
                  const isActive = packageProgram === prog.id;
                  return (
                    <button
                      key={prog.id}
                      onClick={() => {
                        setPackageProgram(prog.id);
                        // Reset recipient fields when switching programs
                        setSelectedCustomer(null);
                        setCustomerSearch('');
                        setIsWalkIn(false);
                        setWalkInName('');
                        setRecipientName('');
                        setKinekNumber('');
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                        isActive ? prog.activeColor : prog.color
                      )}
                    >
                      <span>{prog.icon}</span>
                      <span>{prog.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── PMB Flow ─────────────────────────────────────────────── */}
            {packageProgram === 'pmb' && (
              <>
                {/* Walk-in toggle */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/40 border border-surface-700/50 max-w-lg">
                  <input
                    type="checkbox"
                    checked={isWalkIn}
                    onChange={(e) => { setIsWalkIn(e.target.checked); if (!e.target.checked) setWalkInName(''); setSelectedCustomer(null); }}
                    className="h-4 w-4 rounded border-surface-600 text-primary-600 focus:ring-primary-500"
                    id="walk-in-toggle"
                  />
                  <label htmlFor="walk-in-toggle" className="text-sm text-surface-300 cursor-pointer">
                    Walk-in customer (no mailbox)
                  </label>
                </div>

                {isWalkIn ? (
                  <div className="max-w-lg">
                    <label className="text-sm font-medium text-surface-300 mb-2 block">Walk-In Customer Name</label>
                    <Input
                      placeholder="Enter customer name..."
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="!py-3"
                    />
                    {walkInName.trim() && (
                      <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Package will be checked in for walk-in: {walkInName}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Search mode tabs */}
                    <div className="flex gap-1 p-1 bg-surface-800/60 rounded-xl max-w-md">
                      {([
                        { id: 'pmb' as const, label: 'PMB #' },
                        { id: 'name' as const, label: 'Name' },
                        { id: 'phone' as const, label: 'Phone' },
                        { id: 'company' as const, label: 'Company' },
                      ]).map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => { setSearchMode(mode.id); setCustomerSearch(''); }}
                          className={cn(
                            'flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all',
                            searchMode === mode.id
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
                          )}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    <SearchInput
                      placeholder={
                        searchMode === 'pmb' ? 'Enter PMB number or recipient name...' :
                        searchMode === 'name' ? 'Search by first or last name...' :
                        searchMode === 'phone' ? 'Search by phone number...' :
                        'Search by company/business name...'
                      }
                      value={customerSearch}
                      onSearch={setCustomerSearch}
                      className="max-w-lg"
                    />
                  </>
                )}

                {!isWalkIn && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCustomers.map((cust) => {
                      const isSelected = selectedCustomer?.id === cust.id;
                      return (
                        <button
                          key={cust.id}
                          onClick={() => setSelectedCustomer(cust)}
                          className={cn(
                            'flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                            isSelected
                              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                              : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600 hover:bg-surface-800/60'
                          )}
                        >
                          <CustomerAvatar
                            firstName={cust.firstName}
                            lastName={cust.lastName}
                            photoUrl={cust.photoUrl}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-surface-200 text-sm truncate">
                                {cust.firstName} {cust.lastName}
                              </p>
                              <Badge
                                variant={
                                  (platformColors[cust.platform] as 'default' | 'info' | 'success' | 'warning') ||
                                  'default'
                                }
                                dot={false}
                              >
                                {cust.platform}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs font-mono text-primary-600">
                                {cust.pmbNumber}
                              </span>
                              {cust.businessName && (
                                <span className="text-xs text-surface-500 truncate">
                                  {cust.businessName}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <div className="col-span-2 py-12 text-center text-surface-500">
                        <Search className="mx-auto h-8 w-8 mb-3 text-surface-600" />
                        <p>No customers found matching your search</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── UPS AP / FedEx HAL / Amazon Flow (BAR-266) ───────────── */}
            {(packageProgram === 'ups_ap' || packageProgram === 'fedex_hal' || packageProgram === 'amazon') && (
              <div className="max-w-lg space-y-4">
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                  <p className="text-xs text-surface-400 flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    {packageProgram === 'ups_ap' && 'UPS Access Point — transient recipient (no customer profile required)'}
                    {packageProgram === 'fedex_hal' && 'FedEx Hold At Location — transient recipient (no customer profile required)'}
                    {packageProgram === 'amazon' && 'Amazon package — transient recipient (no customer profile required)'}
                  </p>
                </div>
                <div>
                  <Input
                    label="Recipient Name"
                    placeholder="Enter recipient name from package..."
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="!py-3"
                  />
                </div>
                {recipientName.trim() && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Package will be checked in for: {recipientName}
                    <Badge variant="default" dot={false} className="ml-1">
                      {packageProgram === 'ups_ap' ? 'UPS AP' : packageProgram === 'fedex_hal' ? 'FedEx HAL' : 'Amazon'}
                    </Badge>
                  </p>
                )}
              </div>
            )}

            {/* ── KINEK Flow (BAR-266) ─────────────────────────────────── */}
            {packageProgram === 'kinek' && (
              <div className="max-w-lg space-y-4">
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/50">
                  <p className="text-xs text-surface-400 flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    KINEK network — recipient identified by 7-digit KINEK number
                  </p>
                </div>
                <div>
                  <Input
                    label="Recipient Name"
                    placeholder="Enter recipient name from package..."
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="!py-3"
                  />
                </div>
                <div>
                  <Input
                    label="KINEK Number"
                    placeholder="Enter 7-digit KINEK number..."
                    value={kinekNumber}
                    onChange={(e) => {
                      // Only allow digits, max 7
                      const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                      setKinekNumber(val);
                    }}
                    className="!py-3 font-mono"
                  />
                  {kinekNumber.length > 0 && kinekNumber.length < 7 && (
                    <p className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      KINEK number must be 7 digits ({kinekNumber.length}/7)
                    </p>
                  )}
                  {kinekNumber.length === 7 && (
                    <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid KINEK number
                    </p>
                  )}
                </div>
                {recipientName.trim() && kinekNumber.length === 7 && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Package will be checked in for: {recipientName}
                    <Badge variant="default" dot={false} className="ml-1">KINEK #{kinekNumber}</Badge>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/*  Step 2: Carrier & Sender                                        */}
        {/* ================================================================ */}
        {step === 2 && (
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
              <Input
                label="Tracking Number"
                placeholder="Enter or scan tracking number"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  const suggested = suggestCarrierFromTracking(e.target.value);
                  if (suggested && !selectedCarrier) {
                    setSelectedCarrier(suggested);
                    setCarrierAutoSuggested(true);
                    const autoSender = carrierSenderMap[suggested];
                    if (autoSender) setSenderName(autoSender);
                  }
                }}
                leftIcon={<ScanBarcode className="h-5 w-5" />}
                className="!py-3"
              />
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
        )}

        {/* ================================================================ */}
        {/*  Step 3: Package Details                                         */}
        {/* ================================================================ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Package Details
              </h2>
              <p className="text-sm text-surface-400">
                Describe the package characteristics
              </p>
            </div>

            {/* Duplicate tracking warning (BAR-245) */}
            {duplicatePackage && !showDuplicateModal && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Duplicate tracking number detected</p>
                  <p className="text-xs text-surface-400 mt-1">
                    This tracking number is already assigned to a package for {duplicatePackage.customerName} ({duplicatePackage.customerPmb})
                  </p>
                </div>
              </div>
            )}

            {/* Package Type Selector */}
            <div>
              <label className="text-sm font-medium text-surface-300 mb-3 block">
                Package Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {packageTypeOptions.map((pt) => {
                  const isActive = packageType === pt.id;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => setPackageType(pt.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all',
                        isActive
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                          : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600'
                      )}
                    >
                      <span className="text-2xl">{pt.icon}</span>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isActive ? 'text-primary-600' : 'text-surface-300'
                        )}
                      >
                        {pt.label}
                      </span>
                      <span className="text-[10px] text-surface-500">
                        {pt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4">
              <ToggleSwitch
                label="Hazardous Materials"
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                checked={hazardous}
                onChange={setHazardous}
              />
              <ToggleSwitch
                label="Perishable"
                icon={<Snowflake className="h-4 w-4 text-blue-600" />}
                checked={perishable}
                onChange={(val) => {
                  setPerishable(val);
                  if (!val) setPerishableWarningAcked(false);
                }}
              />
              <ToggleSwitch
                label="Requires Signature"
                icon={<CheckCircle2 className="h-4 w-4 text-purple-500" />}
                checked={requiresSignature}
                onChange={setRequiresSignature}
              />
            </div>

            {/* Conditional inline alerts (kept for reference even with modals) */}
            {(hazardous || perishable) && (
              <div className={cn(
                'p-4 rounded-xl border space-y-2',
                hazardous
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-blue-500/5 border-blue-500/20'
              )}>
                {hazardous && (
                  <div className="flex items-center gap-2 text-sm text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span><strong>Hazardous Materials:</strong> Package must be stored in hazmat-designated area. Notify manager on duty.</span>
                  </div>
                )}
                {perishable && (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Snowflake className="h-4 w-4 shrink-0" />
                    <span><strong>Perishable:</strong> Customer will receive an urgent notification. Package should be released within 24 hours.</span>
                  </div>
                )}
              </div>
            )}

            {/* Condition */}
            <div className="max-w-xs">
              <Select
                label="Condition"
                value={condition}
                onChange={(e) => {
                  setCondition(e.target.value);
                  if (e.target.value !== 'other') setConditionOther('');
                }}
                options={[
                  { value: 'good', label: 'Good' },
                  { value: 'damaged', label: 'Damaged' },
                  { value: 'wet', label: 'Wet' },
                  { value: 'opened', label: 'Opened' },
                  { value: 'partially_opened', label: 'Partially Opened' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>

            {condition === 'other' && (
              <div className="max-w-lg">
                <Input
                  label="Describe Condition"
                  placeholder="Describe the condition of the package..."
                  value={conditionOther}
                  onChange={(e) => setConditionOther(e.target.value)}
                />
              </div>
            )}

            {/* Storage Location */}
            <div className="max-w-lg">
              <Input
                label="Storage Location"
                placeholder="e.g. Shelf A3, Bin 12, Rack B-2..."
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                helperText="Where this package will be stored in your facility"
              />
            </div>

            {/* Notes */}
            <div className="max-w-lg">
              <Textarea
                label="Notes"
                placeholder="Any special handling instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/*  Step 4: Confirm & Notify                                        */}
        {/* ================================================================ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Confirm & Notify
              </h2>
              <p className="text-sm text-surface-400">
                Review the information and select notification options
              </p>
            </div>

            {/* Summary Card */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                Package Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SummaryField
                  label="Customer"
                  value={
                    selectedCustomer
                      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                      : isWalkIn ? walkInName : '—'
                  }
                />
                <SummaryField
                  label="PMB"
                  value={isWalkIn ? 'Walk-In' : (selectedCustomer?.pmbNumber || '—')}
                  mono
                />
                <SummaryField
                  label="Store"
                  value={isWalkIn ? '—' : (selectedCustomer?.platform || '—')}
                />
                <SummaryField
                  label="Carrier"
                  value={
                    carrierOptions.find((c) => c.id === selectedCarrier)
                      ?.label || '—'
                  }
                />
                <SummaryField
                  label="Sender"
                  value={senderName || '—'}
                />
                <SummaryField
                  label="Package Type"
                  value={
                    packageTypeOptions.find((p) => p.id === packageType)
                      ?.label || '—'
                  }
                />
                <SummaryField
                  label="Tracking #"
                  value={trackingNumber || 'Not provided'}
                  mono
                />
                <SummaryField
                  label="Condition"
                  value={
                    condition === 'other'
                      ? conditionOther
                        ? `Other — ${conditionOther}`
                        : 'Other'
                      : condition === 'partially_opened'
                        ? 'Partially Opened'
                        : condition.charAt(0).toUpperCase() + condition.slice(1)
                  }
                />
                <SummaryField
                  label="Special"
                  value={
                    [hazardous && 'Hazardous', perishable && 'Perishable', requiresSignature && 'Signature Required']
                      .filter(Boolean)
                      .join(', ') || 'None'
                  }
                />
                {storageLocation && (
                  <SummaryField
                    label="Storage Location"
                    value={storageLocation}
                  />
                )}
              </div>
              {notes && (
                <div className="pt-3 border-t border-surface-800">
                  <SummaryField label="Notes" value={notes} />
                </div>
              )}
            </div>

            {/* Notification Preview */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                Notification Settings
              </h3>

              {selectedCustomer?.email && (
                <div className="flex items-center gap-3 text-sm text-surface-400">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>
                    Email will be sent to{' '}
                    <span className="text-surface-200">
                      {selectedCustomer.email}
                    </span>
                  </span>
                </div>
              )}
              {selectedCustomer?.phone && (
                <div className="flex items-center gap-3 text-sm text-surface-400">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>
                    SMS will be sent to{' '}
                    <span className="text-surface-200">
                      {selectedCustomer.phone}
                    </span>
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <CheckboxOption
                  label="Print shelf label"
                  checked={printLabel}
                  onChange={setPrintLabel}
                  icon={<Printer className="h-4 w-4" />}
                />
                <CheckboxOption
                  label="Send email notification"
                  checked={sendEmail}
                  onChange={setSendEmail}
                  icon={<Mail className="h-4 w-4" />}
                  disabled={!selectedCustomer?.notifyEmail}
                />
                <CheckboxOption
                  label="Send SMS notification"
                  checked={sendSms}
                  onChange={setSendSms}
                  icon={<MessageSquare className="h-4 w-4" />}
                  disabled={!selectedCustomer?.notifySms}
                />
              </div>
            </div>

            {/* Submit Error (BAR-260) */}
            {submitError && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Check-in failed</p>
                  <p className="text-xs text-surface-400 mt-1">{submitError}</p>
                  <button
                    onClick={() => setSubmitError(null)}
                    className="text-xs text-primary-400 hover:text-primary-300 underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-surface-800">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          <span className="text-xs text-surface-500">
            Step {step} of {STEPS.length}
          </span>
          {step < 4 ? (
            <Button
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
            >
              Next
            </Button>
          ) : (
            <Button
              leftIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Check In Package'}
            </Button>
          )}
        </div>
      </Card>

      {/* ================================================================== */}
      {/*  BAR-245: Size Warning Modal (Large / Extra Large)                  */}
      {/* ================================================================== */}
      <Modal
        open={showSizeWarning}
        onClose={() => { setShowSizeWarning(false); setSizeWarningAcked(true); }}
        title="Large Package Notice"
        size="sm"
        footer={
          <Button onClick={() => { setShowSizeWarning(false); setSizeWarningAcked(true); }}>
            OK
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mb-4">
            <Package className="h-7 w-7 text-amber-600" />
          </div>
          <p className="text-sm text-surface-300 max-w-xs">
            This customer will be notified this package will accrue <strong className="text-surface-100">storage fees</strong> after the free storage period ends.
          </p>
          <p className="mt-3 text-xs text-surface-500 max-w-xs">
            The notification will include: &ldquo;Due to its size, this package will accrue storage fees of $1/day if not picked up within 30 days of receipt.&rdquo;
          </p>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  BAR-245: Perishable Warning Modal                                  */}
      {/* ================================================================== */}
      <Modal
        open={showPerishableWarning}
        onClose={() => { setShowPerishableWarning(false); setPerishableWarningAcked(true); }}
        title="Perishable Package Notice"
        size="sm"
        footer={
          <Button onClick={() => { setShowPerishableWarning(false); setPerishableWarningAcked(true); }}>
            OK
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 mb-4">
            <Snowflake className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-sm text-surface-300 max-w-xs">
            This customer will be notified this package <strong className="text-surface-100">must be picked up within 24 hours</strong>.
          </p>
          <p className="mt-3 text-xs text-surface-500 max-w-xs">
            The notification will include: &ldquo;This package contains perishable goods. Please pick up within 24 hours or it may be disposed of.&rdquo;
          </p>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  BAR-245: Duplicate Tracking Number Modal                           */}
      {/* ================================================================== */}
      <Modal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Tracking Number Already Exists"
        size="sm"
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="secondary"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => {
                setShowDuplicateModal(false);
                window.open(`/dashboard/packages?id=${duplicatePackage?.id}`, '_blank');
              }}
            >
              View Package
            </Button>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setShowDuplicateModal(false);
                setTrackingNumber('');
                setDuplicatePackage(null);
              }}
            >
              Try Again
            </Button>
            <Button
              leftIcon={<Hash className="h-4 w-4" />}
              onClick={handleGenerateTracking}
            >
              Generate Tracking Number
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <p className="text-sm text-surface-300 mb-2">
            This package already exists in inventory
          </p>
          {duplicatePackage && (
            <div className="bg-surface-800/60 rounded-lg p-3 w-full text-left text-xs space-y-1 mt-2">
              <div className="flex justify-between">
                <span className="text-surface-500">Tracking:</span>
                <span className="font-mono text-surface-300">{duplicatePackage.trackingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Customer:</span>
                <span className="text-surface-300">{duplicatePackage.customerName} ({duplicatePackage.customerPmb})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Status:</span>
                <span className="text-surface-300 capitalize">{duplicatePackage.status.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Checked In:</span>
                <span className="text-surface-300">{new Date(duplicatePackage.checkedInAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  Success Modal                                                      */}
      {/* ================================================================== */}
      <Modal
        open={showSuccess}
        onClose={handleReset}
        title="Package Checked In"
        size="sm"
        persistent
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = checkedInPackageId
                ? `/dashboard/packages?id=${checkedInPackageId}`
                : '/dashboard/packages')}
            >
              View Package
            </Button>
            <Button onClick={handleReset}>Check In Another</Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-surface-100 mb-1">
            Successfully Checked In!
          </h3>
          <p className="text-sm text-surface-400 max-w-xs">
            Package for{' '}
            <span className="text-surface-200 font-medium">
              {isWalkIn
                ? walkInName
                : selectedCustomer
                  ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                  : ''
              }
            </span>{' '}
            {!isWalkIn && selectedCustomer?.pmbNumber ? `(${selectedCustomer.pmbNumber}) ` : ''}
            has been checked in
            {(sendEmail || sendSms) ? ' and notifications have been sent.' : '.'}
          </p>
          {trackingNumber && (
            <p className="mt-3 font-mono text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
              {trackingNumber}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */
function ToggleSwitch({
  label,
  icon,
  checked,
  onChange }: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-all',
        checked
          ? 'border-primary-300 bg-primary-50 text-primary-600'
          : 'border-surface-700/50 bg-surface-900/60 text-surface-400 hover:border-surface-600'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <div
        className={cn(
          'ml-2 relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-surface-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
    </button>
  );
}

function CheckboxOption({
  label,
  checked,
  onChange,
  icon,
  disabled }: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 text-sm cursor-pointer',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
          checked
            ? 'bg-primary-600 border-primary-500 text-surface-100'
            : 'bg-surface-900 border-surface-600 text-transparent'
        )}
      >
        <Check className="h-3 w-3" />
      </button>
      {icon && <span className="text-surface-500">{icon}</span>}
      <span className="text-surface-300">{label}</span>
    </label>
  );
}

function SummaryField({
  label,
  value,
  mono }: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-surface-500 mb-0.5">
        {label}
      </p>
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
