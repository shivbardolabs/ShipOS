'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { useActivityLog } from '@/components/activity-log-provider';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { AuditDiscrepancy, AuditResponse } from '@/app/api/reconciliation/ai-audit/route';
import {
  FileText,
  Sparkles,
  Search,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Scale,
  ArrowRight,
  DollarSign,
  ShieldAlert,
  BarChart3,
  Zap,
  FileUp,
  XCircle,
  RotateCcw,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type AuditPhase = 'upload' | 'analyzing' | 'results';

interface AnalysisStep {
  label: string;
  status: 'pending' | 'active' | 'complete';
}

/* -------------------------------------------------------------------------- */
/*  Discrepancy styling                                                       */
/* -------------------------------------------------------------------------- */
const discrepancyLabels: Record<string, string> = {
  weight_overcharge: 'Weight Overcharge',
  service_mismatch: 'Service Mismatch',
  duplicate_charge: 'Duplicate Charge',
  invalid_surcharge: 'Invalid Surcharge',
  address_correction: 'Address Correction',
  residential_surcharge: 'Residential Surcharge',
  late_delivery: 'Late Delivery',
};

const discrepancyColors: Record<string, string> = {
  weight_overcharge: 'bg-red-500/15 text-red-400 border-red-500/25',
  service_mismatch: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  duplicate_charge: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  invalid_surcharge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  address_correction: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  residential_surcharge: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  late_delivery: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
};

/* -------------------------------------------------------------------------- */
/*  Carrier selector options                                                  */
/* -------------------------------------------------------------------------- */
const CARRIERS = [
  { id: 'ups', label: 'UPS' },
  { id: 'fedex', label: 'FedEx' },
  { id: 'usps', label: 'USPS' },
  { id: 'dhl', label: 'DHL' },
] as const;

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
      {pct}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Animated count-up hook                                                    */
/* -------------------------------------------------------------------------- */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* -------------------------------------------------------------------------- */
/*  AI Audit Page                                                             */
/* -------------------------------------------------------------------------- */
export default function AIAuditPage() {
  const [phase, setPhase] = useState<AuditPhase>('upload');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('ups');
  const [fileName, setFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);
  const [disputedIds, setDisputedIds] = useState<Set<string>>(new Set());
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { label: 'Parsing invoice data', status: 'pending' },
    { label: 'Cross-referencing shipment records', status: 'pending' },
    { label: 'Identifying discrepancies', status: 'pending' },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { log } = useActivityLog();

  const animatedOvercharges = useCountUp(
    phase === 'results' && auditResult ? auditResult.summary.totalOvercharges : 0,
    1500
  );

  /* ── File handling ─────────────────────────────────────────────────── */
  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');

      if (!isPdf && !isCsv) {
        setError('Please upload a PDF or CSV file');
        return;
      }

      // Start analysis phase
      setPhase('analyzing');
      setAnalysisSteps([
        { label: 'Parsing invoice data', status: 'active' },
        { label: 'Cross-referencing shipment records', status: 'pending' },
        { label: 'Identifying discrepancies', status: 'pending' },
      ]);

      // Animate steps
      setTimeout(() => {
        setAnalysisSteps([
          { label: 'Parsing invoice data', status: 'complete' },
          { label: 'Cross-referencing shipment records', status: 'active' },
          { label: 'Identifying discrepancies', status: 'pending' },
        ]);
      }, 800);

      setTimeout(() => {
        setAnalysisSteps([
          { label: 'Parsing invoice data', status: 'complete' },
          { label: 'Cross-referencing shipment records', status: 'complete' },
          { label: 'Identifying discrepancies', status: 'active' },
        ]);
      }, 1600);

      try {
        let invoiceData: string;
        const format: 'pdf' | 'csv' = isPdf ? 'pdf' : 'csv';

        if (isPdf) {
          const buffer = await file.arrayBuffer();
          invoiceData = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
        } else {
          invoiceData = await file.text();
        }

        const res = await fetch('/api/reconciliation/ai-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoice: invoiceData,
            carrier: selectedCarrier,
            format,
          }),
        });

        const data: AuditResponse = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Audit failed');
        }

        // Complete animation
        setAnalysisSteps([
          { label: 'Parsing invoice data', status: 'complete' },
          { label: 'Cross-referencing shipment records', status: 'complete' },
          { label: 'Identifying discrepancies', status: 'complete' },
        ]);

        setTimeout(() => {
          setAuditResult(data);
          setPhase('results');
          setDisputedIds(new Set());
          log({
            action: 'report.generate',
            entityType: 'reconciliation',
            entityId: `audit_${Date.now()}`,
            entityLabel: file.name,
            description: `AI audit of ${selectedCarrier.toUpperCase()} invoice found ${data.summary.discrepancyCount} discrepancies (${formatCurrency(data.summary.totalOvercharges)} in overcharges)`,
          });
        }, 600);
      } catch (err) {
        console.error('Audit error:', err);
        setError(err instanceof Error ? err.message : 'Failed to analyze invoice');
        setPhase('upload');
      }
    },
    [selectedCarrier, log]
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDispute = useCallback(
    (id: string) => {
      setDisputedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      const disc = auditResult?.discrepancies.find((d) => d.id === id);
      if (disc) {
        log({
          action: 'invoice.create',
          entityType: 'dispute',
          entityId: id,
          entityLabel: disc.trackingNumber,
          description: `Filed dispute for ${discrepancyLabels[disc.type] || disc.type} on ${disc.trackingNumber} — ${formatCurrency(disc.overchargeAmount)} overcharge`,
        });
      }
    },
    [auditResult, log]
  );

  const handleDisputeAll = useCallback(() => {
    if (!auditResult) return;
    const allIds = new Set(auditResult.discrepancies.map((d) => d.id));
    setDisputedIds(allIds);
    log({
      action: 'invoice.create',
      entityType: 'dispute',
      entityId: `batch_${Date.now()}`,
      entityLabel: `${auditResult.summary.discrepancyCount} discrepancies`,
      description: `Filed batch dispute for ${auditResult.summary.discrepancyCount} discrepancies totaling ${formatCurrency(auditResult.summary.totalOvercharges)}`,
    });
  }, [auditResult, log]);

  const handleExport = useCallback(() => {
    if (!auditResult) return;

    const lines = [
      'Type,Tracking Number,Description,Charged,Correct,Overcharge,Confidence',
      ...auditResult.discrepancies.map(
        (d) =>
          `"${discrepancyLabels[d.type] || d.type}","${d.trackingNumber}","${d.description}",${d.chargedAmount},${d.correctAmount},${d.overchargeAmount},${Math.round(d.confidence * 100)}%`
      ),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${selectedCarrier}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    log({
      action: 'report.export',
      entityType: 'reconciliation',
      entityId: `export_${Date.now()}`,
      entityLabel: 'Audit Report',
      description: `Exported AI audit report for ${selectedCarrier.toUpperCase()} with ${auditResult.summary.discrepancyCount} findings`,
    });
  }, [auditResult, selectedCarrier, log]);

  const resetAudit = useCallback(() => {
    setPhase('upload');
    setAuditResult(null);
    setFileName('');
    setError(null);
    setDisputedIds(new Set());
    setAnalysisSteps([
      { label: 'Parsing invoice data', status: 'pending' },
      { label: 'Cross-referencing shipment records', status: 'pending' },
      { label: 'Identifying discrepancies', status: 'pending' },
    ]);
  }, []);

  /* ── DataTable columns ─────────────────────────────────────────────── */
  const columns: Column<AuditDiscrepancy & Record<string, unknown>>[] = [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${discrepancyColors[row.type as string] || 'bg-surface-700 text-surface-300 border-surface-600'}`}
        >
          {discrepancyLabels[row.type as string] || (row.type as string)}
        </span>
      ),
    },
    {
      key: 'trackingNumber',
      label: 'Tracking #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-primary-400">{row.trackingNumber as string}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <span className="text-surface-300 text-xs leading-relaxed line-clamp-2">
          {row.description as string}
        </span>
      ),
    },
    {
      key: 'chargedAmount',
      label: 'Charged',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-200 font-medium text-sm">
          {formatCurrency(row.chargedAmount as number)}
        </span>
      ),
    },
    {
      key: 'correctAmount',
      label: 'Correct',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-400 text-sm">
          {formatCurrency(row.correctAmount as number)}
        </span>
      ),
    },
    {
      key: 'overchargeAmount',
      label: 'Overcharge',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-red-400 font-semibold text-sm">
          +{formatCurrency(row.overchargeAmount as number)}
        </span>
      ),
    },
    {
      key: 'confidence',
      label: 'Confidence',
      align: 'center',
      render: (row) => <ConfidenceBadge score={row.confidence as number} />,
    },
    {
      key: 'actions',
      label: '',
      width: 'w-28',
      render: (row) => {
        const isDisputed = disputedIds.has(row.id as string);
        return isDisputed ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Disputed
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            onClick={(e) => {
              e.stopPropagation();
              handleDispute(row.id as string);
            }}
          >
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            Dispute
          </Button>
        );
      },
    },
  ];

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Carrier Bill Auditor"
        icon={<Sparkles className="h-5 w-5 text-violet-400" />}
        description="Upload a carrier invoice and let AI find overcharges and billing discrepancies"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/25">
            <Zap className="h-3 w-3" />
            AI-Powered
          </span>
        }
        actions={
          phase === 'results' ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleExport}
              >
                Export Report
              </Button>
              <Button
                variant="secondary"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={resetAudit}
              >
                New Audit
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ── Upload Phase ─────────────────────────────────────────────── */}
      {phase === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload zone */}
          <Card className="lg:col-span-2">
            <div className="space-y-5">
              {/* Carrier selector */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-3">
                  Select Carrier
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {CARRIERS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCarrier(c.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                        selectedCarrier === c.id
                          ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/5'
                          : 'border-surface-700 bg-surface-900 hover:border-surface-600 hover:bg-surface-800'
                      )}
                    >
                      <CarrierLogo carrier={c.id} size={20} />
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          selectedCarrier === c.id ? 'text-violet-300' : 'text-surface-400'
                        )}
                      >
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300',
                  dragOver
                    ? 'border-violet-400 bg-violet-500/10 scale-[1.01]'
                    : 'border-surface-700 bg-surface-900/50 hover:border-surface-500 hover:bg-surface-800/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
                    dragOver
                      ? 'bg-violet-500/20 text-violet-400 scale-110'
                      : 'bg-surface-800 text-surface-400'
                  )}
                >
                  <FileUp className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-surface-200">
                    Drop your carrier invoice here, or{' '}
                    <span className="text-violet-400 underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-xs text-surface-500 mt-1.5">
                    Supports PDF and CSV formats • Max 25MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Info sidebar */}
          <Card className="lg:col-span-1">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  How It Works
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  AI-powered analysis of carrier invoices
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: <FileText className="h-4 w-4" />,
                    title: 'Upload Invoice',
                    desc: 'Drop your carrier invoice PDF or CSV file',
                  },
                  {
                    icon: <Search className="h-4 w-4" />,
                    title: 'AI Analysis',
                    desc: 'GPT-4o parses line items and cross-references records',
                  },
                  {
                    icon: <AlertTriangle className="h-4 w-4" />,
                    title: 'Find Discrepancies',
                    desc: 'Overcharges, duplicates, and billing errors identified',
                  },
                  {
                    icon: <DollarSign className="h-4 w-4" />,
                    title: 'Recover Savings',
                    desc: 'File disputes and get credits for overcharges',
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 flex-shrink-0 mt-0.5">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{step.title}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-surface-800">
                <p className="text-[11px] text-surface-600">
                  Common issues detected: weight overcharges, duplicate charges, invalid surcharges,
                  service mismatches, address correction fees, residential surcharges, late delivery
                  refunds
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Analyzing Phase ──────────────────────────────────────────── */}
      {phase === 'analyzing' && (
        <Card className="max-w-lg mx-auto">
          <div className="flex flex-col items-center py-6 space-y-6">
            {/* Animated spinner with glow */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20">
                <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-violet-500/10 blur-xl animate-pulse" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-surface-100">Analyzing Invoice</h3>
              <p className="text-sm text-surface-400 mt-1">
                {fileName} • {CARRIERS.find((c) => c.id === selectedCarrier)?.label}
              </p>
            </div>

            {/* Steps */}
            <div className="w-full space-y-3">
              {analysisSteps.map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500',
                    step.status === 'active' && 'bg-violet-500/10 border border-violet-500/20',
                    step.status === 'complete' && 'bg-emerald-500/5 border border-emerald-500/15',
                    step.status === 'pending' && 'bg-surface-900 border border-surface-800'
                  )}
                >
                  <div className="flex-shrink-0">
                    {step.status === 'complete' && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    )}
                    {step.status === 'active' && (
                      <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
                    )}
                    {step.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-surface-600" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors duration-300',
                      step.status === 'active' && 'text-violet-300',
                      step.status === 'complete' && 'text-emerald-400',
                      step.status === 'pending' && 'text-surface-500'
                    )}
                  >
                    {step.label}
                  </span>
                  {step.status === 'active' && (
                    <ArrowRight className="h-4 w-4 text-violet-400 ml-auto animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Results Phase ────────────────────────────────────────────── */}
      {phase === 'results' && auditResult && (
        <>
          {/* Hero stat */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-violet-500/10 to-emerald-500/5" />
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
                  <DollarSign className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-400 font-medium">Total Overcharges Found</p>
                  <p className="text-4xl font-bold text-emerald-400 tabular-nums">
                    {formatCurrency(animatedOvercharges)}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">
                    {auditResult.mode === 'demo' ? 'Demo mode — ' : ''}
                    {auditResult.summary.discrepancyCount} discrepancies in{' '}
                    {CARRIERS.find((c) => c.id === selectedCarrier)?.label} invoice
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {disputedIds.size < auditResult.discrepancies.length && (
                  <Button
                    leftIcon={<ShieldAlert className="h-4 w-4" />}
                    className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 shadow-sm shadow-violet-900/30"
                    onClick={handleDisputeAll}
                  >
                    Dispute All ({auditResult.discrepancies.length - disputedIds.size})
                  </Button>
                )}
                {disputedIds.size === auditResult.discrepancies.length && auditResult.discrepancies.length > 0 && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    All disputes filed
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-800 text-surface-400">
                  <Scale className="h-5 w-5" />
                </div>
                <CarrierLogo carrier={selectedCarrier} size={18} />
              </div>
              <p className="mt-3 text-2xl font-bold text-surface-100">
                {formatCurrency(auditResult.summary.totalCharges)}
              </p>
              <p className="mt-1 text-xs text-surface-400">Total Charges Audited</p>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <Badge variant="danger" dot>
                  {auditResult.summary.totalOvercharges > 50 ? 'High' : 'Low'}
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-bold text-red-400">
                {formatCurrency(auditResult.summary.totalOvercharges)}
              </p>
              <p className="mt-1 text-xs text-surface-400">Overcharges Found</p>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-surface-100">
                {auditResult.summary.discrepancyCount}
              </p>
              <p className="mt-1 text-xs text-surface-400">Discrepancies Identified</p>
            </Card>
          </div>

          {/* Discrepancy table */}
          <Card padding="none">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  Discrepancy Details
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  {auditResult.discrepancies.length} issues found •{' '}
                  {disputedIds.size} disputed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                  onClick={handleExport}
                >
                  Export CSV
                </Button>
              </div>
            </div>
            <div className="px-2 pb-3">
              <DataTable
                columns={columns}
                data={auditResult.discrepancies as (AuditDiscrepancy & Record<string, unknown>)[]}
                keyAccessor={(row) => row.id as string}
                searchable={auditResult.discrepancies.length > 5}
                searchPlaceholder="Search discrepancies…"
                pageSize={10}
                emptyMessage="No discrepancies found — your invoice looks clean!"
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
