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
import { customers } from '@/lib/mock-data';
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

interface MatchedPackage {
  result: SmartIntakeResult;
  customer: Customer | null;
  confirmed: boolean;
  editing: boolean;
  /** Editable overrides */
  overrides: Partial<SmartIntakeResult>;
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
  amazon: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  ups: 'border-amber-700/40 bg-amber-900/20 text-amber-500',
  fedex: 'border-indigo-300/40 bg-indigo-50 text-indigo-600',
  usps: 'border-blue-500/40 bg-blue-50 text-blue-600',
  dhl: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  lasership: 'border-green-500/40 bg-green-500/10 text-green-400',
  temu: 'border-orange-600/40 bg-orange-600/10 text-orange-500',
  ontrac: 'border-blue-600/40 bg-blue-600/10 text-blue-300',
  walmart: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  target: 'border-red-500/40 bg-red-50 text-red-600',
  other: 'border-surface-600/40 bg-surface-700/20 text-surface-400',
};

const packageSizeLabels: Record<string, string> = {
  letter: 'Letter', pack: 'Pack', small: 'Small',
  medium: 'Medium', large: 'Large', xlarge: 'Extra Large',
};

/* -------------------------------------------------------------------------- */
/*  Customer matcher                                                          */
/* -------------------------------------------------------------------------- */
function findCustomerByPMB(pmb: string): Customer | null {
  if (!pmb) return null;
  const normalized = pmb.replace(/[^0-9]/g, '').padStart(4, '0');
  const search = `PMB-${normalized}`;
  return customers.find((c) => c.pmbNumber === search && c.status === 'active') ?? null;
}

function searchCustomers(query: string): Customer[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return customers
    .filter((c) =>
      c.status === 'active' &&
      (`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.pmbNumber.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.businessName?.toLowerCase().includes(q))
    )
    .slice(0, 5);
}

/* -------------------------------------------------------------------------- */
/*  Confidence badge                                                          */
/* -------------------------------------------------------------------------- */
function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : pct >= 75
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-red-500/20 text-red-400 border-red-500/30';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Customer search for no-match
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingForIdx, setSearchingForIdx] = useState<number | null>(null);

  const { log } = useActivityLog();

  /* ── Camera controls ───────────────────────────────────────────────── */
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setCameraReady(false);

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
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for the video to actually have data before showing ready state
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          }).catch(() => {
            setCameraError('Could not start video playback.');
          });
        };
      }
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device. Use photo upload instead.');
      } else {
        setCameraError(`Camera not available: ${msg}. Use photo upload instead.`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraReady(false);
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

      // Match each result to a customer
      const matched: MatchedPackage[] = data.results.map((r) => ({
        result: r,
        customer: findCustomerByPMB(r.pmbNumber),
        confirmed: false,
        editing: false,
        overrides: {},
      }));

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
  const confirmPackage = useCallback(
    (idx: number) => {
      setMatchedPackages((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], confirmed: true };
        return updated;
      });

      const pkg = matchedPackages[idx];
      const effectiveResult = { ...pkg.result, ...pkg.overrides };

      if (pkg.customer) {
        log({
          action: 'package.check_in',
          entityType: 'package',
          entityId: `pkg_ai_${Date.now()}_${idx}`,
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
      }
    },
    [matchedPackages, log]
  );

  const confirmAll = useCallback(() => {
    matchedPackages.forEach((pkg, idx) => {
      if (!pkg.confirmed && pkg.customer) {
        confirmPackage(idx);
      }
    });
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

  const customerResults = useMemo(() => searchCustomers(searchQuery), [searchQuery]);

  /* ==================================================================== */
  /*  RENDER                                                              */
  /* ==================================================================== */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Intake"
        description="AI-powered package check-in — snap a photo, we handle the rest"
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            AI Powered
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {checkedInCount > 0 && (
              <span className="text-sm text-surface-400">
                <span className="font-bold text-emerald-400">{checkedInCount}</span> checked in today
              </span>
            )}
            <div className="flex items-center gap-2 bg-surface-800 rounded-lg p-1 border border-surface-700">
              <button
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
              <button
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 mb-4">
              {batchMode ? (
                <Layers className="h-8 w-8 text-violet-400" />
              ) : (
                <ScanLine className="h-8 w-8 text-violet-400" />
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
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
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
                      <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto mb-3" />
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
                    <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-3 border-l-3 border-violet-400 rounded-tl-md" />
                    <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-3 border-r-3 border-violet-400 rounded-tr-md" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-3 border-l-3 border-violet-400 rounded-bl-md" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-3 border-r-3 border-violet-400 rounded-br-md" />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse" />
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
                    className="bg-white text-black hover:bg-gray-100 font-bold px-8 rounded-full shadow-lg disabled:opacity-50"
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
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold px-8 py-6 text-base"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
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
              <p className="text-amber-400 text-sm mt-3 flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {cameraError}
              </p>
            )}
          </Card>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Camera, label: 'Snap', desc: 'Photo the label', color: 'text-violet-400' },
              { icon: Sparkles, label: 'AI Reads', desc: 'Extracts all data', color: 'text-blue-400' },
              { icon: CheckCircle2, label: 'Confirm', desc: 'One tap check-in', color: 'text-emerald-400' },
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
                      <div className="w-16 h-16 rounded-full border-4 border-violet-500/30 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
                      </div>
                      <div className="absolute -inset-2 rounded-full border-2 border-violet-400/20 animate-ping" />
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
                  <Sparkles className="h-3 w-3 text-violet-400" />
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
              {matchedPackages.length > 1 && matchedCount > 0 && (
                <Button
                  size="sm"
                  onClick={confirmAll}
                  disabled={allConfirmed}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Check In All ({matchedCount})
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
                  pkg.confirmed && 'border-emerald-500/40 bg-emerald-500/5',
                  !pkg.customer && !pkg.confirmed && 'border-amber-500/40'
                )}
              >
                {/* Confirmed overlay */}
                {pkg.confirmed && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">Checked In Successfully</span>
                    <span className="ml-auto text-xs text-emerald-400/60">just now</span>
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
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-400">No customer match</p>
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
                                <button
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
                          <button
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
                    {!pkg.confirmed ? (
                      <>
                        <Button
                          onClick={() => confirmPackage(idx)}
                          disabled={!pkg.customer}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
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
                      <div className="flex flex-col items-center gap-1.5 text-emerald-400">
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
                <span className="font-bold text-emerald-400">{confirmedCount}</span> of{' '}
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 mb-4 animate-[bounceIn_0.5s_ease-out]">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
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
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold px-8"
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
              <Zap className="h-3.5 w-3.5 text-violet-400" />
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
