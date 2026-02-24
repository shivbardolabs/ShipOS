'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Using native select for inline options
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Play,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  Database,
  ArrowRight,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface MigrationResult {
  mode: string;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRows: number;
  errors: ValidationError[];
  importedCount?: number;
}

interface Preset {
  key: string;
  targetModel: string;
  sourceFormat: string;
  fieldCount: number;
  requiredFields: string[];
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function LegacyMigrationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [preset, setPreset] = useState('postalmate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'execute' | 'done'>('upload');

  const presets: Preset[] = [
    { key: 'postalmate', targetModel: 'customer', sourceFormat: 'csv', fieldCount: 15, requiredFields: ['FIRSTNAME', 'LASTNAME', 'EMAIL', 'BOX_NUM'] },
    { key: 'mail_manager', targetModel: 'customer', sourceFormat: 'csv', fieldCount: 10, requiredFields: ['First Name', 'Last Name', 'Email Address', 'Mailbox #'] },
    { key: 'generic_packages', targetModel: 'package', sourceFormat: 'csv', fieldCount: 8, requiredFields: ['tracking_number', 'carrier'] },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent(ev.target?.result as string);
      setStep('validate');
    };
    reader.readAsText(f);
  };

  const runMigration = async (mode: 'dry_run' | 'execute') => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/migration/legacy-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: fileContent, preset, mode }),
      });
      const data = await res.json();
      setResult(data);
      if (mode === 'dry_run') setStep('execute');
      if (mode === 'execute') setStep('done');
    } catch {
      setResult({ mode, totalRows: 0, validRows: 0, skippedRows: 0, duplicateRows: 0, errors: [{ row: 0, field: '', message: 'Network error' }] });
    } finally {
      setLoading(false);
    }
  };

  const selectedPreset = presets.find(p => p.key === preset);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legacy Data Migration"
        description="Import customers and packages from PostalMate, Mail Manager, or custom CSV/JSON files."
        icon={<Database className="h-6 w-6" />}
      />

      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        {['upload', 'validate', 'execute', 'done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-4 w-4 text-surface-300" />}
            <Badge className={step === s ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-500'}>
              {s === 'upload' ? '1. Upload' : s === 'validate' ? '2. Validate' : s === 'execute' ? '3. Import' : '4. Done'}
            </Badge>
          </div>
        ))}
      </div>

      {/* Preset Selection */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold text-surface-900">Source Format</h3>
          <label className="block text-sm font-medium text-surface-700 mb-1">Legacy System</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="postalmate">PostalMate (Customers CSV)</option>
            <option value="mail_manager">Mail Manager (Customers CSV)</option>
            <option value="generic_packages">Generic Packages (CSV)</option>
          </select>

          {selectedPreset && (
            <div className="text-sm text-surface-500">
              <p>Target: <strong>{selectedPreset.targetModel}</strong> • {selectedPreset.fieldCount} fields mapped</p>
              <p className="mt-1">Required columns: <code className="text-xs bg-surface-100 px-1 py-0.5 rounded">{selectedPreset.requiredFields.join(', ')}</code></p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-surface-900 mb-4">Upload File</h3>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-surface-300 rounded-lg p-8 cursor-pointer hover:border-brand-500 transition-colors">
            <Upload className="h-8 w-8 text-surface-400 mb-2" />
            <span className="text-sm text-surface-600">
              {file ? file.name : 'Click to upload CSV or JSON file'}
            </span>
            {file && <span className="text-xs text-surface-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>}
            <input type="file" accept=".csv,.json,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
        </CardContent>
      </Card>

      {/* Validate & Import */}
      {step !== 'upload' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-surface-900">
                {step === 'validate' ? 'Validate Data' : step === 'execute' ? 'Ready to Import' : 'Import Complete'}
              </h3>
              <div className="flex gap-3">
                {step === 'validate' && (
                  <Button onClick={() => runMigration('dry_run')} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Dry Run
                  </Button>
                )}
                {step === 'execute' && result && result.validRows > 0 && (
                  <Button onClick={() => runMigration('execute')} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                    Import {result.validRows} Records
                  </Button>
                )}
              </div>
            </div>

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Rows', value: result.totalRows, bg: 'bg-surface-50', text: 'text-surface-900' },
                    { label: result.mode === 'execute' ? 'Imported' : 'Valid', value: result.importedCount ?? result.validRows, bg: 'bg-green-50', text: 'text-green-700' },
                    { label: 'Skipped', value: result.skippedRows, bg: 'bg-yellow-50', text: 'text-yellow-700' },
                    { label: 'Duplicates', value: result.duplicateRows, bg: 'bg-orange-50', text: 'text-orange-700' },
                  ].map((stat) => (
                    <div key={stat.label} className={`p-3 ${stat.bg} rounded-lg text-center`}>
                      <div className={`text-2xl font-bold ${stat.text}`}>{stat.value}</div>
                      <div className="text-xs text-surface-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {step === 'done' && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Import complete! {result.importedCount} records imported successfully.</span>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-700 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Validation Errors ({result.errors.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-surface-50 sticky top-0">
                          <tr>
                            <th className="text-left p-2">Row</th>
                            <th className="text-left p-2">Field</th>
                            <th className="text-left p-2">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.slice(0, 50).map((err, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 font-mono">{err.row}</td>
                              <td className="p-2 font-mono">{err.field}</td>
                              <td className="p-2 text-red-600">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Downloads */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-surface-900 mb-3">Download Templates</h3>
          <p className="text-sm text-surface-500 mb-4">Download CSV templates with the correct column headers for each legacy system.</p>
          <div className="flex flex-wrap gap-3">
            {presets.map((p) => (
              <Button
                key={p.key}
                variant="outline"
                size="sm"
                onClick={() => {
                  const headers = p.requiredFields.join(',');
                  const blob = new Blob([headers + '\n'], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${p.key}_template.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                {p.key.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
