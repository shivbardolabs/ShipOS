'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { CarrierLogo } from '@/components/carriers/carrier-logos';

import { useActivityLog } from '@/components/activity-log-provider';
// customers now fetched from API
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import type { SmartIntakeResult, SmartIntakeResponse } from '@/app/api/packages/smart-intake/route';
import {
  Camera,
  Upload,
  Sparkles,
  Zap,
  Check,
  CheckCircle2,
  X,
  RotateCcw,
  Loader2,
  Package,
  ScanLine,
  ArrowRight,
  AlertTriangle,
  Edit3,
  Layers,
  Printer,
  Bell,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type IntakePhase = 'capture' | 'analyzing' | 'review' | 'success';

/** BAR-382: Duplicate tracking number info */
interface DuplicateInfo {
  existingPackageId: string;
  customerName: string;
  customerPmb: string;
  status: string;
  checkedInAt: string;
}

interface MatchedPackage {
  result: SmartIntakeResult;
  customer: Customer | null;
  confirmed: boolean;
  editing: boolean;
  /** Editable overrides */
  overrides: Partial<SmartIntakeResult>;
  /** BAR-337: Server-side pending item ID (for badge count tracking) */
  pendingItemId?: string;
  /** BAR-382: Duplicate tracking number warning */
  duplicateInfo?: DuplicateInfo;
  /** BAR-382: Closed/suspended mailbox warning */
  closedMailboxPmb?: string;
  /** BAR-382: Loading state while check-in API call is in flight */
  checkingIn?: boolean;
  /** BAR-382: Error message from check-in API */
  checkInError?: string;
  /** BAR-382: Duplicate override — user chose to proceed anyway */
  duplicateOverride?: boolean;
  duplicateOverrideReason?: string;
}

/* -------------------------------------------------------------------------- */
/*  Carrier config                                                            */
/* -------------------------------------------------------------------------- */
const carrierLabels: Record<string, string> = {
  amazon: 'Amazon', ups: 'UPS', fedex: 'FedEx', usps: 'USPS', dhl: 'DHL',
  lasership: 'LaserShip', temu: 'Temu', ontrac: 'OnTrac', walmart: 'Walmart',
  target: 'Target', other: 'Other',
};

const carrierColors: Record<string, string> = {
  amazon: 'border-status-warning-alt/40 bg-status-warning-alt/10 text-status-warning-400',
  ups: 'border-status-warning-700/40 bg-amber-900/20 text-status-warning-500',
  fedex: 'border-primary-300/40 bg-primary-50 text-primary-600',
  usps: 'border-status-info-500/40 bg-status-info-50 text-status-info-600',
  dhl: 'border-status-warning-500/40 bg-status-warning-500/10 text-status-warning-400',
  lasership: 'border-status-success-500/40 bg-status-success-500/10 text-status-success-400',
  temu: 'border-status-warning-600/40 bg-status-warning-600/10 text-status-warning-alt',
  ontrac: 'border-status-info-600/40 bg-status-info-600/10 text-status-info-300',
  walmart: 'border-status-info-500/40 bg-status-info-500/10 text-status-info-400',
  target: 'border-status-error-500/40 bg-status-error-50 text-status-error-600',
  other: 'border-surface-600/40 bg-surface-700/20 text-surface-400',
};

const packageSizeLabels: Record<string, string> = {
  letter: 'Letter', pack: 'Pack', small: 'Small',
  medium: 'Medium', large: 'Large', xlarge: 'Extra Large',
};

/* -------------------------------------------------------------------------- */
/*  Customer matcher                                                          */
/* -------------------------------------------------------------------------- */

/** BAR-382: Return both active customer and closed-mailbox info */
interface CustomerMatchResult {
  customer: Customer | null;
  /** If PMB matched a closed/suspended mailbox, its PMB number */
  closedMailboxPmb?: string;
}

async function findCustomerByPMB(pmb: string): Promise<CustomerMatchResult> {
  if (!pmb) return { customer: null };
  const normalized = pmb.replace(/[^0-9]/g, '').padStart(4, '0');
  const search = `PMB-${normalized}`;
  try {
    // First try to find an active customer
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=1&status=active`);
    const data = await res.json();
    const customer = data.customers?.[0] ?? null;

    if (customer) return { customer };

    // BAR-382: If no active customer, check if there's a closed/suspended one
    // so we can show a specific warning instead of just "No customer match"
    const closedRes = await fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=1`);
    const closedData = await closedRes.json();
    const closedCustomer = closedData.customers?.[0];

    if (closedCustomer && closedCustomer.status !== 'active') {
      return { customer: null, closedMailboxPmb: closedCustomer.pmbNumber };
    }

    return { customer: null };
  } catch {
    return { customer: null };
  }
}

/** BAR-382: Check for duplicate tracking numbers */
async function checkDuplicateTracking(trackingNumber: string): Promise<DuplicateInfo | undefined> {
  if (!trackingNumber?.trim()) return undefined;
  try {
    const res = await fetch(`/api/packages/check-tracking?tracking=${encodeURIComponent(trackingNumber.trim())}`);
    const data = await res.json();
    if (data.exists && data.package) {
      return {
        existingPackageId: data.package.id,
        customerName: data.package.customerName,
        customerPmb: data.package.customerPmb,
        status: data.package.status,
        checkedInAt: data.package.checkedInAt,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=5&status=active`);
    const data = await res.json();
    return data.customers ?? [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Confidence badge                                                          */
/* -------------------------------------------------------------------------- */
function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90
      ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30'
      : pct >= 75
        ? 'bg-status-warning-500/20 text-status-warning-400 border-status-warning-500/30'
        : 'bg-status-error-500/20 text-status-error-400 border-status-error-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
      <Sparkles className="h-3 w-3" />
      {pct}% match
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function SmartIntakePage() {
  const [phase, setPhase] = useState<IntakePhase>('capture');
  const [batchMode, setBatchMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchedPackages, setMatchedPackages] = useState<MatchedPackage[]>([]);
  const [responseMode, setResponseMode] = useState<'ai' | 'demo'>('ai');
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermDenied, setCameraPermDenied] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false); // Guard against double-clicks

  // Customer search for no-match
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingForIdx, setSearchingForIdx] = useState<number | null>(null);

  const { log } = useActivityLog();

  /* ── Camera controls ───────────────────────────────────────────────── */
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    // Guard: prevent double-clicks while getUserMedia is pending
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      setCameraError(null);
      setCameraReady(false);
      setCameraPermDenied(false);
      setCameraLoading(true);

      // Clean up any leaked stream from a previous attempt
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Use ideal (not exact) facingMode for broader device compatibility
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Validate the stream has a live video track
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks.length || videoTracks[0].readyState === 'ended') {
        stream.getTracks().forEach((t) => t.stop());
        setCameraError('Camera returned an empty stream. Close other apps using the camera and try again.');
        setCameraLoading(false);
        startingRef.current = false;
        return;
      }

      // Listen for track ending unexpectedly (e.g. another app takes the camera)
      videoTracks[0].addEventListener('ended', () => {
        setCameraError('Camera stream ended unexpectedly. Tap "Open Camera" to retry.');
        setCameraActive(false);
        setCameraReady(false);
        streamRef.current = null;
      }, { once: true });

      streamRef.current = stream;

      // Set cameraActive so the <video> element renders in the DOM.
      // The useEffect below will attach the stream once videoRef becomes available.
      setCameraActive(true);
      setCameraLoading(false);
    } catch (err) {
      setCameraLoading(false);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('denied')) {
        setCameraPermDenied(true);
        setCameraError('Camera access was blocked. Tap "Upload Photo" below to continue, or enable camera in your browser settings and reload.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.');
      } else if (msg.includes('NotReadable') || msg.includes('TrackStartError')) {
        setCameraError('Camera is in use by another app. Close it and try again.');
      } else {
        setCameraError(`Camera not available: ${msg}`);
      }
    } finally {
      startingRef.current = false;
    }
  }, []);

  // Attach stream to <video> element AFTER it renders in the DOM.
  // This avoids the race condition where videoRef.current is null because
  // the <video> element only mounts when cameraActive is true.
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;

    let mounted = true;
    let initTimeout: ReturnType<typeof setTimeout>;

    // The video element may not have its ref immediately after the state flip.
    // Use requestAnimationFrame to wait one frame for React to commit the DOM.
    const tryAttach = () => {
      const video = videoRef.current;
      if (!video) {
        // Video not in DOM yet — retry next frame (max 1 retry)
        requestAnimationFrame(() => {
          const v = videoRef.current;
          if (!v || !mounted) return;
          attachStream(v);
        });
        return;
      }
      attachStream(video);
    };

    const attachStream = (video: HTMLVideoElement) => {
      video.srcObject = streamRef.current;

      const handleReady = () => {
        if (!mounted) return;
        video.play().then(() => {
          if (mounted) setCameraReady(true);
        }).catch(() => {
          if (mounted) setCameraError('Could not start video playback. Try again.');
        });
      };

      // Fast-path: metadata already loaded (some devices)
      if (video.readyState >= 1) {
        handleReady();
      } else {
        video.addEventListener('loadedmetadata', handleReady, { once: true });
      }

      // Safety timeout: if video doesn't start within 10s, show actionable error
      initTimeout = setTimeout(() => {
        if (mounted && video.readyState < 2) {
          setCameraError('Camera is taking too long to start. Close other apps using the camera, then try again.');
          // Don't auto-close — user can still cancel
        }
      }, 10000);
    };

    tryAttach();

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
    };
  }, [cameraActive]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraReady(false);
    setCameraLoading(false);
    startingRef.current = false;
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    // Ensure video has actual frame data (readyState >= HAVE_CURRENT_DATA)
    if (video.readyState < 2 || video.videoWidth === 0) {
      setCameraError('Camera is still loading. Please wait a moment and try again.');
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    // Validate we got a real image (not an empty/tiny canvas)
    if (!dataUrl || dataUrl.length < 1000) {
      setCameraError('Could not capture image. Please try again.');
      return;
    }
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── AI Analysis ───────────────────────────────────────────────────── */
  const analyzeImage = useCallback(async () => {
    if (!capturedImage) return;
    setPhase('analyzing');
    setError(null);

    try {
      const resp = await fetch('/api/packages/smart-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, batch: batchMode }),
      });

      const data: SmartIntakeResponse = await resp.json();

      if (!data.success) {
        setError(data.error ?? 'Analysis failed');
        setPhase('capture');
        return;
      }

      setResponseMode(data.mode);

      // BAR-382: Match each result to a customer + check duplicates + closed mailboxes
      const matched: MatchedPackage[] = await Promise.all(
        data.results.map(async (r: SmartIntakeResult) => {
          const [matchResult, duplicateInfo] = await Promise.all([
            findCustomerByPMB(r.pmbNumber),
            checkDuplicateTracking(r.trackingNumber),
          ]);
          return {
            result: r,
            customer: matchResult.customer,
            confirmed: false,
            editing: false,
            overrides: {},
            duplicateInfo,
            closedMailboxPmb: matchResult.closedMailboxPmb,
          };
        })
      );

      // BAR-337: Save to pending queue for sidebar badge count
      try {
        const pendingResp = await fetch('/api/packages/smart-intake/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: data.results.map((r: SmartIntakeResult) => ({
              carrier: r.carrier,
              trackingNumber: r.trackingNumber,
              senderName: r.senderName,
              senderAddress: r.senderAddress,
              recipientName: r.recipientName,
              pmbNumber: r.pmbNumber,
              packageSize: r.packageSize,
              confidence: r.confidence,
              rawExtraction: JSON.stringify(r),
            })),
          }),
        });
        if (pendingResp.ok) {
          const pendingData = await pendingResp.json();
          // Link created pending item IDs back to matched packages
          const createdItems: Array<{ id: string }> = pendingData.items ?? [];
          createdItems.forEach((item, i) => {
            if (matched[i]) matched[i].pendingItemId = item.id;
          });
        }
      } catch {
        // Non-blocking: badge count is a nice-to-have
      }

      setMatchedPackages(matched);
      setPhase('review');
    } catch {
      setError('Failed to analyze image. Please try again.');
      setPhase('capture');
    }
  }, [capturedImage, batchMode]);

  // Auto-analyze when image is captured
  useEffect(() => {
    if (capturedImage && phase === 'capture') {
      analyzeImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage]);

  /* ── Check-in actions ──────────────────────────────────────────────── */
  /**
   * BAR-382: Confirm a package by calling the actual check-in API.
   * Previously this only logged to a client-side activity log and
   * fire-and-forget approved the pending item, which meant the Package
   * record was either not created or created without proper data
   * (missing storeId, tenant-scoped customer lookup, overrides ignored).
   *
   * Now we POST to /api/packages/check-in with all the correct data,
   * which creates the Package record, audit log, charge event, and
   * sends notifications — exactly like the regular check-in flow.
   */
  const confirmPackage = useCallback(
    async (idx: number) => {
      const pkg = matchedPackages[idx];
      if (!pkg.customer || pkg.confirmed || pkg.checkingIn) return;

      const effectiveResult = { ...pkg.result, ...pkg.overrides };

      // BAR-382: Block check-in for duplicate tracking unless user overrode
      if (pkg.duplicateInfo && !pkg.duplicateOverride) return;

      // Set loading state
      setMatchedPackages((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], checkingIn: true, checkInError: undefined };
        return updated;
      });

      try {
        const resp = await fetch('/api/packages/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: pkg.customer.id,
            trackingNumber: effectiveResult.trackingNumber,
            carrier: effectiveResult.carrier,
            senderName: effectiveResult.senderName,
            packageType: effectiveResult.packageSize || 'medium',
            hazardous: false,
            perishable: false,
            condition: 'good',
            sendEmail: true,
            sendSms: true,
            // BAR-382: Pass duplicate override if user chose to proceed
            ...(pkg.duplicateOverride && {
              duplicateOverride: true,
              duplicateOverrideReason: pkg.duplicateOverrideReason || 'Smart Intake — user confirmed duplicate',
              duplicateOriginalPackageId: pkg.duplicateInfo?.existingPackageId,
            }),
          }),
        });

        const data = await resp.json();

        // BAR-382: Handle duplicate response from check-in API
        if (resp.status === 409 && data.code === 'DUPLICATE_TRACKING') {
          setMatchedPackages((prev) => {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              checkingIn: false,
              duplicateInfo: {
                existingPackageId: data.existingPackage.id,
                customerName: data.existingPackage.customerName,
                customerPmb: data.existingPackage.customerPmb,
                status: data.existingPackage.status,
                checkedInAt: data.existingPackage.checkedInAt,
              },
            };
            return updated;
          });
          return;
        }

        if (!resp.ok) {
          throw new Error(data.error || 'Check-in failed');
        }

        // Success — mark as confirmed
        setMatchedPackages((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], confirmed: true, checkingIn: false };
          return updated;
        });

        // Log to client-side activity log
        log({
          action: 'package.check_in',
          entityType: 'package',
          entityId: data.package?.id || `pkg_ai_${Date.now()}_${idx}`,
          entityLabel: `${effectiveResult.carrier.toUpperCase()} — ${effectiveResult.trackingNumber}`,
          description: `AI Smart Intake: Checked in ${carrierLabels[effectiveResult.carrier] ?? effectiveResult.carrier} package for ${pkg.customer.firstName} ${pkg.customer.lastName} (${pkg.customer.pmbNumber})`,
          metadata: {
            method: 'smart_intake',
            carrier: effectiveResult.carrier,
            trackingNumber: effectiveResult.trackingNumber,
            customerId: pkg.customer.id,
            confidence: effectiveResult.confidence,
          },
        });

        // BAR-337: Approve pending item to decrement sidebar badge (non-blocking)
        if (pkg.pendingItemId) {
          fetch(`/api/packages/smart-intake/pending/${pkg.pendingItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          }).catch(() => {}); // Non-blocking — badge count is secondary
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Check-in failed';
        setMatchedPackages((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], checkingIn: false, checkInError: message };
          return updated;
        });
      }
    },
    [matchedPackages, log]
  );

  /** BAR-382: Allow user to override duplicate warning and proceed */
  const overrideDuplicate = useCallback((idx: number, reason?: string) => {
    setMatchedPackages((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        duplicateOverride: true,
        duplicateOverrideReason: reason || 'Re-delivery / replacement',
      };
      return updated;
    });
  }, []);

  const confirmAll = useCallback(async () => {
    // BAR-382: Process all eligible packages (with customer, no blocking duplicate)
    const promises = matchedPackages.map((pkg, idx) => {
      if (!pkg.confirmed && !pkg.checkingIn && pkg.customer
          && (!pkg.duplicateInfo || pkg.duplicateOverride)) {
        return confirmPackage(idx);
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
  }, [matchedPackages, confirmPackage]);

  const finishIntake = useCallback(() => {
    const confirmedCount = matchedPackages.filter((p) => p.confirmed).length;
    setCheckedInCount((prev) => prev + confirmedCount);
    setPhase('success');
  }, [matchedPackages]);

  const startNew = useCallback(() => {
    setCapturedImage(null);
    setMatchedPackages([]);
    setError(null);
    setCameraError(null);
    setCameraPermDenied(false);
    setCameraLoading(false);
    startingRef.current = false;
    setPhase('capture');
    setSearchingForIdx(null);
    setSearchQuery('');
  }, []);

  const assignCustomer = useCallback((pkgIdx: number, customer: Customer) => {
    setMatchedPackages((prev) => {
      const updated = [...prev];
      updated[pkgIdx] = { ...updated[pkgIdx], customer };
      return updated;
    });
    setSearchingForIdx(null);
    setSearchQuery('');
  }, []);

  const toggleEdit = useCallback((idx: number) => {
    setMatchedPackages((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], editing: !updated[idx].editing };
      return updated;
    });
  }, []);

  const updateOverride = useCallback((idx: number, field: string, value: string) => {
    setMatchedPackages((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        overrides: { ...updated[idx].overrides, [field]: value },
      };
      return updated;
    });
  }, []);

  /* ── Computed ──────────────────────────────────────────────────────── */
  const allConfirmed = useMemo(
    () => matchedPackages.length > 0 && matchedPackages.every((p) => p.confirmed),
    [matchedPackages]
  );

  const confirmedCount = useMemo(
    () => matchedPackages.filter((p) => p.confirmed).length,
    [matchedPackages]
  );

  const matchedCount = useMemo(
    () => matchedPackages.filter((p) => p.customer).length,
    [matchedPackages]
  );

  /** BAR-382: Count of packages eligible for check-in (matched, no blocking issues) */
  const eligibleCount = useMemo(
    () => matchedPackages.filter((p) =>
      p.customer && !p.confirmed && !p.closedMailboxPmb
      && (!p.duplicateInfo || p.duplicateOverride)
    ).length,
    [matchedPackages]
  );

  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  useEffect(() => {
    let cancelled = false;
    searchCustomers(searchQuery).then((results) => {
      if (!cancelled) setCustomerResults(results);
    });
    return () => { cancelled = true; };
  }, [searchQuery]);

  /* ==================================================================== */
  /*  RENDER                                                              */
  /* ==================================================================== */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Intake"
        description="Snap a photo, we handle it."
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-status-violet-500/20 to-status-info-500/20 border border-status-violet-500/30 text-violet-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            AI Powered
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {checkedInCount > 0 && (
              <span className="text-sm text-surface-400">
                <span className="font-bold text-status-success-400">{checkedInCount}</span> checked in today
              </span>
            )}
            <div className="flex items-center gap-2 bg-surface-800 rounded-lg p-1 border border-surface-700">
              <button type="button"
                onClick={() => setBatchMode(false)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  !batchMode
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-surface-400 hover:text-surface-200'
                )}
              >
                <Package className="h-3.5 w-3.5" />
                Single
              </button>
              <button type="button"
                onClick={() => setBatchMode(true)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  batchMode
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-surface-400 hover:text-surface-200'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Batch
              </button>
            </div>
          </div>
        }
      />

      {/* ── PHASE: CAPTURE ──────────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Mode description */}
          <Card className="p-6 text-center border-dashed border-2 border-surface-600/60">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-status-violet-500/20 to-status-info-500/20 border border-status-violet-500/30 mb-4">
              {batchMode ? (
                <Layers className="h-8 w-8 text-status-violet-400" />
              ) : (
                <ScanLine className="h-8 w-8 text-status-violet-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-surface-100 mb-2">
              {batchMode ? 'Photograph Multiple Packages' : 'Photograph Package Label'}
            </h3>
            <p className="text-sm text-surface-400 max-w-md mx-auto mb-6">
              {batchMode
                ? 'Place packages on the counter with labels facing up. Take one photo to check in all of them at once.'
                : 'Point your camera at the shipping label, or upload a photo. AI will extract carrier, tracking, and customer info instantly.'}
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-status-error-500/10 border border-status-error-500/30 text-status-error-400 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Camera viewfinder — fullscreen overlay on mobile */}
            {cameraActive && (
              <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
                {/* Loading spinner while camera initializes */}
                {!cameraReady && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 text-status-violet-400 animate-spin mx-auto mb-3" />
                      <p className="text-surface-400 text-sm">Starting camera…</p>
                    </div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Scanning frame overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] h-[50%] border-2 border-white/40 rounded-lg relative">
                    <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-3 border-l-3 border-status-violet-400 rounded-tl-md" />
                    <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-3 border-r-3 border-status-violet-400 rounded-tr-md" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-3 border-l-3 border-status-violet-400 rounded-bl-md" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-3 border-r-3 border-status-violet-400 rounded-br-md" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-status-violet-400 to-transparent animate-pulse" />
                  </div>
                </div>

                {/* Hint text at top */}
                <div className="absolute top-12 inset-x-0 text-center pointer-events-none">
                  <p className="text-white/70 text-sm font-medium">Position the shipping label inside the frame</p>
                </div>

                {/* Bottom controls */}
                <div className="absolute bottom-8 inset-x-0 flex justify-center gap-4 px-6">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={stopCamera}
                    className="bg-black/60 backdrop-blur border-white/20 text-white hover:bg-black/80 px-6"
                  >
                    <X className="h-5 w-5 mr-2" /> Cancel
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    disabled={!cameraReady}
                    className="bg-white text-black hover:bg-surface-800 font-bold px-8 rounded-full shadow-lg disabled:opacity-50"
                    size="lg"
                  >
                    <Camera className="h-5 w-5 mr-2" /> Capture
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!cameraActive && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={startCamera}
                  disabled={cameraLoading}
                  className="bg-gradient-to-r from-status-violet-600 to-status-info-600 hover:from-status-violet-500 hover:to-status-info-500 text-white font-semibold px-8 py-6 text-base disabled:opacity-70"
                >
                  {cameraLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Starting Camera…
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      Open Camera
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  className="px-8 py-6 text-base"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}

            {cameraError && (
              <div className="mt-4 p-4 rounded-xl bg-status-warning-500/10 border border-status-warning-500/30 max-w-md mx-auto">
                <p className="text-status-warning-400 text-sm flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {cameraError}
                </p>
                {cameraPermDenied && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 w-full border-status-warning-500/30 text-status-warning-300 hover:bg-status-warning-500/10"
                    onClick={() => { setCameraError(null); setCameraPermDenied(false); fileInputRef.current?.click(); }}
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload Photo Instead
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Camera, label: 'Snap', desc: 'Photo the label', color: 'text-status-violet-400' },
              { icon: Sparkles, label: 'AI Reads', desc: 'Extracts all data', color: 'text-status-info-400' },
              { icon: CheckCircle2, label: 'Confirm', desc: 'One tap check-in', color: 'text-status-success-400' },
            ].map((step) => (
              <div key={step.label} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 mb-2">
                  <step.icon className={cn('h-5 w-5', step.color)} />
                </div>
                <p className="text-sm font-semibold text-surface-200">{step.label}</p>
                <p className="text-[11px] text-surface-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PHASE: ANALYZING ────────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            {/* Show captured image with overlay */}
            {capturedImage && (
              <div className="relative rounded-xl overflow-hidden mb-6 max-w-md mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedImage} alt="Captured label" className="w-full rounded-xl opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center bg-surface-950/50">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-status-violet-500/30 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-status-violet-400 animate-spin" />
                      </div>
                      <div className="absolute -inset-2 rounded-full border-2 border-status-violet-400/20 animate-ping" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Analyzing Label...</p>
                      <p className="text-surface-300 text-sm">AI is reading carrier, tracking & customer info</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Scanning animation steps */}
            <div className="flex justify-center gap-6 text-sm text-surface-400">
              {['Reading carrier', 'Extracting tracking #', 'Matching customer'].map((step, i) => (
                <span key={step} className="flex items-center gap-1.5 animate-pulse" style={{ animationDelay: `${i * 400}ms` }}>
                  <Sparkles className="h-3 w-3 text-status-violet-400" />
                  {step}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PHASE: REVIEW ───────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-surface-100">
                {matchedPackages.length === 1 ? 'Package Detected' : `${matchedPackages.length} Packages Detected`}
              </h3>
              {responseMode === 'demo' && (
                <Badge variant="warning">Demo Mode</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={startNew}>
                <RotateCcw className="h-4 w-4 mr-1" /> Retake
              </Button>
              {matchedPackages.length > 1 && eligibleCount > 0 && (
                <Button
                  size="sm"
                  onClick={confirmAll}
                  disabled={allConfirmed || eligibleCount === 0}
                  className="bg-status-success-600 hover:bg-status-success-500"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Check In All ({eligibleCount})
                </Button>
              )}
            </div>
          </div>

          {/* Thumbnail of captured image */}
          {capturedImage && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Scanned" className="w-20 h-14 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200">Captured Image</p>
                <p className="text-[11px] text-surface-500">
                  {matchedCount} of {matchedPackages.length} auto-matched to customers
                </p>
              </div>
              <ConfidenceBadge score={matchedPackages[0]?.result.confidence ?? 0} />
            </div>
          )}

          {/* Package cards */}
          {matchedPackages.map((pkg, idx) => {
            const effective = { ...pkg.result, ...pkg.overrides } as SmartIntakeResult;
            return (
              <Card
                key={idx}
                className={cn(
                  'p-5 transition-all duration-300',
                  pkg.confirmed && 'border-status-success-500/40 bg-status-success-500/5',
                  !pkg.customer && !pkg.confirmed && 'border-status-warning-500/40'
                )}
              >
                {/* Confirmed overlay */}
                {pkg.confirmed && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-status-success-500/20">
                    <CheckCircle2 className="h-5 w-5 text-status-success-400" />
                    <span className="text-sm font-semibold text-status-success-400">Checked In Successfully</span>
                    <span className="ml-auto text-xs text-status-success-400/60">just now</span>
                  </div>
                )}

                <div className="flex gap-4">
                  {/* Carrier logo + info */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className={cn('p-3 rounded-xl border', carrierColors[effective.carrier] ?? carrierColors.other)}>
                      <CarrierLogo carrier={effective.carrier} size={36} />
                    </div>
                    <span className="text-xs font-bold text-surface-300">
                      {carrierLabels[effective.carrier] ?? effective.carrier}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Tracking + size */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-surface-500 mb-0.5">Tracking Number</p>
                        {pkg.editing ? (
                          <Input
                            value={effective.trackingNumber}
                            onChange={(e) => updateOverride(idx, 'trackingNumber', e.target.value)}
                            className="text-sm font-mono h-8"
                          />
                        ) : (
                          <p className="text-sm font-mono text-surface-100 font-medium">{effective.trackingNumber}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          {packageSizeLabels[effective.packageSize] ?? effective.packageSize}
                        </Badge>
                        <ConfidenceBadge score={effective.confidence} />
                      </div>
                    </div>

                    {/* Recipient — BAR-346 */}
                    <div>
                      <p className="text-xs text-surface-500 mb-0.5">Recipient</p>
                      {pkg.editing ? (
                        <Input
                          value={effective.recipientName}
                          onChange={(e) => updateOverride(idx, 'recipientName', e.target.value)}
                          className="text-sm h-8"
                        />
                      ) : (
                        <p className="text-sm text-surface-200">{effective.recipientName || '\u2014'}</p>
                      )}
                    </div>

                    {/* Sender */}
                    <div>
                      <p className="text-xs text-surface-500 mb-0.5">From</p>
                      {pkg.editing ? (
                        <Input
                          value={effective.senderName}
                          onChange={(e) => updateOverride(idx, 'senderName', e.target.value)}
                          className="text-sm h-8"
                        />
                      ) : (
                        <p className="text-sm text-surface-200">{effective.senderName}</p>
                      )}
                    </div>

                    {/* Customer match */}
                    <div className="pt-2 border-t border-surface-700/50">
                      {pkg.customer ? (
                        <div className="flex items-center gap-3">
                          <CustomerAvatar
                            firstName={pkg.customer.firstName}
                            lastName={pkg.customer.lastName}
                            photoUrl={pkg.customer.photoUrl}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-surface-100">
                                {pkg.customer.firstName} {pkg.customer.lastName}
                              </p>
                              <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                                {pkg.customer.pmbNumber}
                              </span>
                            </div>
                            {pkg.customer.businessName && (
                              <p className="text-[11px] text-surface-400">{pkg.customer.businessName}</p>
                            )}
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-status-success-400 flex-shrink-0" />
                        </div>
                      ) : pkg.closedMailboxPmb ? (
                        /* BAR-382: Closed mailbox warning — show specific message */
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-status-error-500/15 flex items-center justify-center flex-shrink-0">
                            <X className="h-4 w-4 text-status-error-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-status-error-400">Mailbox Closed</p>
                            <p className="text-[11px] text-surface-500">
                              {pkg.closedMailboxPmb} is closed/inactive — cannot check in packages for this mailbox
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-status-warning-500/15 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-4 w-4 text-status-warning-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-status-warning-400">No customer match</p>
                            <p className="text-[11px] text-surface-500">
                              PMB &quot;{effective.pmbNumber || 'not detected'}&quot; — select customer manually
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSearchingForIdx(idx);
                              setSearchQuery('');
                            }}
                          >
                            Search
                          </Button>
                        </div>
                      )}

                      {/* BAR-382: Duplicate tracking number warning */}
                      {pkg.duplicateInfo && !pkg.confirmed && (
                        <div className={cn(
                          'mt-2 p-3 rounded-lg border',
                          pkg.duplicateOverride
                            ? 'bg-status-warning-500/5 border-status-warning-500/20'
                            : 'bg-status-error-500/10 border-status-error-500/30'
                        )}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={cn('h-4 w-4 flex-shrink-0 mt-0.5', pkg.duplicateOverride ? 'text-status-warning-400' : 'text-status-error-400')} />
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium', pkg.duplicateOverride ? 'text-status-warning-400' : 'text-status-error-400')}>
                                {pkg.duplicateOverride ? 'Duplicate Override' : 'Duplicate Tracking Number'}
                              </p>
                              <p className="text-[11px] text-surface-400 mt-0.5">
                                Already checked in for {pkg.duplicateInfo.customerName} ({pkg.duplicateInfo.customerPmb})
                                {pkg.duplicateInfo.checkedInAt && ` on ${new Date(pkg.duplicateInfo.checkedInAt).toLocaleDateString()}`}
                              </p>
                              {!pkg.duplicateOverride && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1.5 text-status-warning-400 hover:text-status-warning-300 hover:bg-status-warning-500/10 h-7 text-xs px-2"
                                  onClick={() => overrideDuplicate(idx, 'Re-delivery / replacement')}
                                >
                                  Override — Check In Anyway
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BAR-382: Check-in error message */}
                      {pkg.checkInError && (
                        <div className="mt-2 p-2.5 rounded-lg bg-status-error-500/10 border border-status-error-500/30 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-status-error-400 flex-shrink-0" />
                          <p className="text-xs text-status-error-400">{pkg.checkInError}</p>
                        </div>
                      )}

                      {/* Customer search dropdown */}
                      {searchingForIdx === idx && (
                        <div className="mt-2 p-3 rounded-lg bg-surface-800 border border-surface-700 space-y-2">
                          <Input
                            placeholder="Search by name, PMB, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="h-8 text-sm"
                          />
                          {customerResults.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {customerResults.map((c) => (
                                <button type="button"
                                  key={c.id}
                                  onClick={() => assignCustomer(idx, c)}
                                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-surface-700/50 transition-colors text-left"
                                >
                                  <CustomerAvatar firstName={c.firstName} lastName={c.lastName} photoUrl={c.photoUrl} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-surface-200 truncate">{c.firstName} {c.lastName}</p>
                                    <p className="text-[11px] text-surface-500">{c.pmbNumber}</p>
                                  </div>
                                  <ArrowRight className="h-3.5 w-3.5 text-surface-500" />
                                </button>
                              ))}
                            </div>
                          )}
                          {searchQuery.length >= 2 && customerResults.length === 0 && (
                            <p className="text-xs text-surface-500 py-2 text-center">No customers found</p>
                          )}
                          <button type="button"
                            onClick={() => setSearchingForIdx(null)}
                            className="text-xs text-surface-500 hover:text-surface-300 w-full text-center pt-1"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {pkg.checkingIn ? (
                      /* BAR-382: Loading state during check-in API call */
                      <div className="flex flex-col items-center gap-1.5 text-status-violet-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-[11px] font-semibold">Saving…</span>
                      </div>
                    ) : !pkg.confirmed ? (
                      <>
                        <Button
                          onClick={() => confirmPackage(idx)}
                          disabled={
                            !pkg.customer
                            || !!pkg.closedMailboxPmb
                            || (!!pkg.duplicateInfo && !pkg.duplicateOverride)
                          }
                          className="bg-status-success-600 hover:bg-status-success-500 disabled:opacity-40"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Check In
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleEdit(idx)}>
                          <Edit3 className="h-3.5 w-3.5 mr-1" />
                          {pkg.editing ? 'Done' : 'Edit'}
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-status-success-400">
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="text-[11px] font-semibold">Done</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Bottom action bar */}
          {confirmedCount > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-surface-700/50">
              <p className="text-sm text-surface-400">
                <span className="font-bold text-status-success-400">{confirmedCount}</span> of{' '}
                {matchedPackages.length} checked in
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={startNew}>
                  <Camera className="h-4 w-4 mr-1" /> Scan More
                </Button>
                <Button onClick={finishIntake} className="bg-primary-600 hover:bg-primary-500">
                  Finish <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE: SUCCESS ──────────────────────────────────────────────── */}
      {phase === 'success' && (
        <div className="max-w-lg mx-auto text-center space-y-6">
          <Card className="p-8">
            {/* Success animation */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-status-success-500/20 border-2 border-status-success-500/40 mb-4 animate-[bounceIn_0.5s_ease-out]">
              <CheckCircle2 className="h-10 w-10 text-status-success-400" />
            </div>
            <h2 className="text-2xl font-bold text-surface-100 mb-2">
              {confirmedCount} Package{confirmedCount !== 1 ? 's' : ''} Checked In
            </h2>
            <p className="text-surface-400 mb-6">
              Labels printed · Customers notified · Activity logged
            </p>

            {/* Summary pills */}
            <div className="flex justify-center gap-4 mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700 text-sm">
                <Printer className="h-3.5 w-3.5 text-surface-400" />
                <span className="text-surface-300">Labels printed</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700 text-sm">
                <Bell className="h-3.5 w-3.5 text-surface-400" />
                <span className="text-surface-300">Notifications sent</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button
                onClick={startNew}
                className="bg-gradient-to-r from-status-violet-600 to-status-info-600 hover:from-status-violet-500 hover:to-status-info-500 text-white font-semibold px-8"
              >
                <Camera className="h-5 w-5 mr-2" />
                Scan Next Package
              </Button>
              <Link href="/dashboard/packages">
                <Button variant="secondary">
                  View All Packages
                </Button>
              </Link>
            </div>
          </Card>

          {/* Session stats */}
          <div className="flex justify-center gap-6 text-sm text-surface-500">
            <span>
              <span className="font-bold text-surface-200">{checkedInCount}</span> total this session
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-status-violet-400" />
              ~3 sec per package
            </span>
          </div>
        </div>
      )}

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
