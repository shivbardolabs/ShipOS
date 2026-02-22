'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatCard, Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { reconciliationRuns, reconciliationStats } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import type { ReconciliationItem, ReconciliationRun } from '@/lib/types';
import {
  Upload,
  Scale,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Search,
  Clock,
  FileSpreadsheet,
  Truck,
  ChevronRight,
  Eye,
  CircleDollarSign,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Discrepancy type labels & colors                                          */
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
/*  Upload animation states                                                   */
/* -------------------------------------------------------------------------- */
type UploadPhase = 'idle' | 'uploading' | 'parsing' | 'reconciling' | 'complete';

/* -------------------------------------------------------------------------- */
/*  ReconciliationPage                                                        */
/* -------------------------------------------------------------------------- */
export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRun, setSelectedRun] = useState<ReconciliationRun | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<ReconciliationItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default to latest run
  const currentRun = selectedRun || reconciliationRuns[0];
  const currentItems = currentRun.items;

  // Filter items by tab
  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'overcharges':
        return currentItems.filter((i) =>
          ['overcharge', 'disputed', 'resolved', 'credited'].includes(i.status)
        );
      case 'late':
        return currentItems.filter((i) => i.status === 'late_delivery');
      case 'unmatched':
        return currentItems.filter((i) => i.status === 'unmatched');
      case 'matched':
        return currentItems.filter((i) => i.status === 'matched');
      default:
        return currentItems;
    }
  }, [activeTab, currentItems]);

  const tabs = [
    { id: 'all', label: 'All Records', count: currentItems.length },
    {
      id: 'overcharges',
      label: 'Overcharges',
      count: currentItems.filter((i) =>
        ['overcharge', 'disputed', 'resolved', 'credited'].includes(i.status)
      ).length,
    },
    {
      id: 'late',
      label: 'Late Deliveries',
      count: currentItems.filter((i) => i.status === 'late_delivery').length,
    },
    {
      id: 'unmatched',
      label: 'Unmatched',
      count: currentItems.filter((i) => i.status === 'unmatched').length,
    },
    {
      id: 'matched',
      label: 'Matched',
      count: currentItems.filter((i) => i.status === 'matched').length,
    },
  ];

  // Discrepancy summary for the current run
  const discrepancySummary = useMemo(() => {
    const summary: Record<string, { count: number; amount: number }> = {};
    currentItems.forEach((item) => {
      if (item.discrepancyType) {
        if (!summary[item.discrepancyType]) {
          summary[item.discrepancyType] = { count: 0, amount: 0 };
        }
        summary[item.discrepancyType].count++;
        summary[item.discrepancyType].amount += item.difference;
      }
    });
    return Object.entries(summary)
      .map(([type, data]) => ({
        type,
        label: discrepancyLabels[type] || type,
        ...data,
        amount: parseFloat(data.amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentItems]);

  // Simulate upload process
  const simulateUpload = useCallback(() => {
    setUploadPhase('uploading');
    setTimeout(() => setUploadPhase('parsing'), 1200);
    setTimeout(() => setUploadPhase('reconciling'), 2800);
    setTimeout(() => {
      setUploadPhase('complete');
      setTimeout(() => {
        setShowUpload(false);
        setUploadPhase('idle');
        setSelectedRun(reconciliationRuns[0]);
      }, 1500);
    }, 4200);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      simulateUpload();
    },
    [simulateUpload]
  );

  const handleFileSelect = useCallback(() => {
    simulateUpload();
  }, [simulateUpload]);

  /* ---- Columns --------------------------------------------------------- */
  const columns: Column<ReconciliationItem & Record<string, unknown>>[] = [
    {
      key: 'trackingNumber',
      label: 'Tracking #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-primary-400">{row.trackingNumber}</span>
      ),
    },
    {
      key: 'carrier',
      label: 'Carrier / Service',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <CarrierLogo carrier={row.carrier} size={18} />
          <div>
            <span className="font-medium text-surface-100 uppercase text-xs">
              {row.carrier}
            </span>
            <p className="text-xs text-surface-500">{row.service}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => (
        <span className="text-surface-300 text-sm">{row.customerName || '\u2014'}</span>
      ),
    },
    {
      key: 'expectedCharge',
      label: 'Expected',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-400 text-sm">{formatCurrency(row.expectedCharge)}</span>
      ),
    },
    {
      key: 'billedCharge',
      label: 'Billed',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-200 font-medium text-sm">
          {formatCurrency(row.billedCharge)}
        </span>
      ),
    },
    {
      key: 'difference',
      label: 'Difference',
      align: 'right',
      sortable: true,
      render: (row) => {
        if (row.difference === 0)
          return <span className="text-surface-500 text-sm">{'\u2014'}</span>;
        const isOver = row.difference > 0;
        return (
          <span className={`font-semibold text-sm ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
            {isOver ? '+' : ''}{formatCurrency(row.difference)}
          </span>
        );
      },
    },
    {
      key: 'discrepancyType',
      label: 'Issue Type',
      render: (row) => {
        if (!row.discrepancyType) return <span className="text-surface-600 text-xs">{'\u2014'}</span>;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${discrepancyColors[row.discrepancyType] || ''}`}>
            {discrepancyLabels[row.discrepancyType] || row.discrepancyType}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge status={row.status} dot>
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'shipDate',
      label: 'Ship Date',
      sortable: true,
      render: (row) => (
        <span className="text-surface-400 text-xs">{formatDate(row.shipDate)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 'w-10',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDetail(row);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  /* ---- Render ---------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Reconciliation"
        description="Audit carrier bills, catch overcharges, and recover refunds"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => setShowReport(true)}
            >
              Generate Report
            </Button>
            <Button
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => setShowUpload(true)}
            >
              Upload Carrier Bill
            </Button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Search className="h-5 w-5" />}
          title="Records Audited"
          value={reconciliationStats.totalAudited.toLocaleString()}
          change={18}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Discrepancies Found"
          value={reconciliationStats.totalDiscrepancies}
          change={-12}
        />
        <StatCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          title="Potential Refunds"
          value={formatCurrency(reconciliationStats.potentialRefunds)}
          change={24}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Match Rate"
          value={`${reconciliationStats.successRate}%`}
          change={3}
        />
      </div>

      {/* Two-column: Run Selector + Discrepancy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Run History */}
        <Card padding="none" className="lg:col-span-1">
          <div className="px-5 pt-5 pb-3">
            <CardTitle>Reconciliation History</CardTitle>
            <p className="text-xs text-surface-500 mt-1">
              {reconciliationRuns.length} runs this month
            </p>
          </div>
          <div className="space-y-0.5 px-2 pb-3">
            {reconciliationRuns.map((run) => {
              const isSelected = run.id === currentRun.id;
              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-primary-600/15 border border-primary-500/25'
                      : 'hover:bg-surface-800 border border-transparent'
                  }`}
                >
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-primary-500/20' : 'bg-surface-800'}`}>
                    <FileSpreadsheet className={`h-4 w-4 ${isSelected ? 'text-primary-400' : 'text-surface-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary-300' : 'text-surface-200'}`}>
                      {run.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <CarrierLogo carrier={run.carrier} size={12} />
                      <span className="text-[10px] text-surface-500 uppercase font-semibold">{run.carrier}</span>
                      <span className="text-[10px] text-surface-600">{'\u2022'}</span>
                      <span className="text-[10px] text-surface-500">{run.recordsProcessed} records</span>
                      <span className="text-[10px] text-surface-600">{'\u2022'}</span>
                      <span className="text-[10px] text-surface-500">{formatDate(run.uploadedAt)}</span>
                    </div>
                  </div>
                  {run.potentialRefund > 0 && (
                    <span className="text-xs font-semibold text-red-400 flex-shrink-0">
                      {formatCurrency(run.potentialRefund)}
                    </span>
                  )}
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-primary-400' : 'text-surface-600'}`} />
                </button>
              );
            })}
          </div>
        </Card>

        {/* Discrepancy Breakdown */}
        <Card padding="none" className="lg:col-span-2">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <CardTitle>Discrepancy Breakdown</CardTitle>
              <p className="text-xs text-surface-500 mt-1">
                {currentRun.fileName} {'\u2014'} {currentRun.discrepancyCount + currentRun.lateDeliveryCount} issues found
              </p>
            </div>
            <Badge status={currentRun.status} dot>{currentRun.status}</Badge>
          </div>

          {/* Run Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-4">
            <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-3 py-2.5">
              <p className="text-lg font-bold text-white">{currentRun.matchedCount}</p>
              <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">Matched</p>
            </div>
            <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-3 py-2.5">
              <p className="text-lg font-bold text-red-400">{currentRun.discrepancyCount}</p>
              <p className="text-[10px] text-red-400/70 font-medium uppercase tracking-wide">Overcharges</p>
            </div>
            <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-3 py-2.5">
              <p className="text-lg font-bold text-orange-400">{currentRun.lateDeliveryCount}</p>
              <p className="text-[10px] text-orange-400/70 font-medium uppercase tracking-wide">Late Deliveries</p>
            </div>
            <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-3 py-2.5">
              <p className="text-lg font-bold text-yellow-400">{currentRun.unmatchedCount}</p>
              <p className="text-[10px] text-yellow-400/70 font-medium uppercase tracking-wide">Unmatched</p>
            </div>
          </div>

          {/* Discrepancy Type Bars */}
          <div className="px-5 pb-5 space-y-2.5">
            {discrepancySummary.length > 0 ? (
              discrepancySummary.map((d) => {
                const maxAmount = Math.max(...discrepancySummary.map((x) => x.amount));
                const pct = maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0;
                return (
                  <div key={d.type} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${discrepancyColors[d.type] || ''}`}>
                          {d.label}
                        </span>
                        <span className="text-xs text-surface-500">{d.count} items</span>
                      </div>
                      <span className="text-sm font-semibold text-red-400">+{formatCurrency(d.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500/60 to-red-400/80 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-surface-500 text-center py-4">No discrepancies found</p>
            )}

            {discrepancySummary.length > 0 && (
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-800">
                <span className="text-sm font-medium text-surface-300">Total Potential Refund</span>
                <span className="text-lg font-bold text-red-400">{formatCurrency(currentRun.potentialRefund)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Results Table */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel active={true}>
        <DataTable
          columns={columns}
          data={filteredItems as (ReconciliationItem & Record<string, unknown>)[]}
          keyAccessor={(row) => row.id}
          searchable
          searchPlaceholder="Search by tracking #, carrier, customer..."
          searchFields={['trackingNumber', 'carrier', 'customerName', 'service', 'destination']}
          pageSize={12}
          emptyMessage="No records found"
        />
      </TabPanel>

      {/* Upload Modal */}
      <Modal
        open={showUpload}
        onClose={() => {
          if (uploadPhase === 'idle' || uploadPhase === 'complete') {
            setShowUpload(false);
            setUploadPhase('idle');
          }
        }}
        title="Upload Carrier Bill"
        description="Upload your carrier invoice to reconcile against ShipOS shipment records"
        size="lg"
      >
        {uploadPhase === 'idle' ? (
          <div className="space-y-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${
                dragOver ? 'border-primary-500 bg-primary-500/10' : 'border-surface-600 hover:border-surface-500 bg-surface-800/30'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileSelect} />
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl mb-4 ${dragOver ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-700/50 text-surface-400'}`}>
                <Upload className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-surface-200 mb-1">Drag & drop your carrier bill here</p>
              <p className="text-xs text-surface-500">or click to browse {'\u2014'} supports CSV, XLS, XLSX</p>
            </div>

            <div className="flex items-center justify-center gap-6 py-2">
              {['UPS', 'FedEx', 'USPS', 'DHL'].map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-surface-500" />
                  <span className="text-xs text-surface-400 font-medium">{c}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 p-4">
              <p className="text-xs font-medium text-surface-300 mb-2">How it works:</p>
              <ol className="text-xs text-surface-400 space-y-1.5 list-decimal list-inside">
                <li>Download your invoice from UPS/FedEx/USPS/DHL portal</li>
                <li>Upload the CSV or Excel file here</li>
                <li>ShipOS auto-detects the carrier and parses the bill</li>
                <li>We compare every charge against your ShipOS shipment records</li>
                <li>Review discrepancies and generate a dispute report</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 space-y-6">
            <div className="relative">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-colors duration-500 ${uploadPhase === 'complete' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'}`}>
                {uploadPhase === 'complete' ? (
                  <CheckCircle2 className="h-10 w-10" />
                ) : uploadPhase === 'reconciling' ? (
                  <Scale className="h-10 w-10 animate-pulse" />
                ) : uploadPhase === 'parsing' ? (
                  <FileSpreadsheet className="h-10 w-10 animate-pulse" />
                ) : (
                  <Upload className="h-10 w-10 animate-bounce" />
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-1">
                {uploadPhase === 'uploading' && 'Uploading carrier bill\u2026'}
                {uploadPhase === 'parsing' && 'Parsing invoice data\u2026'}
                {uploadPhase === 'reconciling' && 'Reconciling charges\u2026'}
                {uploadPhase === 'complete' && 'Reconciliation Complete!'}
              </p>
              <p className="text-sm text-surface-400">
                {uploadPhase === 'uploading' && 'Securely uploading your file'}
                {uploadPhase === 'parsing' && 'Auto-detecting carrier format and normalizing data'}
                {uploadPhase === 'reconciling' && 'Matching charges against ShipOS shipment records'}
                {uploadPhase === 'complete' && '45 records processed \u2014 12 discrepancies found'}
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              {([
                { phase: 'uploading' as const, label: 'Upload file' },
                { phase: 'parsing' as const, label: 'Parse carrier bill' },
                { phase: 'reconciling' as const, label: 'Compare charges' },
                { phase: 'complete' as const, label: 'Generate results' },
              ] as const).map((step, idx) => {
                const phases: UploadPhase[] = ['uploading', 'parsing', 'reconciling', 'complete'];
                const currentIdx = phases.indexOf(uploadPhase);
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step.phase} className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      isDone ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40'
                        : isCurrent ? 'bg-primary-500/25 text-primary-400 border border-primary-500/40'
                        : 'bg-surface-800 text-surface-500 border border-surface-700'
                    }`}>
                      {isDone ? '\u2713' : idx + 1}
                    </div>
                    <span className={`text-sm ${isDone ? 'text-emerald-400' : isCurrent ? 'text-surface-200 font-medium' : 'text-surface-500'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="w-full max-w-sm">
              <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${uploadPhase === 'complete' ? 'bg-emerald-500' : 'bg-primary-500'}`}
                  style={{
                    width: uploadPhase === 'uploading' ? '25%'
                      : uploadPhase === 'parsing' ? '50%'
                      : uploadPhase === 'reconciling' ? '75%'
                      : '100%',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Dispute Report Modal */}
      <Modal
        open={showReport}
        onClose={() => setShowReport(false)}
        title="Generate Dispute Report"
        description="Create a carrier dispute report for the selected reconciliation run"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowReport(false)}>Cancel</Button>
            <Button leftIcon={<Download className="h-4 w-4" />} onClick={() => setShowReport(false)}>
              Download PDF Report
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-surface-700 bg-surface-800/30 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600/20 to-primary-500/10 px-6 py-4 border-b border-surface-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Shipping Charge Dispute Report</h3>
                  <p className="text-xs text-surface-400 mt-0.5">Generated by ShipOS {'\u00b7'} {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-500">Invoice</p>
                  <p className="text-sm font-medium text-surface-200">{currentRun.fileName}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-surface-700/50">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Executive Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xl font-bold text-white">{currentRun.recordsProcessed}</p>
                  <p className="text-[10px] text-surface-500">Records Audited</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-red-400">{currentRun.discrepancyCount + currentRun.lateDeliveryCount}</p>
                  <p className="text-[10px] text-surface-500">Issues Found</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{formatCurrency(currentRun.totalBilled)}</p>
                  <p className="text-[10px] text-surface-500">Total Billed</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(currentRun.potentialRefund)}</p>
                  <p className="text-[10px] text-surface-500">Refund Requested</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">
                Itemized Discrepancies ({currentRun.discrepancyCount} charge issues + {currentRun.lateDeliveryCount} late deliveries)
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {currentItems
                  .filter((i) => i.discrepancyType)
                  .slice(0, 8)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-surface-800/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-primary-400/80">{item.trackingNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${discrepancyColors[item.discrepancyType!] || ''}`}>
                          {discrepancyLabels[item.discrepancyType!]}
                        </span>
                      </div>
                      <span className="text-red-400 font-medium">+{formatCurrency(item.difference)}</span>
                    </div>
                  ))}
                {currentItems.filter((i) => i.discrepancyType).length > 8 && (
                  <p className="text-[10px] text-surface-500 text-center pt-1">
                    + {currentItems.filter((i) => i.discrepancyType).length - 8} more items in full report
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" leftIcon={<FileText className="h-3.5 w-3.5" />}>Export as CSV</Button>
            <Button variant="secondary" size="sm" leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export as Excel</Button>
            <p className="text-xs text-surface-500 ml-2">CSV format is compatible with UPS/FedEx carrier dispute portals</p>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title="Shipment Detail"
        description={selectedDetail?.trackingNumber || ''}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedDetail(null)}>Close</Button>
            {selectedDetail?.discrepancyType && (
              <Button leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => setSelectedDetail(null)}>
                Mark as Disputed
              </Button>
            )}
          </>
        }
      >
        {selectedDetail && (
          <div className="space-y-5">
            {selectedDetail.discrepancyType && selectedDetail.status !== 'late_delivery' && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-300">{discrepancyLabels[selectedDetail.discrepancyType]}</p>
                  <p className="text-xs text-red-400/70">Carrier overcharged by {formatCurrency(selectedDetail.difference)}</p>
                </div>
              </div>
            )}
            {selectedDetail.status === 'late_delivery' && (
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 px-4 py-3 flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-300">Late Delivery</p>
                  <p className="text-xs text-orange-400/70">
                    Package delivered after the guaranteed delivery date {'\u2014'} eligible for full refund of {formatCurrency(selectedDetail.billedCharge)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-4 py-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Carrier / Service</p>
                <p className="text-sm font-medium text-surface-200">{selectedDetail.carrier.toUpperCase()} {'\u2014'} {selectedDetail.service}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-4 py-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Customer</p>
                <p className="text-sm font-medium text-surface-200">{selectedDetail.customerName || '\u2014'}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-4 py-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Ship Date</p>
                <p className="text-sm font-medium text-surface-200">{formatDate(selectedDetail.shipDate)}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-4 py-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Delivery Date</p>
                <p className="text-sm font-medium text-surface-200">{selectedDetail.deliveryDate ? formatDate(selectedDetail.deliveryDate) : '\u2014'}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-4 py-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Destination</p>
                <p className="text-sm font-medium text-surface-200">{selectedDetail.destination || '\u2014'}</p>
              </div>
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/40 px-4 py-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Status</p>
                <Badge status={selectedDetail.status} dot>{selectedDetail.status.replace('_', ' ')}</Badge>
              </div>
            </div>

            <div className="rounded-lg border border-surface-700/50 overflow-hidden">
              <div className="bg-surface-800/50 px-4 py-2.5 border-b border-surface-700/50">
                <p className="text-xs font-bold text-surface-300 uppercase tracking-wider">Charge Comparison</p>
              </div>
              <div className="divide-y divide-surface-800">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-surface-400">Expected Charge (ShipOS)</span>
                  <span className="text-sm font-medium text-surface-200">{formatCurrency(selectedDetail.expectedCharge)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-surface-400">Billed Charge (Carrier)</span>
                  <span className="text-sm font-medium text-surface-200">{formatCurrency(selectedDetail.billedCharge)}</span>
                </div>
                {selectedDetail.billedWeight && selectedDetail.expectedWeight && (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-surface-400">Expected Weight</span>
                      <span className="text-sm text-surface-300">{selectedDetail.expectedWeight} lbs</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-surface-400">Billed Weight</span>
                      <span className={`text-sm font-medium ${selectedDetail.billedWeight > selectedDetail.expectedWeight ? 'text-red-400' : 'text-surface-300'}`}>
                        {selectedDetail.billedWeight} lbs
                        {selectedDetail.billedWeight > selectedDetail.expectedWeight && (
                          <span className="text-xs ml-1">(+{(selectedDetail.billedWeight - selectedDetail.expectedWeight).toFixed(1)})</span>
                        )}
                      </span>
                    </div>
                  </>
                )}
                {selectedDetail.surcharges && selectedDetail.surcharges.length > 0 && (
                  <div className="px-4 py-2.5">
                    <p className="text-sm text-surface-400 mb-2">Surcharges</p>
                    {selectedDetail.surcharges.map((s, i) => (
                      <div key={i} className="flex items-center justify-between ml-3 mb-1">
                        <span className="text-xs text-surface-500">{s.name}</span>
                        <span className="text-xs text-red-400">{formatCurrency(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-surface-800/30">
                  <span className="text-sm font-semibold text-surface-200">Difference</span>
                  <span className={`text-base font-bold ${
                    selectedDetail.difference > 0 ? 'text-red-400'
                      : selectedDetail.difference < 0 ? 'text-emerald-400'
                      : 'text-surface-400'
                  }`}>
                    {selectedDetail.difference > 0 ? '+' : ''}{formatCurrency(selectedDetail.difference)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
