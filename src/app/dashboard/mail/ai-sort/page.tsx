'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { CustomerAvatar } from '@/components/ui/customer-avatar';
import { useActivityLog } from '@/components/activity-log-provider';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import type { MailSortResult, MailSortResponse } from '@/app/api/mail/ai-sort/route';
import {
  Camera,
  Upload,
  Sparkles,
  Check,
  CheckCircle2,
  X,
  RotateCcw,
  Loader2,
  Mail,
  MailOpen,
  BookOpen,
  ScrollText,
  FileText,
  Inbox,
  ArrowRight,
  AlertTriangle,
  Edit3,
  Search,
  Send,
  Bell,
  Eye,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type SortPhase = 'capture' | 'analyzing' | 'review' | 'success';

interface SortedMailPiece {
  result: MailSortResult;
  customer: Customer | null;
  confirmed: boolean;
  editing: boolean;
  overrides: Partial<MailSortResult>;
}

/* -------------------------------------------------------------------------- */
/*  Mail type config                                                          */
/* -------------------------------------------------------------------------- */
const mailTypeConfig: Record<
  string,
  { icon: typeof Mail; label: string; color: string; bgColor: string }
> = {
  letter: {
    icon: Mail,
    label: 'Letter',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15 border-blue-500/30',
  },
  magazine: {
    icon: BookOpen,
    label: 'Magazine',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/15 border-indigo-500/30',
  },
  catalog: {
    icon: ScrollText,
    label: 'Catalog',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15 border-amber-500/30',
  },
  legal: {
    icon: FileText,
    label: 'Legal',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15 border-red-500/30',
  },
  other: {
    icon: Inbox,
    label: 'Other',
    color: 'text-surface-400',
    bgColor: 'bg-surface-500/15 border-surface-600/30',
  },
};

/* -------------------------------------------------------------------------- */
/*  Customer matcher                                                          */
/* -------------------------------------------------------------------------- */
function findCustomerByPMB(pmb: string): Customer | null {
  if (!pmb) return null;
  const normalized = pmb.replace(/[^0-9]/g, '').padStart(4, '0');
  const search = `PMB-${normalized}`;
  return (
    customers.find((c) => c.pmbNumber === search && c.status === 'active') ??
    null
  );
}

function searchCustomers(query: string): Customer[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return customers
    .filter(
      (c) =>
        c.status === 'active' &&
        (`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.pmbNumber.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.businessName?.toLowerCase().includes(q)),
    )
    .slice(0, 6);
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
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}
    >
      <Sparkles className="h-3 w-3" />
      {pct}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mail type icon component                                                  */
/* -------------------------------------------------------------------------- */
function MailTypeIcon({ type }: { type: string }) {
  const config = mailTypeConfig[type] ?? mailTypeConfig.other;
  const Icon = config.icon;
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border',
        config.bgColor,
      )}
    >
      <Icon className={cn('h-4 w-4', config.color)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scanning animation                                                        */
/* -------------------------------------------------------------------------- */
function ScanningAnimation() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="aspect-[4/3] rounded-2xl border-2 border-violet-500/30 bg-surface-900/80 overflow-hidden relative">
        <div
          className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent"
          style={{ animation: 'mailScanLine 2.5s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-4 p-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <div
                className="h-12 w-16 rounded-lg border border-violet-500/20 bg-violet-500/5 animate-pulse"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-violet-500/5" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export default function AIMailSortPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
    fetch('/api/customers?limit=500').then(r => r.json()).then(d => setCustomers(d.customers || [])),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [phase, setPhase] = useState<SortPhase>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [sortedMail, setSortedMail] = useState<SortedMailPiece[]>([]);
  const [responseMode, setResponseMode] = useState<'ai' | 'demo'>('ai');
  const [routedCount, setRoutedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchingForIdx, setSearchingForIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const { log } = useActivityLog();

  /* ── Camera controls ───────────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

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
      const resp = await fetch('/api/mail/ai-sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, batch: true }),
      });

      const data: MailSortResponse = await resp.json();

      if (!data.success) {
        setError(data.error ?? 'Analysis failed');
        setPhase('capture');
        return;
      }

      setResponseMode(data.mode);

      const matched: SortedMailPiece[] = data.results.map((r) => ({
        result: r,
        customer: findCustomerByPMB(r.pmbNumber),
        confirmed: false,
        editing: false,
        overrides: {},
      }));

      setSortedMail(matched);
      setPhase('review');
    } catch {
      setError('Failed to analyze image. Please try again.');
      setPhase('capture');
    }
  }, [capturedImage]);

  useEffect(() => {
    if (capturedImage && phase === 'capture') {
      analyzeImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage]);

  /* ── Route actions ─────────────────────────────────────────────────── */
  const routePiece = useCallback(
    (idx: number) => {
      setSortedMail((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], confirmed: true };
        return updated;
      });

      const piece = sortedMail[idx];
      const effective = { ...piece.result, ...piece.overrides };

      if (piece.customer) {
        log({
          action: 'mail.receive',
          entityType: 'mail',
          entityId: `mail_ai_${Date.now()}_${idx}`,
          entityLabel: `${mailTypeConfig[effective.mailType]?.label ?? 'Mail'} from ${effective.sender}`,
          description: `AI Mail Sort: Routed ${effective.mailType} from ${effective.sender} to ${piece.customer.firstName} ${piece.customer.lastName} (${piece.customer.pmbNumber})`,
          metadata: {
            method: 'ai_mail_sort',
            mailType: effective.mailType,
            sender: effective.sender,
            customerId: piece.customer.id,
            confidence: effective.confidence,
          },
        });
      }
    },
    [sortedMail, log],
  );

  const routeAll = useCallback(() => {
    sortedMail.forEach((piece, idx) => {
      if (!piece.confirmed && piece.customer) {
        routePiece(idx);
      }
    });
  }, [sortedMail, routePiece]);

  const routeMatchedOnly = useCallback(() => {
    sortedMail.forEach((piece, idx) => {
      if (!piece.confirmed && piece.customer) {
        routePiece(idx);
      }
    });
  }, [sortedMail, routePiece]);

  const finishRouting = useCallback(() => {
    const count = sortedMail.filter((p) => p.confirmed).length;
    setRoutedCount((prev) => prev + count);
    setPhase('success');
  }, [sortedMail]);

  const startNew = useCallback(() => {
    setCapturedImage(null);
    setSortedMail([]);
    setError(null);
    setPhase('capture');
    setSearchingForIdx(null);
    setSearchQuery('');
    setEditingIdx(null);
  }, []);

  const assignCustomer = useCallback(
    (pkgIdx: number, customer: Customer) => {
      setSortedMail((prev) => {
        const updated = [...prev];
        updated[pkgIdx] = {
          ...updated[pkgIdx],
          customer,
          overrides: {
            ...updated[pkgIdx].overrides,
            pmbNumber: customer.pmbNumber,
            recipientName: `${customer.firstName} ${customer.lastName}`,
          },
        };
        return updated;
      });
      setSearchingForIdx(null);
      setSearchQuery('');
    },
    [],
  );

  const updateOverride = useCallback(
    (idx: number, field: string, value: string) => {
      setSortedMail((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          overrides: { ...updated[idx].overrides, [field]: value },
        };
        return updated;
      });
    },
    [],
  );

  /* ── Computed ──────────────────────────────────────────────────────── */
  const matchedCount = useMemo(
    () => sortedMail.filter((p) => p.customer).length,
    [sortedMail],
  );

  const unmatchedCount = useMemo(
    () => sortedMail.filter((p) => !p.customer).length,
    [sortedMail],
  );

  const confirmedCount = useMemo(
    () => sortedMail.filter((p) => p.confirmed).length,
    [sortedMail],
  );

  const allMatchedConfirmed = useMemo(
    () =>
      sortedMail.filter((p) => p.customer).length > 0 &&
      sortedMail.filter((p) => p.customer).every((p) => p.confirmed),
    [sortedMail],
  );

  const customerResults = useMemo(
    () => searchCustomers(searchQuery),
    [searchQuery],
  );

  const editPiece = editingIdx !== null ? sortedMail[editingIdx] : null;

  const uniqueCustomersRouted = useMemo(
    () =>
      new Set(
        sortedMail
          .filter((p) => p.confirmed && p.customer)
          .map((p) => p.customer!.id),
      ).size,
    [sortedMail],
  );

  const routedByType = useMemo(
    () =>
      sortedMail
        .filter((p) => p.confirmed)
        .reduce(
          (acc, p) => {
            const type = p.overrides.mailType ?? p.result.mailType;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
    [sortedMail],
  );

  const totalConfirmed = useMemo(
    () => sortedMail.filter((p) => p.confirmed).length,
    [sortedMail],
  );

  /* ==================================================================== */
  /*  RENDER                                                              */
  /* ==================================================================== */
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Mail Sort"
        description="Photograph a batch of mail — AI identifies recipients and routes to mailboxes"
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            AI Powered
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {routedCount > 0 && (
              <span className="text-sm text-surface-400">
                <span className="font-bold text-emerald-400">
                  {routedCount}
                </span>{' '}
                routed today
              </span>
            )}
            {phase !== 'capture' && phase !== 'analyzing' && (
              <Button variant="secondary" size="sm" onClick={startNew}>
                <RotateCcw className="h-3.5 w-3.5" />
                New Batch
              </Button>
            )}
          </div>
        }
      />

      {responseMode === 'demo' && phase === 'review' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Demo mode</span> — showing sample
            data. Connect an OpenAI API key for real AI sorting.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── CAPTURE ──────────────────────────────────────────────────── */}
      {phase === 'capture' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="relative overflow-hidden">
            {cameraActive ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg aspect-[4/3] object-cover bg-black"
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/20 rounded-lg" />
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-violet-400 rounded-tl" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-violet-400 rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-violet-400 rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-violet-400 rounded-br" />
                </div>
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="secondary" size="sm" onClick={stopCamera}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <button
                      onClick={capturePhoto}
                      className="h-14 w-14 rounded-full bg-white border-4 border-violet-400 hover:border-violet-300 transition-colors shadow-lg shadow-violet-500/20 flex items-center justify-center"
                    >
                      <div className="h-11 w-11 rounded-full bg-white hover:bg-surface-100 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            ) : capturedImage ? (
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured mail"
                  className="w-full rounded-lg aspect-[4/3] object-cover"
                />
                <button
                  onClick={() => setCapturedImage(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 mb-5">
                  <Mail className="h-10 w-10 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-surface-100 mb-2">
                  Photograph Mail Batch
                </h3>
                <p className="text-sm text-surface-400 max-w-sm mb-6">
                  Spread 10-20 mail pieces on the counter and take a photo. AI
                  will identify each piece and match to customer mailboxes.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={startCamera}>
                    <Camera className="h-4 w-4" />
                    Open Camera
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </Button>
                </div>
                {cameraError && (
                  <p className="mt-3 text-xs text-amber-400">{cameraError}</p>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Card>

          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-surface-200 mb-4">
                How It Works
              </h3>
              <div className="space-y-4">
                {[
                  { step: '1', title: 'Spread mail on counter', desc: 'Lay out 10-20 pieces so addresses are visible' },
                  { step: '2', title: 'Take a photo', desc: 'AI scans every piece simultaneously' },
                  { step: '3', title: 'Review matches', desc: 'Auto-matched to customer mailboxes by PMB' },
                  { step: '4', title: 'Route all', desc: 'One tap to sort and notify all customers' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold border border-violet-500/30">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{title}</p>
                      <p className="text-xs text-surface-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-surface-200">
                  Optimized for Batch
                </h3>
              </div>
              <p className="text-xs text-surface-400 leading-relaxed">
                Unlike single-piece scanning, AI Mail Sort is designed for high
                throughput. Photograph your entire incoming mail delivery at once
                — the AI processes all pieces in parallel and auto-matches to
                customer PMBs.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ── ANALYZING ────────────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <Card>
          <div className="flex flex-col items-center py-12">
            <ScanningAnimation />
            <div className="mt-8 text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
                <h3 className="text-lg font-semibold text-surface-100">
                  Analyzing Mail...
                </h3>
              </div>
              <p className="text-sm text-surface-400">
                AI is identifying recipients, senders, and mail types for each piece
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── REVIEW ───────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <>
          <Card padding="sm">
            <div className="flex items-center justify-between flex-wrap gap-3 px-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-surface-300">
                  <span className="font-bold text-surface-100">{sortedMail.length}</span> pieces detected
                </span>
                <span className="text-surface-600">&middot;</span>
                <span className="text-surface-300">
                  <span className="font-bold text-emerald-400">{matchedCount}</span> auto-matched
                </span>
                {unmatchedCount > 0 && (
                  <>
                    <span className="text-surface-600">&middot;</span>
                    <span className="text-surface-300">
                      <span className="font-bold text-amber-400">{unmatchedCount}</span> need review
                    </span>
                  </>
                )}
                {confirmedCount > 0 && (
                  <>
                    <span className="text-surface-600">&middot;</span>
                    <span className="text-surface-300">
                      <span className="font-bold text-violet-400">{confirmedCount}</span> routed
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={routeMatchedOnly} disabled={allMatchedConfirmed}>
                  <Check className="h-3.5 w-3.5" />
                  Route Matched Only
                </Button>
                <Button size="sm" onClick={routeAll} disabled={allMatchedConfirmed}>
                  <Send className="h-3.5 w-3.5" />
                  Route All
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sortedMail.map((piece, idx) => {
              const effective = { ...piece.result, ...piece.overrides };
              const config = mailTypeConfig[effective.mailType] ?? mailTypeConfig.other;
              const isUnmatched = !piece.customer;

              return (
                <Card
                  key={idx}
                  padding="none"
                  className={cn(
                    'transition-all duration-200',
                    piece.confirmed && 'ring-1 ring-emerald-500/40 bg-emerald-500/5',
                    isUnmatched && !piece.confirmed && 'ring-1 ring-amber-500/30',
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <MailTypeIcon type={effective.mailType} />
                        <div>
                          <p className="text-sm font-semibold text-surface-100 leading-tight">
                            {effective.recipientName || 'Unknown Recipient'}
                          </p>
                          <p className="text-xs text-surface-400 mt-0.5">
                            {config.label} from {effective.sender || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <ConfidenceBadge score={effective.confidence ?? piece.result.confidence} />
                    </div>

                    {piece.customer ? (
                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-800/60 border border-surface-700/50">
                        <CustomerAvatar
                          firstName={piece.customer.firstName}
                          lastName={piece.customer.lastName}
                          photoUrl={piece.customer.photoUrl}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-200 truncate">
                            {piece.customer.firstName} {piece.customer.lastName}
                          </p>
                          <p className="text-xs text-surface-400">
                            {piece.customer.pmbNumber}
                            {piece.customer.businessName && ` \u00b7 ${piece.customer.businessName}`}
                          </p>
                        </div>
                        {piece.confirmed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        ) : (
                          <Badge variant="success" dot={false} className="text-[10px]">
                            Matched
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        {searchingForIdx === idx ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Search by name or PMB..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              leftIcon={<Search className="h-4 w-4" />}
                              className="!bg-surface-900"
                            />
                            {customerResults.length > 0 && (
                              <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-700 bg-surface-900">
                                {customerResults.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => assignCustomer(idx, c)}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-surface-800 transition-colors text-left"
                                  >
                                    <CustomerAvatar
                                      firstName={c.firstName}
                                      lastName={c.lastName}
                                      photoUrl={c.photoUrl}
                                      size="xs"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-surface-200 truncate">
                                        {c.firstName} {c.lastName}
                                      </p>
                                      <p className="text-xs text-surface-400">{c.pmbNumber}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => { setSearchingForIdx(null); setSearchQuery(''); }}
                              className="text-xs text-surface-400 hover:text-surface-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                              <span className="text-sm text-amber-300">No PMB match found</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSearchingForIdx(idx)}>
                              <Search className="h-3.5 w-3.5" />
                              Assign
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-800">
                      <button
                        onClick={() => setEditingIdx(idx)}
                        className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      {!piece.confirmed && piece.customer && (
                        <Button size="sm" onClick={() => routePiece(idx)}>
                          <ArrowRight className="h-3.5 w-3.5" />
                          Route
                        </Button>
                      )}
                      {piece.confirmed && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Routed
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {confirmedCount > 0 && (
            <div className="flex justify-center">
              <Button size="lg" onClick={finishRouting}>
                <CheckCircle2 className="h-5 w-5" />
                Finish &mdash; {confirmedCount} Piece{confirmedCount !== 1 ? 's' : ''} Routed
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── SUCCESS ──────────────────────────────────────────────────── */}
      {phase === 'success' && (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-5">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-surface-100 mb-2">
              Mail Sorted &amp; Routed
            </h3>
            <p className="text-sm text-surface-400 max-w-md mb-2">
              Successfully routed{' '}
              <span className="font-semibold text-emerald-400">{totalConfirmed}</span>{' '}
              mail piece{totalConfirmed !== 1 ? 's' : ''} to customer mailboxes.
            </p>

            <div className="mt-6 mb-8 w-full max-w-lg">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(routedByType).map(([type, count]) => {
                  const cfg = mailTypeConfig[type] ?? mailTypeConfig.other;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700/50"
                    >
                      <Icon className={cn('h-4 w-4', cfg.color)} />
                      <span className="text-sm text-surface-200">
                        {count} {cfg.label}{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
              <Bell className="h-4 w-4" />
              <span>
                Arrival notifications queued for {uniqueCustomersRouted} customer{uniqueCustomersRouted !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={startNew}>
                <Camera className="h-4 w-4" />
                Sort Another Batch
              </Button>
              <Button variant="secondary" onClick={startNew}>
                <MailOpen className="h-4 w-4" />
                Done
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
      <Modal
        open={editingIdx !== null}
        onClose={() => setEditingIdx(null)}
        title="Edit Mail Piece"
        description="Correct any details the AI may have misread"
        footer={
          <Button onClick={() => setEditingIdx(null)}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        }
      >
        {editPiece && editingIdx !== null && (
          <div className="space-y-4">
            <Input
              label="Recipient Name"
              value={editPiece.overrides.recipientName ?? editPiece.result.recipientName}
              onChange={(e) => updateOverride(editingIdx, 'recipientName', e.target.value)}
            />
            <Input
              label="PMB Number"
              value={editPiece.overrides.pmbNumber ?? editPiece.result.pmbNumber}
              onChange={(e) => {
                updateOverride(editingIdx, 'pmbNumber', e.target.value);
                const customer = findCustomerByPMB(e.target.value);
                if (customer) {
                  setSortedMail((prev) => {
                    const updated = [...prev];
                    updated[editingIdx] = { ...updated[editingIdx], customer };
                    return updated;
                  });
                }
              }}
            />
            <Input
              label="Sender"
              value={editPiece.overrides.sender ?? editPiece.result.sender}
              onChange={(e) => updateOverride(editingIdx, 'sender', e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-300">Mail Type</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(mailTypeConfig).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  const currentType = editPiece.overrides.mailType ?? editPiece.result.mailType;
                  return (
                    <button
                      key={type}
                      onClick={() => updateOverride(editingIdx, 'mailType', type)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-xs',
                        currentType === type
                          ? `${cfg.bgColor} ${cfg.color} font-semibold`
                          : 'border-surface-700 text-surface-400 hover:border-surface-600 hover:text-surface-300',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mailScanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      ` }} />
    </div>
  );
}
