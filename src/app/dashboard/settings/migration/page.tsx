'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileArchive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Users,
  Package,
  Truck,
  MapPin,
  Receipt,
  ShoppingBag,
  Loader2,
  RotateCcw,
  ChevronLeft,
  Database,
  Clock,
  BarChart3,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AnalysisResult {
  sourceFile: string;
  databaseVersion: string;
  dateRange: { min: string; max: string };
  counts: Record<string, number>;
  carriers: Array<{ id: number; name: string; status: string }>;
}

interface MigrationProgress {
  migrationId: string;
  status: string;
  currentEntity: string;
  currentProgress: number;
  totalProgress: number;
  entities: Record<string, {
    total: number;
    migrated: number;
    skipped: number;
    errors: number;
    status: string;
  }>;
  errors: Array<{ entity: string; sourceId: string; message: string }>;
  startedAt?: string;
}

interface MigrationOptions {
  includeCustomers: boolean;
  includeShipments: boolean;
  includePackages: boolean;
  includeProducts: boolean;
  includeTransactions: boolean;
  includeAddresses: boolean;
  conflictResolution: 'skip' | 'merge' | 'create_new';
}

type Step = 'upload' | 'analysis' | 'configure' | 'migrating' | 'complete';

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function MigrationPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [migrationId, setMigrationId] = useState<string | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [options, setOptions] = useState<MigrationOptions>({
    includeCustomers: true,
    includeShipments: true,
    includePackages: true,
    includeProducts: true,
    includeTransactions: true,
    includeAddresses: true,
    conflictResolution: 'skip',
  });
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ── File Upload ────────────────────────────────────────────────────── */

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.7z')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a PostalMate .7z backup file.');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.name.endsWith('.7z')) {
      setFile(selected);
      setError(null);
    } else {
      setError('Please upload a PostalMate .7z backup file.');
    }
  }, []);

  const analyzeBackup = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/migration/analyze', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setStep('analysis');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /* ── Start Migration ────────────────────────────────────────────────── */

  const startMigration = async () => {
    setError(null);
    setStep('migrating');

    try {
      const res = await fetch('/api/migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFile: file?.name,
          analysis,
          config: options,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setMigrationId(data.migrationId);

      // Start polling progress
      pollRef.current = setInterval(async () => {
        try {
          const pRes = await fetch(`/api/migration/progress?id=${data.migrationId}`);
          const pData = await pRes.json();
          if (pData.success) {
            setProgress(pData.progress);
            if (pData.progress.status === 'completed' || pData.progress.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setStep('complete');
            }
          }
        } catch {
          // ignore poll errors
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Migration failed to start';
      setError(msg);
      setStep('configure');
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ── Entity icon helper ─────────────────────────────────────────────── */

  const entityIcon = (entity: string) => {
    switch (entity) {
      case 'customers': return <Users className="h-4 w-4" />;
      case 'addresses': return <MapPin className="h-4 w-4" />;
      case 'shipments': return <Truck className="h-4 w-4" />;
      case 'packages':  return <Package className="h-4 w-4" />;
      case 'invoices':  return <Receipt className="h-4 w-4" />;
      case 'products':  return <ShoppingBag className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const entityLabel = (entity: string) => {
    switch (entity) {
      case 'customers': return 'Customers';
      case 'addresses': return 'Ship-To Addresses';
      case 'shipments': return 'Shipment History';
      case 'packages':  return 'Package Check-ins';
      case 'invoices':  return 'Transactions';
      case 'products':  return 'Products';
      default: return entity;
    }
  };

  /* ── Format number ──────────────────────────────────────────────────── */

  const fmt = (n: number) => n.toLocaleString();

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="text-surface-400 hover:text-surface-200 text-sm flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <PageHeader
          title="PostalMate Migration"
          description="Import your PostalMate data into ShipOS"
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['upload', 'analysis', 'configure', 'migrating', 'complete'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s
                  ? 'bg-primary-600 text-white'
                  : (['upload', 'analysis', 'configure', 'migrating', 'complete'].indexOf(step) > i)
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-surface-800 text-surface-500'
              }`}
            >
              {(['upload', 'analysis', 'configure', 'migrating', 'complete'].indexOf(step) > i) ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-sm hidden sm:block ${step === s ? 'text-surface-200' : 'text-surface-500'}`}>
              {s === 'upload' ? 'Upload' : s === 'analysis' ? 'Review' : s === 'configure' ? 'Configure' : s === 'migrating' ? 'Migrating' : 'Complete'}
            </span>
            {i < 4 && <ArrowRight className="h-3 w-3 text-surface-600" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/30 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Error</p>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ── Step 1: Upload ────────────────────────────────────────────── */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-400" />
              Upload PostalMate Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                file
                  ? 'border-primary-600/50 bg-primary-900/10'
                  : 'border-surface-700 hover:border-surface-500 bg-surface-900/30'
              }`}
            >
              {file ? (
                <div className="space-y-3">
                  <FileArchive className="h-12 w-12 text-primary-400 mx-auto" />
                  <p className="text-surface-200 font-medium">{file.name}</p>
                  <p className="text-surface-500 text-sm">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setFile(null); setError(null); }}
                    >
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      onClick={analyzeBackup}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Analyzing... {Math.round(uploadProgress)}%
                        </>
                      ) : (
                        <>Analyze Backup</>
                      )}
                    </Button>
                  </div>
                  {uploading && (
                    <div className="w-full bg-surface-800 rounded-full h-2 mt-4 max-w-sm mx-auto">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-surface-600 mx-auto" />
                  <p className="text-surface-300 font-medium">
                    Drop your PostalMate backup here
                  </p>
                  <p className="text-surface-500 text-sm">
                    or click to select a .7z file
                  </p>
                  <input
                    type="file"
                    accept=".7z"
                    className="hidden"
                    id="backup-upload"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('backup-upload')?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 bg-surface-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-surface-300 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" /> How to get your PostalMate backup
              </h3>
              <ol className="text-sm text-surface-500 space-y-1 list-decimal list-inside">
                <li>In PostalMate, go to <span className="text-surface-300">System Utilities → Backup</span></li>
                <li>Select a backup location and click <span className="text-surface-300">Backup Now</span></li>
                <li>Find the resulting <code className="text-primary-400 bg-surface-800 px-1 rounded">.7z</code> file (usually named PMBackup_...)</li>
                <li>Upload it here to migrate your data</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Analysis Results ──────────────────────────────────── */}
      {step === 'analysis' && analysis && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-400" />
                Backup Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-surface-800/50 rounded-lg p-3">
                  <p className="text-xs text-surface-500">Source File</p>
                  <p className="text-sm text-surface-200 font-mono">{analysis.sourceFile}</p>
                </div>
                <div className="bg-surface-800/50 rounded-lg p-3">
                  <p className="text-xs text-surface-500">Database Version</p>
                  <p className="text-sm text-surface-200">PostalMate v{analysis.databaseVersion}</p>
                </div>
                <div className="bg-surface-800/50 rounded-lg p-3">
                  <p className="text-xs text-surface-500">Date Range</p>
                  <p className="text-sm text-surface-200">
                    {analysis.dateRange.min} → {analysis.dateRange.max}
                  </p>
                </div>
                <div className="bg-surface-800/50 rounded-lg p-3">
                  <p className="text-xs text-surface-500">Carriers</p>
                  <p className="text-sm text-surface-200">{analysis.counts.carriers} configured</p>
                </div>
              </div>

              <h3 className="text-sm font-medium text-surface-300 mb-3">Data to Migrate</h3>
              <div className="space-y-2">
                {[
                  { key: 'customers', icon: <Users className="h-4 w-4" />, label: 'Customers', count: analysis.counts.customers },
                  { key: 'shipToAddresses', icon: <MapPin className="h-4 w-4" />, label: 'Ship-To Addresses', count: analysis.counts.shipToAddresses },
                  { key: 'shipments', icon: <Truck className="h-4 w-4" />, label: 'Shipment Transactions', count: analysis.counts.shipments },
                  { key: 'packages', icon: <Package className="h-4 w-4" />, label: 'Package Records', count: analysis.counts.packages },
                  { key: 'packageCheckins', icon: <Package className="h-4 w-4" />, label: 'Package Check-ins', count: analysis.counts.packageCheckins },
                  { key: 'transactions', icon: <Receipt className="h-4 w-4" />, label: 'Register Transactions', count: analysis.counts.transactions },
                  { key: 'lineItems', icon: <Receipt className="h-4 w-4" />, label: 'Line Items', count: analysis.counts.lineItems },
                  { key: 'products', icon: <ShoppingBag className="h-4 w-4" />, label: 'Products', count: analysis.counts.products },
                  { key: 'mailboxes', icon: <Database className="h-4 w-4" />, label: 'Mailboxes', count: analysis.counts.mailboxes },
                ].map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between bg-surface-800/30 rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-primary-400">{item.icon}</span>
                      <span className="text-sm text-surface-300">{item.label}</span>
                    </div>
                    <span className="text-sm font-mono text-surface-200">{fmt(item.count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setStep('upload'); setAnalysis(null); }}>
              ← Upload Different File
            </Button>
            <Button onClick={() => setStep('configure')}>
              Configure Migration →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Configure ─────────────────────────────────────────── */}
      {step === 'configure' && analysis && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Migration Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-surface-400">
                Select which data to import. Unchecked items will be skipped.
              </p>

              {[
                { key: 'includeCustomers' as const, label: 'Customers', desc: `${fmt(analysis.counts.customers)} customer records`, icon: <Users className="h-5 w-5" /> },
                { key: 'includeAddresses' as const, label: 'Ship-To Addresses', desc: `${fmt(analysis.counts.shipToAddresses)} address book entries`, icon: <MapPin className="h-5 w-5" /> },
                { key: 'includeShipments' as const, label: 'Shipment History', desc: `${fmt(analysis.counts.shipments)} shipment transactions`, icon: <Truck className="h-5 w-5" /> },
                { key: 'includePackages' as const, label: 'Package Check-ins', desc: `${fmt(analysis.counts.packageCheckins)} received packages`, icon: <Package className="h-5 w-5" /> },
                { key: 'includeTransactions' as const, label: 'Transaction History', desc: `${fmt(analysis.counts.transactions)} register transactions`, icon: <Receipt className="h-5 w-5" /> },
                { key: 'includeProducts' as const, label: 'Products & Inventory', desc: `${fmt(analysis.counts.products)} products`, icon: <ShoppingBag className="h-5 w-5" /> },
              ].map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-4 bg-surface-800/30 rounded-lg p-4 cursor-pointer hover:bg-surface-800/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={options[item.key]}
                    onChange={() => setOptions(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className="h-5 w-5 rounded border-surface-600 bg-surface-800 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-primary-400">{item.icon}</span>
                  <div>
                    <p className="text-sm text-surface-200 font-medium">{item.label}</p>
                    <p className="text-xs text-surface-500">{item.desc}</p>
                  </div>
                </label>
              ))}

              <div className="border-t border-surface-800 pt-4">
                <h4 className="text-sm font-medium text-surface-300 mb-3">Conflict Resolution</h4>
                <p className="text-xs text-surface-500 mb-3">
                  What to do when a PostalMate record matches an existing ShipOS record (by email or phone):
                </p>
                {[
                  { value: 'skip' as const, label: 'Skip duplicates', desc: 'Keep existing ShipOS records, skip PostalMate duplicates' },
                  { value: 'merge' as const, label: 'Merge records', desc: 'Merge PostalMate data into existing ShipOS records' },
                  { value: 'create_new' as const, label: 'Create new', desc: 'Always create new records (may create duplicates)' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 bg-surface-800/30 rounded-lg p-3 mb-2 cursor-pointer hover:bg-surface-800/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="conflict"
                      checked={options.conflictResolution === opt.value}
                      onChange={() => setOptions(prev => ({ ...prev, conflictResolution: opt.value }))}
                      className="h-4 w-4 text-primary-600 bg-surface-800 border-surface-600"
                    />
                    <div>
                      <p className="text-sm text-surface-200">{opt.label}</p>
                      <p className="text-xs text-surface-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 text-sm font-medium">Important</p>
              <p className="text-amber-400/80 text-sm">
                Migration may take several minutes depending on data size.
                All migrated records are tagged with a migration ID so they can be rolled back if needed.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('analysis')}>
              ← Back
            </Button>
            <Button onClick={startMigration}>
              Start Migration →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Migrating ─────────────────────────────────────────── */}
      {step === 'migrating' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
              Migration in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress && (
              <>
                {/* Overall progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-400">Overall Progress</span>
                    <span className="text-surface-200">
                      {fmt(progress.currentProgress)} / {fmt(progress.totalProgress)}
                    </span>
                  </div>
                  <div className="w-full bg-surface-800 rounded-full h-3">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress.totalProgress > 0
                          ? (progress.currentProgress / progress.totalProgress) * 100
                          : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Per-entity progress */}
                <div className="space-y-3 mt-6">
                  {Object.entries(progress.entities).map(([entity, data]) => (
                    <div key={entity} className="bg-surface-800/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-primary-400">{entityIcon(entity)}</span>
                          <span className="text-sm text-surface-200">{entityLabel(entity)}</span>
                        </div>
                        <Badge
                          variant={
                            data.status === 'completed' ? 'success' :
                            data.status === 'in_progress' ? 'warning' :
                            data.status === 'skipped' ? 'secondary' : 'secondary'
                          }
                        >
                          {data.status === 'in_progress' ? 'Migrating...' : data.status}
                        </Badge>
                      </div>
                      {data.total > 0 && (
                        <div className="w-full bg-surface-900 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              data.status === 'completed' ? 'bg-green-500' :
                              data.status === 'in_progress' ? 'bg-primary-500' :
                              'bg-surface-700'
                            }`}
                            style={{
                              width: `${data.total > 0 ? (data.migrated / data.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-surface-500">
                        <span>{fmt(data.migrated)} migrated</span>
                        {data.errors > 0 && <span className="text-red-400">{data.errors} errors</span>}
                        {data.skipped > 0 && <span>{data.skipped} skipped</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {progress.startedAt && (
                  <div className="flex items-center gap-2 text-xs text-surface-500 mt-4">
                    <Clock className="h-3 w-3" />
                    Started {new Date(progress.startedAt).toLocaleTimeString()}
                  </div>
                )}
              </>
            )}

            {!progress && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-400 mx-auto mb-3" />
                <p className="text-surface-400">Initializing migration...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Complete ──────────────────────────────────────────── */}
      {step === 'complete' && progress && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {progress.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                Migration {progress.status === 'completed' ? 'Complete' : 'Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {Object.entries(progress.entities).map(([entity, data]) => (
                  data.total > 0 && (
                    <div key={entity} className="bg-surface-800/50 rounded-lg p-3 text-center">
                      <span className="text-primary-400 flex justify-center mb-1">
                        {entityIcon(entity)}
                      </span>
                      <p className="text-lg font-semibold text-surface-200">{fmt(data.migrated)}</p>
                      <p className="text-xs text-surface-500">{entityLabel(entity)}</p>
                      {data.errors > 0 && (
                        <p className="text-xs text-red-400 mt-1">{data.errors} errors</p>
                      )}
                    </div>
                  )
                ))}
              </div>

              {progress.errors.length > 0 && (
                <div className="bg-red-900/10 border border-red-800/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-300 mb-2">
                    Errors ({progress.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {progress.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-400/80 font-mono">
                        [{err.entity}:{err.sourceId}] {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep('upload');
                setFile(null);
                setAnalysis(null);
                setProgress(null);
                setMigrationId(null);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Migration
            </Button>
            <Link href="/dashboard">
              <Button>
                Go to Dashboard →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
