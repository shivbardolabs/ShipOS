'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  Phone,
  User,
  Loader2,
  Undo2,
  UserPlus,
  Camera,
  X as XIcon,
  WifiOff } from 'lucide-react';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { CameraMeasure } from '@/components/packages/camera-measure';
import type { PackageDimensions } from '@/components/packages/camera-measure';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { PerformedBy } from '@/components/ui/performed-by';
import { useActivityLog } from '@/components/activity-log-provider';
import { usePrintQueue } from '@/components/packages/print-queue-provider';
import type { QueuedLabel } from '@/components/packages/label-print-queue';
import type { StagingPackage } from '@/components/packages/queue-jump-modal';
import { detectCarrier } from '@/lib/carrier-detection';
import { ENRICHABLE_CARRIERS } from '@/lib/carrier-api';
import { printLabel, renderPackageLabel } from '@/lib/labels';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
// customers now fetched from API
import type { Customer, ConditionTag } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RtsInitiateDialog } from '@/components/packages/rts-initiate-dialog';
import { BatchSessionSummary } from '@/components/packages/batch-session-summary';

/* Extracted step components */
import { Step1IdentifyCustomer } from './components/step-1-identify';
import { Step2CarrierSender } from './components/step-2-carrier';
import { Step3PackageDetails } from './components/step-3-details';
import { Step4ReviewConfirm } from './components/step-4-review';
import { CheckInModals } from './components/check-in-modals';
import type { SearchCustomer, DuplicatePackage, PackageProgram } from './components/types';
import { STEPS, carrierOptions, carrierSenderMap, packageProgramOptions, detectSearchCategory } from './components/types';

export default function CheckInPage() {
  const { log: logActivity, lastActionByVerb } = useActivityLog();

  // Resolve the last check-in activity entry so the PageHeader badge renders
  const lastCheckIn = lastActionByVerb('package.check_in');
  const {
    queue: labelQueue,
    printMode,
    syncQueue,
    clearQueue: clearPrintQueue,
  } = usePrintQueue();
  const setLabelQueue = useCallback(
    (updater: QueuedLabel[] | ((prev: QueuedLabel[]) => QueuedLabel[])) => {
      const next = typeof updater === 'function' ? updater(labelQueue) : updater;
      syncQueue(next, printMode);
    },
    [labelQueue, printMode, syncQueue]
  );
  const setStagingQueue = useState<StagingPackage[]>([])[1];
  const [step, setStep] = useState(1);

  // Step 1 — Package Program (BAR-266)
  const [packageProgram, setPackageProgram] = useState<PackageProgram>('pmb');

  // Step 1 — Customer (BAR-324: unified search with auto-detect)
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'pmb' | 'name' | 'all'>('pmb');
  const [selectedCustomer, setSelectedCustomer] = useState<SearchCustomer | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [dbCustomers, setDbCustomers] = useState<SearchCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // BAR-325: Auto-advance timer ref for customer selection
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // BAR-327: Carrier detection result & API data state (were previously missing,
  // causing undeclared variable references in handleSubmit)
  const [carrierDetectionResult, setCarrierDetectionResult] = useState<{
    confidence: 'high' | 'medium' | 'low';
    rule: string;
  } | null>(null);
  const [carrierApiData, setCarrierApiData] = useState<{
    sender?: { name?: string; address?: string };
    recipient?: { name?: string; address?: string };
    serviceType?: string;
  } | null>(null);

  // Step 3 — Package Details (BAR-245: conditional popups, duplicate tracking)
  const [packageDimensions, setPackageDimensions] = useState<PackageDimensions>({
    lengthIn: null, widthIn: null, heightIn: null, weightLbs: null, source: null,
  });
  const [packageType, setPackageType] = useState('');
  const [hazardous, setHazardous] = useState(false);
  const [perishable, setPerishable] = useState(false);
  const [condition, setCondition] = useState('good');
  const [conditionOther, setConditionOther] = useState('');
  const [notes, setNotes] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [storageLocationCustom, setStorageLocationCustom] = useState(false); // BAR-326
  const [requiresSignature, setRequiresSignature] = useState(false);

  // Condition details (tags, notes, photos)
  const [conditionTags, setConditionTags] = useState<ConditionTag[]>([]);
  const [customerNote, setCustomerNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [conditionPhotos, setConditionPhotos] = useState<string[]>([]);

  // BAR-326: Fetch defined storage locations for dropdown
  const [definedStorageLocations, setDefinedStorageLocations] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  useEffect(() => {
    fetch('/api/settings/storage-locations')
      .then((r) => r.json())
      .then((d) => {
        const locs = d.locations || [];
        setDefinedStorageLocations(locs);
        // Auto-select the default location if one exists and user hasn't typed anything
        const defaultLoc = locs.find((l: { isDefault: boolean }) => l.isDefault);
        if (defaultLoc && !storageLocation) {
          setStorageLocation(defaultLoc.name);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BAR-245: Popup modals for size/perishable warnings
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [showPerishableWarning, setShowPerishableWarning] = useState(false);
  const [sizeWarningAcked, setSizeWarningAcked] = useState(false);
  const [perishableWarningAcked, setPerishableWarningAcked] = useState(false);

  // BAR-328: Duplicate tracking number detection & override
  const [duplicatePackage, setDuplicatePackage] = useState<DuplicatePackage | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [checkingTracking, setCheckingTracking] = useState(false);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [duplicateOverrideReason, setDuplicateOverrideReason] = useState('');
  const trackingCheckDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Step 4 — Notify
  const [printLabelEnabled, setPrintLabelEnabled] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);

  // Submit state (BAR-260: actually save to DB)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkedInPackageId, setCheckedInPackageId] = useState<string | null>(null);
  const [showRtsDialog, setShowRtsDialog] = useState(false);

  // BAR-9: Cancel modal with Save Progress / Clear
  const [showCancelModal, setShowCancelModal] = useState(false);

  // BAR-9: Photo capture for package condition
  const [photos, setPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // BAR-9: Multi-package batch tracking
  const [batchCount, setBatchCount] = useState(0);
  const [batchSessionActive, setBatchSessionActive] = useState(false);

  // BAR-40: Batch session package list for session summary
  const [batchSessionPackages, setBatchSessionPackages] = useState<{
    id: string; trackingNumber?: string; carrier: string; customerName: string;
    pmbNumber: string; packageType: string; checkedInAt: string; labelPrinted: boolean; notified: boolean;
  }[]>([]);
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [batchSessionStart] = useState<Date>(new Date());

  // BAR-9: Offline detection
  const [isOnline, setIsOnline] = useState(true);

  // BAR-9: Error retry state for label print & notification
  const [labelPrintFailed, setLabelPrintFailed] = useState(false);
  const [notificationFailed, setNotificationFailed] = useState(false);

  // BAR-324: Derive detected search category from input (no extra state needed)
  const detectedCategory = detectSearchCategory(customerSearch);

  // Fetch customers from API with debounced search — uses detected category
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    customerDebounceRef.current = setTimeout(() => {
      const q = customerSearch.trim();
      if (!q) {
        // No query — fetch recent active customers
        const params = new URLSearchParams({ limit: '10', status: 'active' });
        fetch(`/api/customers?${params}`)
          .then((r) => r.json())
          .then((data) => setCustomers(data.customers ?? []))
          .catch((err) => console.error('Failed to fetch customers:', err));
        return;
      }
      // Use the dedicated search endpoint with the auto-detected mode
      const category = detectSearchCategory(q);
      const searchQuery = category === 'pmb' ? q.replace(/^PMB[-\s]?/i, '') : q;
      const params = new URLSearchParams({ q: searchQuery, mode: category, limit: '10' });
      fetch(`/api/customers/search?${params}`)
        .then((r) => r.json())
        .then((data) => setCustomers(data.customers ?? []))
        .catch((err) => console.error('Failed to search customers:', err));
    }, customerSearch ? 300 : 0);
    return () => { if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current); };
  }, [customerSearch]);

  const filteredCustomers = customers;

  /* ── BAR-37: Enhanced carrier detection from tracking number ─────────── */
  const fetchCarrierApiData = useCallback(async (tracking: string, carrierId: string) => {
    // Carrier API enrichment - placeholder for API integration
    console.log('[CheckIn] Carrier API data fetch:', { tracking, carrierId });
  }, []);

  // BAR-327: Rewritten to properly persist detected carrier through wizard.
  // Previously this callback was defined but never wired to the tracking input,
  // which used a simpler inline handler with a !selectedCarrier guard that
  // prevented re-detection when the tracking number changed.
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
        // BAR-327: Always update carrier from detection — no !selectedCarrier guard.
        // The detected carrier should always reflect the current tracking number.
        setSelectedCarrier(result.carrierId);
        setCarrierAutoSuggested(true);
        // Auto-fill sender name from carrier map
        const autoSender = carrierSenderMap[result.carrierId];
        if (autoSender) setSenderName(autoSender);
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

  // BAR-327: Removed old suggestCarrierFromTracking() — now using detectCarrier()
  // from carrier-detection.ts via handleTrackingNumberChange for all carrier
  // detection. This ensures consistent detection between the input handler
  // and the carrier-detection module.

  /* ======================================================================== */
  /*  BAR-328: Duplicate tracking check (scan + manual entry, Steps 2 & 3)   */
  /* ======================================================================== */
  const checkDuplicateTracking = useCallback(async (tracking: string) => {
    if (!tracking.trim()) {
      setDuplicatePackage(null);
      setDuplicateAcknowledged(false);
      setDuplicateOverrideReason('');
      return;
    }
    setCheckingTracking(true);
    try {
      const res = await fetch(`/api/packages/check-tracking?tracking=${encodeURIComponent(tracking.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setDuplicatePackage(data.package);
          setDuplicateAcknowledged(false);
          setDuplicateOverrideReason('');
          setShowDuplicateModal(true);
        } else {
          setDuplicatePackage(null);
          setDuplicateAcknowledged(false);
          setDuplicateOverrideReason('');
        }
      }
    } catch {
      // Fail silently — don't block check-in if the check itself errors
    } finally {
      setCheckingTracking(false);
    }
  }, []);

  // BAR-328: Debounced duplicate check on tracking number change in Step 2
  useEffect(() => {
    if (step === 2 && trackingNumber.trim().length >= 6) {
      if (trackingCheckDebounceRef.current) clearTimeout(trackingCheckDebounceRef.current);
      trackingCheckDebounceRef.current = setTimeout(() => {
        checkDuplicateTracking(trackingNumber);
      }, 400);
    } else if (!trackingNumber.trim()) {
      setDuplicatePackage(null);
      setDuplicateAcknowledged(false);
      setDuplicateOverrideReason('');
    }
    return () => {
      if (trackingCheckDebounceRef.current) clearTimeout(trackingCheckDebounceRef.current);
    };
  }, [trackingNumber, step, checkDuplicateTracking]);

  // Also re-check when entering Step 3 (in case tracking was entered via scan)
  useEffect(() => {
    if (step === 3 && trackingNumber.trim() && !duplicatePackage && !duplicateAcknowledged) {
      checkDuplicateTracking(trackingNumber);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // BAR-328: Block proceeding if duplicate detected and not acknowledged
        if (duplicatePackage && !duplicateAcknowledged) return false;
        return !!selectedCarrier && !!trackingNumber.trim();
      case 3:
        return !!packageType;
      case 4:
        return true;
      default:
        return false;
    }
  })();

  /* ── BAR-325: Auto-advance on customer selection ──────────────────── */
  const handleCustomerSelect = useCallback(
    (cust: SearchCustomer) => {
      // Clear any existing auto-advance timer
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

      setSelectedCustomer(cust);

      // Auto-advance to Step 2 after brief visual confirmation
      autoAdvanceTimerRef.current = setTimeout(() => {
        setStep(2);
      }, 300);
    },
    []
  );

  // Clean up auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  // BAR-9 Gap 5: Offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // BAR-9 Gap 1: Restore saved draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shipos_checkin_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.step) setStep(draft.step);
        if (draft.packageProgram) setPackageProgram(draft.packageProgram);
        if (draft.selectedCustomer) setSelectedCustomer(draft.selectedCustomer);
        if (draft.isWalkIn) setIsWalkIn(draft.isWalkIn);
        if (draft.walkInName) setWalkInName(draft.walkInName);
        if (draft.trackingNumber) setTrackingNumber(draft.trackingNumber);
        if (draft.selectedCarrier) setSelectedCarrier(draft.selectedCarrier);
        if (draft.senderName) setSenderName(draft.senderName);
        if (draft.customCarrierName) setCustomCarrierName(draft.customCarrierName);
        if (draft.packageType) setPackageType(draft.packageType);
        if (draft.condition) setCondition(draft.condition);
        if (draft.conditionOther) setConditionOther(draft.conditionOther);
        if (draft.notes) setNotes(draft.notes);
        if (draft.storageLocation) setStorageLocation(draft.storageLocation);
        if (draft.hazardous) setHazardous(draft.hazardous);
        if (draft.perishable) setPerishable(draft.perishable);
        if (draft.requiresSignature) setRequiresSignature(draft.requiresSignature);
        // Clear the draft after restoring
        localStorage.removeItem('shipos_checkin_draft');
      }
    } catch {
      // Fail silently if localStorage is unavailable
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BAR-9 Gap 4: Keyboard navigation — Enter to advance / submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      // Don't trigger if user is typing in a textarea or if a modal is open
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      if (showCancelModal || showDuplicateModal || showSizeWarning || showPerishableWarning || showSuccess) return;

      if (step < 4 && canProceed) {
        e.preventDefault();
        setStep(step + 1);
      } else if (step === 4 && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, canProceed, isSubmitting, showCancelModal, showDuplicateModal, showSizeWarning, showPerishableWarning, showSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle carrier selection with auto-fill sender
  const handleCarrierSelect = (carrierId: string) => {
    setSelectedCarrier(carrierId);
    setCarrierAutoSuggested(false);
    const autoSender = carrierSenderMap[carrierId];
    if (autoSender) setSenderName(autoSender);
    else setSenderName('');
  };

  // Handle barcode scan (BAR-37 + BAR-240 + BAR-328: immediate duplicate check)
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
      // BAR-328: Immediately check for duplicates on scan (no debounce)
      if (value.trim()) {
        checkDuplicateTracking(value);
      }
    },
    [fetchCarrierApiData, checkDuplicateTracking] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── BAR-11: Scan feedback state ────────────────────────────────────── */
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const scanFeedbackTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** Show brief scan success feedback, auto-clears after 2s */
  const showScanFeedback = useCallback((message: string) => {
    if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    setScanFeedback(message);
    scanFeedbackTimerRef.current = setTimeout(() => setScanFeedback(null), 2000);
  }, []);

  /** Combined scan handler: populate tracking, auto-detect carrier, show feedback */
  const handleScanResult = useCallback(
    (value: string) => {
      handleBarcodeScan(value);
      const result = detectCarrier(value);
      const carrierLabel = result ? result.carrierName : 'Unknown carrier';
      showScanFeedback(`✓ Scanned: ${value.slice(0, 20)}${value.length > 20 ? '…' : ''} (${carrierLabel})`);
    },
    [handleBarcodeScan, showScanFeedback]
  );

  /* ── BAR-11: USB keyboard wedge detection ───────────────────────────── */
  // Barcode scanners in keyboard-wedge mode send characters rapidly (< 50ms gaps)
  // followed by Enter. We detect this pattern and treat it as a scan.
  const wedgeBufferRef = useRef('');
  const wedgeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastKeystrokeRef = useRef(0);

  useEffect(() => {
    // Only activate wedge detection on Step 2 (Carrier & Sender)
    if (step !== 2) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in a textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA') return;

      const now = Date.now();
      const timeSinceLast = now - lastKeystrokeRef.current;
      lastKeystrokeRef.current = now;

      // If Enter key and we have a buffer with rapid input — treat as scan
      if (e.key === 'Enter' && wedgeBufferRef.current.length >= 6) {
        e.preventDefault();
        e.stopPropagation();
        const scanned = wedgeBufferRef.current;
        wedgeBufferRef.current = '';
        if (wedgeTimerRef.current) clearTimeout(wedgeTimerRef.current);
        handleScanResult(scanned);
        return;
      }

      // Only accumulate printable single characters arriving rapidly
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (timeSinceLast < 50 || wedgeBufferRef.current.length === 0) {
          wedgeBufferRef.current += e.key;
          // Reset buffer if no more rapid input arrives (300ms timeout)
          if (wedgeTimerRef.current) clearTimeout(wedgeTimerRef.current);
          wedgeTimerRef.current = setTimeout(() => {
            wedgeBufferRef.current = '';
          }, 300);
        } else {
          // Too slow — reset buffer, this is manual typing
          wedgeBufferRef.current = e.key;
          if (wedgeTimerRef.current) clearTimeout(wedgeTimerRef.current);
          wedgeTimerRef.current = setTimeout(() => {
            wedgeBufferRef.current = '';
          }, 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (wedgeTimerRef.current) clearTimeout(wedgeTimerRef.current);
    };
  }, [step, handleScanResult]);

  // Clean up scan feedback timer on unmount
  useEffect(() => {
    return () => {
      if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    };
  }, []);

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
          notes: notes.trim() || undefined,
          storageLocation: storageLocation.trim() || undefined,
          requiresSignature,
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
          // Camera measure dimensions
          lengthIn: packageDimensions.lengthIn || undefined,
          widthIn: packageDimensions.widthIn || undefined,
          heightIn: packageDimensions.heightIn || undefined,
          weightLbs: packageDimensions.weightLbs || undefined,
          dimensionSource: packageDimensions.source || undefined,
          // BAR-240: Include enrichment data
          carrierApiData: carrierApiData ? {
            senderName: carrierApiData.sender?.name,
            senderAddress: carrierApiData.sender?.address,
            recipientName: carrierApiData.recipient?.name,
            recipientAddress: carrierApiData.recipient?.address,
            serviceType: carrierApiData.serviceType,
          } : undefined,
          // BAR-328: Duplicate override data
          duplicateOverride: duplicateAcknowledged && !!duplicatePackage,
          duplicateOverrideReason: duplicateAcknowledged ? duplicateOverrideReason : undefined,
          duplicateOriginalPackageId: duplicateAcknowledged ? duplicatePackage?.id : undefined,
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

      // BAR-9 Gap 6: Track label print / notification failures from API response
      if (data.labelPrintError) setLabelPrintFailed(true);
      if (data.notificationError) setNotificationFailed(true);

      // Show success modal
      setShowSuccess(true);
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
    setCarrierDetectionResult(null);
    setCarrierApiData(null);
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
    setConditionTags([]);
    setCustomerNote('');
    setInternalNote('');
    setConditionPhotos([]);
    setNotes('');
    setStorageLocation('');
    setPackageDimensions({ lengthIn: null, widthIn: null, heightIn: null, weightLbs: null, source: null });
    setPrintLabelEnabled(true);
    setSendEmail(true);
    setSendSms(true);
    setShowSuccess(false);
    setSubmitError(null);
    setCheckedInPackageId(null);
    setDuplicatePackage(null);
    setDuplicateAcknowledged(false);
    setDuplicateOverrideReason('');
    setSizeWarningAcked(false);
    setPerishableWarningAcked(false);
    setPhotos([]);
    setBatchCount(0);
    setLabelPrintFailed(false);
    setNotificationFailed(false);
  };

  // BAR-9 Gap 1: Save current wizard state to localStorage as a draft
  const handleSaveDraft = () => {
    try {
      const draft = {
        step,
        packageProgram,
        selectedCustomer,
        isWalkIn,
        walkInName,
        trackingNumber,
        selectedCarrier,
        senderName,
        customCarrierName,
        packageType,
        condition,
        conditionOther,
        notes,
        storageLocation,
        hazardous,
        perishable,
        requiresSignature,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('shipos_checkin_draft', JSON.stringify(draft));
    } catch {
      // Fail silently
    }
    setShowCancelModal(false);
    window.location.href = '/dashboard/packages';
  };

  // BAR-9 Gap 1: Clear draft and reset
  const handleClearAndReset = () => {
    try { localStorage.removeItem('shipos_checkin_draft'); } catch {}
    setShowCancelModal(false);
    handleReset();
  };

  // BAR-9 Gap 3: Check in another package for the same customer
  const handleCheckInAnother = () => {
    // Preserve Step 1 state: selectedCustomer, packageProgram, isWalkIn, walkInName
    // Reset Steps 2-4
    setTrackingNumber('');
    setSelectedCarrier('');
    setCarrierAutoSuggested(false);
    setCarrierDetectionResult(null);
    setCarrierApiData(null);
    setCustomCarrierName('');
    setSenderName('');
    setSenderSuggestions([]);
    setPackageType('');
    setHazardous(false);
    setPerishable(false);
    setRequiresSignature(false);
    setCondition('good');
    setConditionOther('');
    setConditionTags([]);
    setCustomerNote('');
    setInternalNote('');
    setConditionPhotos([]);
    setNotes('');
    setStorageLocation('');
    setPackageDimensions({ lengthIn: null, widthIn: null, heightIn: null, weightLbs: null, source: null });
    setPrintLabelEnabled(true);
    setSendEmail(true);
    setSendSms(true);
    setShowSuccess(false);
    setSubmitError(null);
    setCheckedInPackageId(null);
    setDuplicatePackage(null);
    setDuplicateAcknowledged(false);
    setDuplicateOverrideReason('');
    setSizeWarningAcked(false);
    setPerishableWarningAcked(false);
    setPhotos([]);
    setLabelPrintFailed(false);
    setNotificationFailed(false);
    setBatchCount((prev) => prev + 1);
    // BAR-40: Track package in batch session list
    setBatchSessionPackages((prev) => [
      ...prev,
      {
        id: checkedInPackageId || `temp-${Date.now()}`,
        trackingNumber: trackingNumber || undefined,
        carrier: selectedCarrier || 'other',
        customerName: selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
          : (walkInName || 'Walk-in'),
        pmbNumber: selectedCustomer?.pmbNumber || 'N/A',
        packageType: packageType || 'medium',
        checkedInAt: new Date().toISOString(),
        labelPrinted: true,
        notified: sendEmail || sendSms,
      },
    ]);
    setStep(2);
  };

  // BAR-9 Gap 2: Handle photo capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input so the same file can be selected again
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // BAR-9 Gap 6: Retry label print
  const handleRetryLabelPrint = async () => {
    if (!checkedInPackageId) return;
    try {
      setLabelPrintFailed(false);
      // Re-attempt label print via API
      await fetch(`/api/packages/${checkedInPackageId}/print-label`, { method: 'POST' });
    } catch {
      setLabelPrintFailed(true);
    }
  };

  // BAR-9 Gap 6: Retry notification
  const handleRetryNotification = async () => {
    if (!checkedInPackageId) return;
    try {
      setNotificationFailed(false);
      // Re-attempt notification via API
      await fetch(`/api/packages/${checkedInPackageId}/notify`, { method: 'POST' });
    } catch {
      setNotificationFailed(true);
    }
  };

  // Generate a unique tracking number (BAR-245 + BAR-328)
  const handleGenerateTracking = () => {
    const prefix = selectedCarrier ? selectedCarrier.toUpperCase().slice(0, 3) : 'PKG';
    const generated = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    setTrackingNumber(generated);
    setDuplicatePackage(null);
    setDuplicateAcknowledged(false);
    setDuplicateOverrideReason('');
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

      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You&apos;re offline. Package data is preserved, but check-in will be disabled until you reconnect.</span>
        </div>
      )}

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoCapture} />

      {/* Step Progress Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => {
                if (s.id < step) {
                  if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                  setStep(s.id);
                }
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
              <span className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                step === s.id ? 'bg-primary-600 text-white'
                  : s.id < step ? 'bg-emerald-100 text-emerald-600' : 'bg-surface-700 text-surface-500'
              )}>
                {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn('mx-1 h-px w-8 sm:w-12', s.id < step ? 'bg-emerald-500/40' : 'bg-surface-700')} />
            )}
          </div>
        ))}
      </div>

      <Card padding="lg">
        {step === 1 && (
          <Step1IdentifyCustomer
            packageProgram={packageProgram} setPackageProgram={setPackageProgram}
            enabledPrograms={enabledPrograms as any}
            customerSearch={customerSearch} setCustomerSearch={setCustomerSearch}
            filteredCustomers={filteredCustomers} customersLoading={customersLoading}
            selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
            isWalkIn={isWalkIn} setIsWalkIn={setIsWalkIn}
            walkInName={walkInName} setWalkInName={setWalkInName}
            recipientName={recipientName} setRecipientName={setRecipientName}
            kinekNumber={kinekNumber} setKinekNumber={setKinekNumber}
            handleCustomerSelect={handleCustomerSelect}
            setShowRtsDialog={setShowRtsDialog}
            setStep={setStep} step={step}
          />
        )}

        {step === 2 && (
          <Step2CarrierSender
            trackingNumber={trackingNumber}
            handleTrackingNumberChange={handleTrackingNumberChange as any}
            selectedCarrier={selectedCarrier}
            handleCarrierSelect={handleCarrierSelect}
            carrierAutoSuggested={carrierAutoSuggested} setCarrierAutoSuggested={setCarrierAutoSuggested}
            setSelectedCarrier={setSelectedCarrier}
            setCustomCarrierName={setCustomCarrierName}
            customCarrierName={customCarrierName}
            senderName={senderName} setSenderName={setSenderName}
            senderSuggestions={senderSuggestions}
            showSenderSuggestions={showSenderSuggestions} setShowSenderSuggestions={setShowSenderSuggestions}
            senderRef={senderRef as React.RefObject<HTMLElement | null>}
            checkingTracking={checkingTracking}
            duplicatePackage={duplicatePackage}
            duplicateAcknowledged={duplicateAcknowledged}
            duplicateOverrideReason={duplicateOverrideReason}
            setShowDuplicateModal={setShowDuplicateModal}
            scanFeedback={scanFeedback as any}
            handleScanResult={handleScanResult}
            setStep={setStep} step={step}
          />
        )}

        {step === 3 && (
          <Step3PackageDetails
            packageType={packageType} setPackageType={setPackageType}
            packageDimensions={packageDimensions} setPackageDimensions={setPackageDimensions}
            hazardous={hazardous} setHazardous={setHazardous}
            perishable={perishable} setPerishable={setPerishable}
            setPerishableWarningAcked={setPerishableWarningAcked}
            condition={condition} setCondition={setCondition}
            conditionOther={conditionOther} setConditionOther={setConditionOther}
            notes={notes} setNotes={setNotes}
            storageLocation={storageLocation} setStorageLocation={setStorageLocation}
            storageLocationCustom={storageLocationCustom} setStorageLocationCustom={setStorageLocationCustom}
            requiresSignature={requiresSignature} setRequiresSignature={setRequiresSignature}
            definedStorageLocations={definedStorageLocations}
            photos={photos} setPhotos={setPhotos} photoInputRef={photoInputRef}
            duplicatePackage={duplicatePackage} duplicateAcknowledged={duplicateAcknowledged}
            duplicateOverrideReason={duplicateOverrideReason}
            showDuplicateModal={showDuplicateModal} setShowDuplicateModal={setShowDuplicateModal}
            setStep={setStep} step={step}
          />
        )}

        {step === 4 && (
          <Step4ReviewConfirm
            trackingNumber={trackingNumber} selectedCarrier={selectedCarrier}
            senderName={senderName} packageType={packageType}
            packageDimensions={packageDimensions}
            hazardous={hazardous} perishable={perishable}
            condition={condition} conditionOther={conditionOther}
            notes={notes} storageLocation={storageLocation}
            requiresSignature={requiresSignature}
            selectedCustomer={selectedCustomer} isWalkIn={isWalkIn} walkInName={walkInName}
            duplicatePackage={duplicatePackage} duplicateAcknowledged={duplicateAcknowledged}
            duplicateOverrideReason={duplicateOverrideReason}
            submitError={submitError} setSubmitError={setSubmitError}
            printLabelEnabled={printLabelEnabled} setPrintLabelEnabled={setPrintLabelEnabled}
            sendEmail={sendEmail} setSendEmail={setSendEmail}
            sendSms={sendSms} setSendSms={setSendSms}
            setStep={setStep} step={step}
          />
        )}


        {/* Navigation (BAR-9: added Cancel button + offline disable) */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-surface-800">
          <div className="flex items-center gap-2">
            {/* BAR-9 Gap 1: Cancel button */}
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-700/50 bg-surface-800/50 text-surface-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
              title="Cancel check-in"
            >
              <XIcon className="h-4 w-4" />
            </button>
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => {
                // BAR-325: Cancel any pending auto-advance when going back
                if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                setStep(Math.max(1, step - 1));
              }}
              disabled={step === 1}
            >
              Back
            </Button>
          </div>
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
              disabled={isSubmitting || !isOnline}
            >
              {isSubmitting ? 'Saving...' : !isOnline ? 'Offline' : 'Check In Package'}
            </Button>
          )}
        </div>

      </Card>

      <CheckInModals
        step={step} setStep={setStep}
        isSubmitting={isSubmitting} isOnline={isOnline}
        showSuccess={showSuccess} setShowSuccess={setShowSuccess}
        checkedInPackageId={checkedInPackageId}
        showCancelModal={showCancelModal} setShowCancelModal={setShowCancelModal}
        showRtsDialog={showRtsDialog} setShowRtsDialog={setShowRtsDialog}
        showDuplicateModal={showDuplicateModal} setShowDuplicateModal={setShowDuplicateModal}
        showSizeWarning={showSizeWarning} setShowSizeWarning={setShowSizeWarning}
        showPerishableWarning={showPerishableWarning} setShowPerishableWarning={setShowPerishableWarning}
        showBatchSummary={showBatchSummary} setShowBatchSummary={setShowBatchSummary}
        duplicatePackage={duplicatePackage} setDuplicatePackage={setDuplicatePackage}
        duplicateAcknowledged={duplicateAcknowledged} setDuplicateAcknowledged={setDuplicateAcknowledged}
        duplicateOverrideReason={duplicateOverrideReason} setDuplicateOverrideReason={setDuplicateOverrideReason}
        sizeWarningAcked={sizeWarningAcked} setSizeWarningAcked={setSizeWarningAcked}
        perishableWarningAcked={perishableWarningAcked} setPerishableWarningAcked={setPerishableWarningAcked}
        selectedCustomer={selectedCustomer} selectedCarrier={selectedCarrier}
        trackingNumber={trackingNumber} setTrackingNumber={setTrackingNumber}
        sendEmail={sendEmail} sendSms={sendSms}
        packageType={packageType} isWalkIn={isWalkIn} walkInName={walkInName}
        labelPrintFailed={labelPrintFailed} setLabelPrintFailed={setLabelPrintFailed}
        notificationFailed={notificationFailed} setNotificationFailed={setNotificationFailed}
        batchCount={batchCount} setBatchCount={setBatchCount}
        batchSessionPackages={batchSessionPackages as any} setBatchSessionPackages={setBatchSessionPackages as any}
        batchSessionStart={batchSessionStart}
        autoAdvanceTimerRef={autoAdvanceTimerRef}
        handleSubmit={handleSubmit} handleReset={handleReset}
        handleSaveDraft={handleSaveDraft} handleClearAndReset={handleClearAndReset}
        handleCheckInAnother={handleCheckInAnother}
        handleRetryLabelPrint={handleRetryLabelPrint}
        handleRetryNotification={handleRetryNotification}
        handleGenerateTracking={handleGenerateTracking}
      />
    </div>
  );
}
