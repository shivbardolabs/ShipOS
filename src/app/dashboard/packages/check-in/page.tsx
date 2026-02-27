'use client';

import { useState, useMemo, useCallback } from 'react';
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
  Loader2,
  Globe,
  Layers,
  Settings,
} from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { PerformedBy } from '@/components/ui/performed-by';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { ConditionNotes } from '@/components/packages/condition-notes';
import { LabelPrintQueue } from '@/components/packages/label-print-queue';
import { BatchCheckinBar } from '@/components/packages/batch-checkin-bar';
import { QueueJumpModal } from '@/components/packages/queue-jump-modal';
import { useActivityLog } from '@/components/activity-log-provider';
import { detectCarrier } from '@/lib/carrier-detection';
import { ENRICHABLE_CARRIERS } from '@/lib/carrier-api';
import { printLabel, renderPackageLabel } from '@/lib/labels';
import { customers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { Customer, ConditionTag } from '@/lib/types';
import type { QueuedLabel, PrintMode } from '@/components/packages/label-print-queue';
import type { StagingPackage } from '@/components/packages/queue-jump-modal';
import type { CarrierTrackingData } from '@/lib/carrier-api';

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
  other: '',
};

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
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function CheckInPage() {
  const [step, setStep] = useState(1);

  // Step 1 — Customer (BAR-38: enhanced lookup)
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'pmb' | 'name' | 'phone' | 'company'>('pmb');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');

  // Step 2 — Carrier (BAR-37: enhanced auto-detect, BAR-240: API enrichment)
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [senderName, setSenderName] = useState('');
  const [customCarrierName, setCustomCarrierName] = useState('');
  const [carrierDetectionResult, setCarrierDetectionResult] = useState<{
    confidence: string;
    rule: string;
  } | null>(null);
  const [carrierApiData, setCarrierApiData] = useState<CarrierTrackingData | null>(null);
  const [carrierApiLoading, setCarrierApiLoading] = useState(false);

  // Step 3 — Package Details
  const [packageType, setPackageType] = useState('');
  const [hazardous, setHazardous] = useState(false);
  const [perishable, setPerishable] = useState(false);
  const [condition, setCondition] = useState('good');
  const [conditionOther, setConditionOther] = useState('');
  const [notes, setNotes] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [requiresSignature, setRequiresSignature] = useState(false);

  // BAR-39: Condition Notes & Annotations
  const [conditionTags, setConditionTags] = useState<ConditionTag[]>([]);
  const [customerNote, setCustomerNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [conditionPhotos, setConditionPhotos] = useState<string[]>([]);

  // Step 4 — Notify & Print
  const [printLabelEnabled, setPrintLabelEnabled] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);

  // BAR-41: Print mode & queue
  const [printMode, setPrintMode] = useState<PrintMode>('per-package');
  const [labelQueue, setLabelQueue] = useState<QueuedLabel[]>([]);
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  // BAR-241: Batch session & queue jump
  const [batchSessionActive, setBatchSessionActive] = useState(false);
  const [stagingQueue, setStagingQueue] = useState<StagingPackage[]>([]);
  const [showQueueJump, setShowQueueJump] = useState(false);

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.filter((c) => c.status === 'active').slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.status === 'active' &&
          (c.firstName.toLowerCase().includes(q) ||
            c.lastName.toLowerCase().includes(q) ||
            c.pmbNumber.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.businessName?.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [customerSearch]);

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
        // Auto-select carrier if none is selected or if high confidence
        if (!selectedCarrier || result.confidence === 'high') {
          handleCarrierSelect(result.carrierId);
        }
      } else {
        setCarrierDetectionResult(null);
      }
    },
    [selectedCarrier] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── BAR-240: Carrier API enrichment ─────────────────────────────────── */
  const fetchCarrierApiData = useCallback(
    async (tracking: string, carrier: string) => {
      if (!ENRICHABLE_CARRIERS.includes(carrier)) return;
      if (!tracking.trim() || tracking.length < 8) return;

      setCarrierApiLoading(true);
      try {
        const res = await fetch('/api/packages/carrier-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingNumber: tracking, carrier }),
        });
        const result = await res.json();
        if (result.success && result.data) {
          setCarrierApiData(result.data);
          // Auto-fill sender name from API data
          if (result.data.sender?.name && !senderName) {
            setSenderName(result.data.sender.name);
          }
          if (result.data.sender?.company && !senderName) {
            setSenderName(result.data.sender.company);
          }
        }
      } catch {
        // Graceful fallback — don't block the flow
      } finally {
        setCarrierApiLoading(false);
      }
    },
    [senderName]
  );

  // Validation per step
  const canProceed = (() => {
    switch (step) {
      case 1:
        return !!selectedCustomer || (isWalkIn && walkInName.trim().length > 0);
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
    const autoSender = carrierSenderMap[carrierId];
    if (autoSender) setSenderName(autoSender);
    else if (!senderName) setSenderName('');
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

  /* ── BAR-41: Label printing ──────────────────────────────────────────── */
  const addToLabelQueue = useCallback(
    (pkgId: string) => {
      const custName = isWalkIn
        ? walkInName
        : selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : 'Unknown';
      const pmb = isWalkIn ? 'WALK-IN' : (selectedCustomer?.pmbNumber || '—');

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
      };

      setLabelQueue((prev) => [...prev, newLabel]);
      return newLabel;
    },
    [isWalkIn, walkInName, selectedCustomer, trackingNumber, selectedCarrier, customCarrierName]
  );

  const handleAutoprint = useCallback(
    (pkgId: string) => {
      const custName = isWalkIn
        ? walkInName
        : selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : 'Unknown';
      const pmb = isWalkIn ? 'WALK-IN' : (selectedCustomer?.pmbNumber || '—');
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
      });
      printLabel(html);
    },
    [isWalkIn, walkInName, selectedCustomer, trackingNumber, selectedCarrier, customCarrierName]
  );

  /* ── BAR-241: Staging / queue jump ───────────────────────────────────── */
  const addToStagingQueue = useCallback(
    (pkgId: string) => {
      const custName = isWalkIn
        ? walkInName
        : selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : 'Unknown';
      const pmb = isWalkIn ? 'WALK-IN' : (selectedCustomer?.pmbNumber || '—');

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
    [isWalkIn, walkInName, selectedCustomer, trackingNumber, selectedCarrier]
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
      });
      printLabel(html);
    },
    []
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
  const { log: logActivity, lastActionByVerb } = useActivityLog();
  const lastCheckIn = lastActionByVerb('package.check_in');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const carrierLabel = selectedCarrier === 'other'
      ? (customCarrierName || 'Other')
      : (selectedCarrier ? selectedCarrier.toUpperCase() : 'Unknown');
    const custLabel = isWalkIn
      ? `Walk-in: ${walkInName}`
      : selectedCustomer
        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.pmbNumber})`
        : '';

    try {
      const res = await fetch('/api/packages/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id || undefined,
          trackingNumber: trackingNumber || undefined,
          carrier: selectedCarrier === 'other' ? (customCarrierName || 'other') : selectedCarrier,
          senderName: senderName || undefined,
          packageType,
          condition,
          hazardous,
          perishable,
          requiresSignature,
          storageLocation: storageLocation || undefined,
          notes: notes || undefined,
          isWalkIn,
          walkInName: isWalkIn ? walkInName : undefined,
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
      const entityId = data.package?.id || `pkg_${Date.now()}`;

      // BAR-41: Handle printing based on mode
      if (printLabelEnabled) {
        if (printMode === 'per-package') {
          handleAutoprint(entityId);
        } else {
          addToLabelQueue(entityId);
        }
      }

      // BAR-241: Add to staging queue if batch session is active
      if (batchSessionActive) {
        addToStagingQueue(entityId);
      }

      logActivity({
        action: 'package.check_in',
        entityType: 'package',
        entityId,
        entityLabel: trackingNumber || `${carrierLabel} package`,
        description: `Checked in ${carrierLabel} package for ${custLabel}`,
        metadata: {
          carrier: selectedCarrier === 'other' ? customCarrierName : selectedCarrier,
          trackingNumber,
          packageType,
          customerId: selectedCustomer?.id,
          customerName: custLabel,
          hazardous,
          perishable,
          requiresSignature,
          storageLocation: storageLocation || undefined,
          isWalkIn,
          walkInName: isWalkIn ? walkInName : undefined,
          notificationSent: data.notification?.sent ?? false,
          printMode,
          carrierDetection: carrierDetectionResult,
          carrierApiEnriched: !!carrierApiData,
        },
      });
    } catch {
      logActivity({
        action: 'package.check_in',
        entityType: 'package',
        entityId: `pkg_${Date.now()}`,
        entityLabel: trackingNumber || `${carrierLabel} package`,
        description: `Checked in ${carrierLabel} package for ${custLabel}`,
        metadata: {
          carrier: selectedCarrier === 'other' ? customCarrierName : selectedCarrier,
          trackingNumber,
          packageType,
          customerId: selectedCustomer?.id,
          customerName: custLabel,
          apiError: true,
        },
      });
    } finally {
      setIsSubmitting(false);
      setShowSuccess(true);
    }
  };

  // Reset for new check-in
  const handleReset = () => {
    setStep(1);
    setCustomerSearch('');
    setSearchMode('pmb');
    setSelectedCustomer(null);
    setIsWalkIn(false);
    setWalkInName('');
    setSelectedCarrier('');
    setCustomCarrierName('');
    setSenderName('');
    setPackageType('');
    setTrackingNumber('');
    setHazardous(false);
    setPerishable(false);
    setRequiresSignature(false);
    setCondition('good');
    setConditionOther('');
    setNotes('');
    setStorageLocation('');
    setConditionTags([]);
    setCustomerNote('');
    setInternalNote('');
    setConditionPhotos([]);
    setPrintLabelEnabled(true);
    setSendEmail(true);
    setSendSms(true);
    setShowSuccess(false);
    setCarrierDetectionResult(null);
    setCarrierApiData(null);
    // Don't reset labelQueue, stagingQueue, or batchSessionActive — those persist across check-ins
  };

  /* ── Platform badge colors ──────────────────────────────────────────── */
  const platformColors: Record<string, string> = {
    physical: 'warning',
    iPostal: 'info',
    anytime: 'success',
    postscan: 'warning',
    other: 'default',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check In Package"
        description="Process a new incoming package"
        badge={lastCheckIn ? <PerformedBy entry={lastCheckIn} showAction className="ml-2" /> : undefined}
        actions={
          <div className="flex items-center gap-2">
            {/* BAR-41: Print Settings toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrintSettings(true)}
              leftIcon={<Settings className="h-4 w-4" />}
            >
              Print: {printMode === 'per-package' ? 'Auto' : 'Batch'}
            </Button>
            {/* BAR-241: Start/resume batch session */}
            {!batchSessionActive && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBatchSessionActive(true)}
                leftIcon={<Layers className="h-4 w-4" />}
              >
                Start Batch Session
              </Button>
            )}
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => (window.location.href = '/dashboard/packages')}
            >
              Back to Packages
            </Button>
          </div>
        }
      />

      {/* BAR-241: Batch Session Bar */}
      <BatchCheckinBar
        isActive={batchSessionActive}
        stagedCount={stagingQueue.filter((p) => p.stagingStatus !== 'released').length}
        labelQueueCount={labelQueue.length}
        onQueueJump={() => setShowQueueJump(true)}
        onEndSession={handleEndBatchSession}
      />

      {/* BAR-41: Label Print Queue (visible in batch mode) */}
      <LabelPrintQueue
        queue={labelQueue}
        printMode={printMode}
        onRemoveFromQueue={(id) =>
          setLabelQueue((prev) => prev.filter((l) => l.id !== id))
        }
        onBatchPrintComplete={() => setLabelQueue([])}
        onClearQueue={() => setLabelQueue([])}
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
        {/*  Step 1: Identify Customer                                       */}
        {/* ================================================================ */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-surface-100 mb-1">
                Identify Customer
              </h2>
              <p className="text-sm text-surface-400">
                Search by PMB number, name, phone, or company — or check in for a walk-in customer
              </p>
            </div>

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
                    searchMode === 'pmb' ? 'Enter PMB number (e.g. PMB-0003)...' :
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
          </div>
        )}

        {/* ================================================================ */}
        {/*  Step 2: Carrier & Sender (BAR-37 + BAR-240 enhanced)            */}
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

            {/* Tracking Number */}
            <div className="max-w-lg">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Tracking Number"
                    placeholder="Enter or scan tracking number"
                    value={trackingNumber}
                    onChange={(e) => handleTrackingNumberChange(e.target.value)}
                    leftIcon={<ScanBarcode className="h-5 w-5" />}
                    className="!py-3"
                  />
                </div>
                <BarcodeScanner onScan={handleBarcodeScan} />
              </div>

              {/* BAR-37: Detection result feedback */}
              {trackingNumber.trim() && carrierDetectionResult && (
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <CheckCircle2 className={cn(
                    'h-3.5 w-3.5',
                    carrierDetectionResult.confidence === 'high'
                      ? 'text-emerald-400'
                      : carrierDetectionResult.confidence === 'medium'
                        ? 'text-blue-400'
                        : 'text-amber-400'
                  )} />
                  <span className={cn(
                    carrierDetectionResult.confidence === 'high'
                      ? 'text-emerald-400'
                      : carrierDetectionResult.confidence === 'medium'
                        ? 'text-blue-400'
                        : 'text-amber-400'
                  )}>
                    Auto-detected: {selectedCarrier.toUpperCase()}
                  </span>
                  <Badge
                    variant={
                      carrierDetectionResult.confidence === 'high'
                        ? 'success'
                        : carrierDetectionResult.confidence === 'medium'
                          ? 'info'
                          : 'warning'
                    }
                  >
                    {carrierDetectionResult.confidence} confidence
                  </Badge>
                </div>
              )}
              {trackingNumber.trim() && !carrierDetectionResult && !selectedCarrier && (
                <p className="mt-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Could not auto-detect carrier — please select below
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
                        isActive ? carrier.active : carrier.color
                      )}
                    >
                      <CarrierLogo carrier={carrier.id} size={28} />
                      <span className="text-xs font-medium opacity-80">{carrier.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom carrier name */}
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

            {/* BAR-240: Carrier API enrichment button + results */}
            {ENRICHABLE_CARRIERS.includes(selectedCarrier) && trackingNumber.trim().length >= 8 && (
              <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-surface-300">
                      Carrier Data Enrichment
                    </span>
                  </div>
                  {!carrierApiData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCarrierApiData(trackingNumber, selectedCarrier)}
                      disabled={carrierApiLoading}
                      leftIcon={carrierApiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                    >
                      {carrierApiLoading ? 'Looking up…' : 'Look Up Sender'}
                    </Button>
                  )}
                  {carrierApiData && !carrierApiData.error && (
                    <Badge variant="success" dot>Enriched</Badge>
                  )}
                </div>

                {carrierApiData && !carrierApiData.error && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-800">
                    {carrierApiData.sender?.name && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-surface-500">Sender</p>
                        <p className="text-sm text-surface-200">{carrierApiData.sender.name}</p>
                        {carrierApiData.sender.city && (
                          <p className="text-xs text-surface-400">
                            {carrierApiData.sender.city}{carrierApiData.sender.state ? `, ${carrierApiData.sender.state}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {carrierApiData.recipient?.name && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-surface-500">Recipient</p>
                        <p className="text-sm text-surface-200">{carrierApiData.recipient.name}</p>
                        {carrierApiData.recipient.city && (
                          <p className="text-xs text-surface-400">
                            {carrierApiData.recipient.city}{carrierApiData.recipient.state ? `, ${carrierApiData.recipient.state}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                    {carrierApiData.serviceType && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-surface-500">Service</p>
                        <p className="text-sm text-surface-200">{carrierApiData.serviceType}</p>
                      </div>
                    )}
                    {carrierApiData.status && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-surface-500">Status</p>
                        <p className="text-sm text-surface-200">{carrierApiData.status}</p>
                      </div>
                    )}
                    {carrierApiData.fromCache && (
                      <p className="col-span-2 text-[10px] text-surface-500">Data from cache</p>
                    )}
                  </div>
                )}

                {carrierApiData?.error && (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {carrierApiData.error}
                  </p>
                )}
              </div>
            )}

            {/* Sender Name */}
            <div className="max-w-md">
              <Input
                label="Sender Name"
                placeholder="e.g. Amazon.com, John Smith"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
              {carrierApiData?.sender?.name && senderName === carrierApiData.sender.name && (
                <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Auto-filled from carrier API
                </p>
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
                      <span className={cn(
                        'text-sm font-medium',
                        isActive ? 'text-primary-600' : 'text-surface-300'
                      )}>
                        {pt.label}
                      </span>
                      <span className="text-[10px] text-surface-500">{pt.desc}</span>
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
                onChange={setPerishable}
              />
              <ToggleSwitch
                label="Requires Signature"
                icon={<CheckCircle2 className="h-4 w-4 text-purple-500" />}
                checked={requiresSignature}
                onChange={setRequiresSignature}
              />
            </div>

            {/* Conditional alerts */}
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

            {/* BAR-39: Package Condition Notes */}
            <div className="border-t border-surface-800 pt-4">
              <ConditionNotes
                selectedTags={conditionTags}
                customerNote={customerNote}
                internalNote={internalNote}
                photos={conditionPhotos}
                onTagsChange={setConditionTags}
                onCustomerNoteChange={setCustomerNote}
                onInternalNoteChange={setInternalNote}
                onPhotosChange={setConditionPhotos}
              />
            </div>

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
                label="General Notes"
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

              {/* BAR-37: Detection info */}
              {carrierDetectionResult && (
                <div className="pt-3 border-t border-surface-800">
                  <SummaryField
                    label="Carrier Detection"
                    value={`Auto-detected (${carrierDetectionResult.confidence} confidence)`}
                  />
                </div>
              )}

              {/* BAR-240: Enrichment info */}
              {carrierApiData && !carrierApiData.error && (
                <div className="pt-3 border-t border-surface-800 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Carrier API Data
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {carrierApiData.sender?.name && (
                      <SummaryField label="API Sender" value={carrierApiData.sender.name} />
                    )}
                    {carrierApiData.recipient?.name && (
                      <SummaryField label="API Recipient" value={carrierApiData.recipient.name} />
                    )}
                    {carrierApiData.serviceType && (
                      <SummaryField label="Service Type" value={carrierApiData.serviceType} />
                    )}
                  </div>
                </div>
              )}

              {(conditionTags.length > 0 || customerNote || internalNote) && (
                <div className="pt-3 border-t border-surface-800 space-y-2">
                  {conditionTags.length > 0 && (
                    <SummaryField label="Condition Tags" value={conditionTags.join(', ')} />
                  )}
                  {customerNote && (
                    <SummaryField label="Customer Note" value={customerNote} />
                  )}
                  {internalNote && (
                    <SummaryField label="Internal Note (Staff Only)" value={internalNote} />
                  )}
                  {conditionPhotos.length > 0 && (
                    <SummaryField label="Condition Photos" value={`${conditionPhotos.length} photo(s) attached`} />
                  )}
                </div>
              )}
              {notes && (
                <div className="pt-3 border-t border-surface-800">
                  <SummaryField label="Notes" value={notes} />
                </div>
              )}
            </div>

            {/* Notification & Print Settings */}
            <div className="rounded-xl border border-surface-700/50 bg-surface-900/60 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
                Notification & Print Settings
              </h3>

              {/* BAR-41: Print mode indicator */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/40 border border-surface-700/30">
                <Printer className="h-4 w-4 text-surface-400" />
                <div className="flex-1">
                  <p className="text-sm text-surface-300">
                    Print Mode: <span className="font-medium text-surface-200">
                      {printMode === 'per-package' ? 'Auto Print (per package)' : 'Batch Queue'}
                    </span>
                  </p>
                  <p className="text-xs text-surface-500">
                    {printMode === 'per-package'
                      ? 'Label will print immediately on check-in'
                      : `Label will be added to queue (${labelQueue.length} currently queued)`}
                  </p>
                </div>
                {printMode === 'batch' && labelQueue.length > 0 && (
                  <Badge variant="info">{labelQueue.length} queued</Badge>
                )}
              </div>

              {/* Batch mode notification delay warning */}
              {printMode === 'batch' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">
                    <strong>Batch mode:</strong> Customer notifications will be delayed until labels are printed.
                  </p>
                </div>
              )}

              {selectedCustomer?.email && (
                <div className="flex items-center gap-3 text-sm text-surface-400">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>
                    Email will be sent to{' '}
                    <span className="text-surface-200">{selectedCustomer.email}</span>
                  </span>
                </div>
              )}
              {selectedCustomer?.phone && (
                <div className="flex items-center gap-3 text-sm text-surface-400">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span>
                    SMS will be sent to{' '}
                    <span className="text-surface-200">{selectedCustomer.phone}</span>
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <CheckboxOption
                  label={printMode === 'batch' ? 'Add to print queue' : 'Print shelf label'}
                  checked={printLabelEnabled}
                  onChange={setPrintLabelEnabled}
                  icon={<Printer className="h-4 w-4" />}
                />
                <CheckboxOption
                  label="Send email notification"
                  checked={sendEmail}
                  onChange={setSendEmail}
                  icon={<Mail className="h-4 w-4" />}
                  disabled={!selectedCustomer?.notifyEmail || printMode === 'batch'}
                />
                <CheckboxOption
                  label="Send SMS notification"
                  checked={sendSms}
                  onChange={setSendSms}
                  icon={<MessageSquare className="h-4 w-4" />}
                  disabled={!selectedCustomer?.notifySms || printMode === 'batch'}
                />
              </div>
            </div>
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
              onClick={() => {
                setStep(step + 1);
                // BAR-240: Auto-trigger carrier API lookup when advancing to step 3
                if (step === 2 && !carrierApiData && ENRICHABLE_CARRIERS.includes(selectedCarrier) && trackingNumber.length >= 8) {
                  fetchCarrierApiData(trackingNumber, selectedCarrier);
                }
              }}
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
              {isSubmitting ? 'Checking In…' : 'Check In Package'}
            </Button>
          )}
        </div>
      </Card>

      {/* Success Modal */}
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
              onClick={() => (window.location.href = '/dashboard/packages')}
            >
              View Packages
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
            {isWalkIn ? (
              <>Package for walk-in <span className="text-surface-200 font-medium">{walkInName}</span> has been checked in.</>
            ) : selectedCustomer ? (
              <>
                Package for{' '}
                <span className="text-surface-200 font-medium">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </span>{' '}
                ({selectedCustomer.pmbNumber}) has been checked in
                {printMode === 'batch'
                  ? ' and label added to queue.'
                  : ' and notifications sent.'}
              </>
            ) : (
              <>Package has been checked in.</>
            )}
          </p>
          {trackingNumber && (
            <p className="mt-3 font-mono text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg">
              {trackingNumber}
            </p>
          )}
          {/* BAR-41: Show print mode info */}
          {printMode === 'batch' && (
            <p className="mt-2 text-xs text-surface-500 flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Label added to batch queue ({labelQueue.length} total)
            </p>
          )}
        </div>
      </Modal>

      {/* BAR-41: Print Settings Modal */}
      <Modal
        open={showPrintSettings}
        onClose={() => setShowPrintSettings(false)}
        title="Label Print Settings"
        size="sm"
        footer={
          <Button onClick={() => setShowPrintSettings(false)}>Done</Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-400">
            Choose how labels are printed during check-in.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setPrintMode('per-package')}
              className={cn(
                'w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                printMode === 'per-package'
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                  : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600'
              )}
            >
              <Printer className={cn('h-5 w-5 mt-0.5', printMode === 'per-package' ? 'text-primary-600' : 'text-surface-400')} />
              <div>
                <p className={cn('text-sm font-medium', printMode === 'per-package' ? 'text-primary-600' : 'text-surface-200')}>
                  Per-Package Auto Print
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Labels print immediately as each package is checked in. Best for low-volume sessions.
                </p>
              </div>
            </button>
            <button
              onClick={() => setPrintMode('batch')}
              className={cn(
                'w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                printMode === 'batch'
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30'
                  : 'border-surface-700/50 bg-surface-900/60 hover:border-surface-600'
              )}
            >
              <Layers className={cn('h-5 w-5 mt-0.5', printMode === 'batch' ? 'text-primary-600' : 'text-surface-400')} />
              <div>
                <p className={cn('text-sm font-medium', printMode === 'batch' ? 'text-primary-600' : 'text-surface-200')}>
                  Batch Queue Print
                </p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Labels queued during scanning, then all printed at once. Best for high-volume delivery truck processing.
                </p>
              </div>
            </button>
          </div>
        </div>
      </Modal>

      {/* BAR-241: Queue Jump Modal */}
      <QueueJumpModal
        open={showQueueJump}
        onClose={() => setShowQueueJump(false)}
        stagingQueue={stagingQueue}
        onQueueJump={handleQueueJump}
        onQuickRelease={handleQuickRelease}
      />
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
  onChange,
}: {
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
  disabled,
}: {
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
  mono,
}: {
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
