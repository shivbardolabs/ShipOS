'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { useActivityLog } from '@/components/activity-log-provider';
import { customers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { IdScanResult, IdScanResponse } from '@/app/api/customers/id-scan/route';
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
  ScanLine,
  AlertTriangle,
  UserPlus,
  CreditCard,
  Shield,
  MapPin,
  Calendar,
  Hash,
  User,
  FileText,
  Building2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type OnboardPhase = 'capture' | 'analyzing' | 'review' | 'success';

type IdTypeOption = 'drivers_license' | 'passport' | 'military_id' | 'other';

interface CustomerFormData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string;
  idNumber: string;
  expirationDate: string;
  idType: IdTypeOption;
  email: string;
  phone: string;
  businessName: string;
  pmbNumber: string;
}

/* -------------------------------------------------------------------------- */
/*  ID type config                                                            */
/* -------------------------------------------------------------------------- */
const idTypeLabels: Record<IdTypeOption, string> = {
  drivers_license: "Driver's License",
  passport: 'Passport',
  military_id: 'Military ID',
  other: 'Other',
};

const idTypeIcons: Record<IdTypeOption, typeof CreditCard> = {
  drivers_license: CreditCard,
  passport: FileText,
  military_id: Shield,
  other: CreditCard,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function getNextPMB(): string {
  const usedNumbers = customers
    .map((c) => parseInt(c.pmbNumber.replace('PMB-', ''), 10))
    .filter((n) => !isNaN(n));
  const max = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
  return `PMB-${String(max + 1).padStart(4, '0')}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
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
      {pct}% confidence
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  State selector                                                            */
/* -------------------------------------------------------------------------- */
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function AiOnboardPage() {
  const [phase, setPhase] = useState<OnboardPhase>('capture');
  const [selectedIdType, setSelectedIdType] = useState<IdTypeOption>('drivers_license');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [_scanResult, setScanResult] = useState<IdScanResult | null>(null);
  const [responseMode, setResponseMode] = useState<'ai' | 'demo'>('ai');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  // Form state
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    dateOfBirth: '',
    idNumber: '',
    expirationDate: '',
    idType: 'drivers_license',
    email: '',
    phone: '',
    businessName: '',
    pmbNumber: '',
  });

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { log } = useActivityLog();

  /* ── Camera controls ───────────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera not available. Use photo upload instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
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
      const resp = await fetch('/api/customers/id-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, idType: selectedIdType }),
      });

      const data: IdScanResponse = await resp.json();

      if (!data.success) {
        setError(data.error ?? 'Analysis failed');
        setPhase('capture');
        return;
      }

      setResponseMode(data.mode);

      if (!data.result) {
        setError('Could not extract information from the ID. Please try again.');
        setPhase('capture');
        return;
      }

      const result = data.result;
      setScanResult(result);
      setConfidence(result.confidence);

      // Pre-populate form with extracted data
      const nextPMB = getNextPMB();
      setFormData({
        firstName: result.firstName || '',
        lastName: result.lastName || '',
        address: result.address || '',
        city: result.city || '',
        state: result.state || '',
        zipCode: result.zipCode || '',
        dateOfBirth: result.dateOfBirth || '',
        idNumber: result.idNumber || '',
        expirationDate: result.expirationDate || '',
        idType: result.idType || selectedIdType,
        email: '',
        phone: '',
        businessName: '',
        pmbNumber: nextPMB,
      });

      setPhase('review');
    } catch {
      setError('Failed to analyze image. Please try again.');
      setPhase('capture');
    }
  }, [capturedImage, selectedIdType]);

  // Auto-analyze when image is captured
  useEffect(() => {
    if (capturedImage && phase === 'capture') {
      analyzeImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage]);

  /* ── Form handling ─────────────────────────────────────────────────── */
  const updateField = useCallback((field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const createCustomer = useCallback(() => {
    // Log the customer creation
    log({
      action: 'customer.create',
      entityType: 'customer',
      entityId: `cust_ai_${Date.now()}`,
      entityLabel: formData.pmbNumber,
      description: `AI Onboard: Created ${formData.firstName} ${formData.lastName} (${formData.pmbNumber})${formData.businessName ? ` — ${formData.businessName}` : ''}`,
      metadata: {
        method: 'ai_id_scan',
        idType: formData.idType,
        confidence: confidence,
        pmbNumber: formData.pmbNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
      },
    });

    setCreatedCount((prev) => prev + 1);
    setPhase('success');
  }, [formData, confidence, log]);

  const startNew = useCallback(() => {
    setCapturedImage(null);
    setScanResult(null);
    setError(null);
    setConfidence(0);
    setFormData({
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      dateOfBirth: '',
      idNumber: '',
      expirationDate: '',
      idType: 'drivers_license',
      email: '',
      phone: '',
      businessName: '',
      pmbNumber: '',
    });
    setPhase('capture');
  }, []);

  /* ── Computed ──────────────────────────────────────────────────────── */
  const isFormValid = useMemo(() => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.pmbNumber.trim() !== ''
    );
  }, [formData.firstName, formData.lastName, formData.pmbNumber]);

  const IdTypeIcon = idTypeIcons[formData.idType] ?? CreditCard;

  /* ==================================================================== */
  /*  RENDER                                                              */
  /* ==================================================================== */
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Customer Onboard"
        description="Scan a government ID to auto-fill customer details — fast and accurate"
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            AI Powered
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {createdCount > 0 && (
              <span className="text-sm text-surface-400">
                <span className="font-bold text-emerald-400">{createdCount}</span> onboarded today
              </span>
            )}
          </div>
        }
      />

      {/* ── PHASE: CAPTURE ──────────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* ID type selector */}
          <Card className="p-5">
            <p className="text-sm font-medium text-surface-300 mb-3">ID Type</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(idTypeLabels) as IdTypeOption[]).map((type) => {
                const Icon = idTypeIcons[type];
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedIdType(type)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                      selectedIdType === type
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                        : 'bg-surface-800/50 border-surface-700 text-surface-400 hover:border-surface-600 hover:text-surface-300'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {idTypeLabels[type]}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Capture card */}
          <Card className="p-6 text-center border-dashed border-2 border-surface-600/60">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 mb-4">
              <ScanLine className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-100 mb-2">
              Scan {idTypeLabels[selectedIdType]}
            </h3>
            <p className="text-sm text-surface-400 max-w-md mx-auto mb-6">
              Point your camera at the front of the ID, or upload a photo. AI will extract name, address, DOB, and ID number instantly.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Camera viewfinder */}
            {cameraActive && (
              <div className="relative rounded-xl overflow-hidden mb-4 bg-black max-w-lg mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                />
                {/* Scanning frame overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] h-[55%] border-2 border-white/40 rounded-lg relative">
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-violet-400 rounded-tl-md" />
                    <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-violet-400 rounded-tr-md" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-violet-400 rounded-bl-md" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-violet-400 rounded-br-md" />
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-pulse" />
                  </div>
                </div>
                {/* ID outline hint */}
                <div className="absolute top-3 inset-x-0 text-center">
                  <span className="text-xs text-white/60 bg-black/40 px-2 py-1 rounded-full">
                    Align ID within the frame
                  </span>
                </div>
                <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                  <Button variant="secondary" size="sm" onClick={stopCamera}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    className="bg-white text-black hover:bg-gray-100 font-bold px-6"
                    size="sm"
                  >
                    <Camera className="h-4 w-4 mr-1" /> Capture
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
                  capture="environment"
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
              { icon: Camera, label: 'Scan ID', desc: 'Photo the ID', color: 'text-violet-400' },
              { icon: Sparkles, label: 'AI Extracts', desc: 'Reads all fields', color: 'text-blue-400' },
              { icon: UserPlus, label: 'Create', desc: 'One-click onboard', color: 'text-emerald-400' },
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
                <img src={capturedImage} alt="Captured ID" className="w-full rounded-xl opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center bg-surface-950/50">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-violet-500/30 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
                      </div>
                      <div className="absolute -inset-2 rounded-full border-2 border-violet-400/20 animate-ping" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Reading ID...</p>
                      <p className="text-surface-300 text-sm">AI is extracting personal information</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Scanning animation steps */}
            <div className="flex justify-center gap-6 text-sm text-surface-400">
              {['Reading name', 'Extracting address', 'Verifying ID #'].map((step, i) => (
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
              <h3 className="text-lg font-semibold text-surface-100">Review & Create Customer</h3>
              {responseMode === 'demo' && (
                <Badge variant="warning">Demo Mode</Badge>
              )}
              {confidence > 0 && <ConfidenceBadge score={confidence} />}
            </div>
            <Button variant="ghost" size="sm" onClick={startNew}>
              <RotateCcw className="h-4 w-4 mr-1" /> Rescan
            </Button>
          </div>

          {/* Captured image thumbnail */}
          {capturedImage && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Scanned ID" className="w-20 h-14 rounded-md object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-200">Scanned {idTypeLabels[formData.idType]}</p>
                <p className="text-[11px] text-surface-500">
                  Fields auto-populated from AI scan — review and edit as needed
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/30">
                <IdTypeIcon className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[11px] font-semibold text-violet-300">{idTypeLabels[formData.idType]}</span>
              </div>
            </div>
          )}

          {/* ── Personal Information ────────────────────────────────────── */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-700/50">
              <User className="h-4 w-4 text-violet-400" />
              <h4 className="text-sm font-semibold text-surface-200">Personal Information</h4>
              <span className="text-[11px] text-surface-500 ml-auto">Extracted from ID</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="First name"
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Last name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                value={formData.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                placeholder="YYYY-MM-DD"
                leftIcon={<Calendar className="h-4 w-4" />}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-surface-300">ID Type</label>
                <select
                  value={formData.idType}
                  onChange={(e) => updateField('idType', e.target.value)}
                  className="h-10 rounded-lg border border-surface-700 bg-surface-800 px-3 text-sm text-surface-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {(Object.keys(idTypeLabels) as IdTypeOption[]).map((type) => (
                    <option key={type} value={type}>
                      {idTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="ID Number"
                value={formData.idNumber}
                onChange={(e) => updateField('idNumber', e.target.value)}
                placeholder="ID / License number"
                leftIcon={<Hash className="h-4 w-4" />}
              />
              <Input
                label="Expiration Date"
                value={formData.expirationDate}
                onChange={(e) => updateField('expirationDate', e.target.value)}
                placeholder="YYYY-MM-DD"
                leftIcon={<Calendar className="h-4 w-4" />}
              />
            </div>
          </Card>

          {/* ── Address ─────────────────────────────────────────────────── */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-700/50">
              <MapPin className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-surface-200">Address</h4>
              <span className="text-[11px] text-surface-500 ml-auto">From ID</span>
            </div>

            <Input
              label="Street Address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Street address"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-surface-300">State</label>
                <select
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="h-10 rounded-lg border border-surface-700 bg-surface-800 px-3 text-sm text-surface-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Select</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Zip Code"
                value={formData.zipCode}
                onChange={(e) => updateField('zipCode', e.target.value)}
                placeholder="Zip"
              />
            </div>
          </Card>

          {/* ── PMB & Contact ───────────────────────────────────────────── */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-700/50">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-surface-200">Mailbox & Contact</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="PMB Number"
                  value={formData.pmbNumber}
                  onChange={(e) => updateField('pmbNumber', e.target.value)}
                  placeholder="PMB-XXXX"
                  leftIcon={<Hash className="h-4 w-4" />}
                />
                <p className="text-[11px] text-surface-500 mt-1">
                  Next available: {getNextPMB()}
                </p>
              </div>
              <Input
                label="Business Name"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                placeholder="Optional"
                leftIcon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="customer@example.com"
                type="email"
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
              />
            </div>
          </Card>

          {/* ── Form 1583 Compliance ────────────────────────────────────── */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-surface-700/50 mb-3">
              <Shield className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-surface-200">Form 1583 Compliance</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <IdTypeIcon className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[11px] text-surface-500">ID Type</p>
                  <p className="text-sm font-medium text-surface-200">{idTypeLabels[formData.idType]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <Hash className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[11px] text-surface-500">ID Number</p>
                  <p className="text-sm font-medium text-surface-200 font-mono">{formData.idNumber || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <Calendar className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[11px] text-surface-500">ID Expires</p>
                  <p className="text-sm font-medium text-surface-200">{formatDate(formData.expirationDate) || '—'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Action bar ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between pt-4 border-t border-surface-700/50">
            <p className="text-sm text-surface-400">
              Review all fields, then create the customer record.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={startNew}>
                <RotateCcw className="h-4 w-4 mr-1" /> Start Over
              </Button>
              <Button
                onClick={createCustomer}
                disabled={!isFormValid}
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold disabled:opacity-40"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Create Customer
              </Button>
            </div>
          </div>
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
              Customer Created
            </h2>
            <p className="text-surface-400 mb-6">
              {formData.firstName} {formData.lastName} has been onboarded successfully.
            </p>

            {/* Customer summary card */}
            <div className="text-left p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <CustomerAvatar
                  firstName={formData.firstName}
                  lastName={formData.lastName}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-surface-100">
                    {formData.firstName} {formData.lastName}
                  </p>
                  {formData.businessName && (
                    <p className="text-sm text-surface-400">{formData.businessName}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-mono text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                    {formData.pmbNumber}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-700/50">
                {formData.address && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-surface-500">Address</p>
                    <p className="text-sm text-surface-300">
                      {formData.address}{formData.city ? `, ${formData.city}` : ''}{formData.state ? `, ${formData.state}` : ''} {formData.zipCode}
                    </p>
                  </div>
                )}
                {formData.email && (
                  <div>
                    <p className="text-[11px] text-surface-500">Email</p>
                    <p className="text-sm text-surface-300">{formData.email}</p>
                  </div>
                )}
                {formData.phone && (
                  <div>
                    <p className="text-[11px] text-surface-500">Phone</p>
                    <p className="text-sm text-surface-300">{formData.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-surface-500">ID Type</p>
                  <p className="text-sm text-surface-300">{idTypeLabels[formData.idType]}</p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-500">ID Expires</p>
                  <p className="text-sm text-surface-300">{formatDate(formData.expirationDate) || '—'}</p>
                </div>
              </div>
            </div>

            {/* Compliance status */}
            <div className="flex justify-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700 text-sm">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-surface-300">Form 1583 pending</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700 text-sm">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-surface-300">ID verified</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button
                onClick={startNew}
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold px-8"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Onboard Another
              </Button>
              <Link href="/dashboard/customers">
                <Button variant="secondary">
                  View All Customers
                </Button>
              </Link>
            </div>
          </Card>

          {/* Session stats */}
          <div className="flex justify-center gap-6 text-sm text-surface-500">
            <span>
              <span className="font-bold text-surface-200">{createdCount}</span> onboarded this session
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-violet-400" />
              ~5 sec per customer
            </span>
          </div>
        </div>
      )}

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
