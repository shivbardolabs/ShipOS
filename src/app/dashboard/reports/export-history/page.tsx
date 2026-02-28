'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { seededRandom } from '@/lib/report-utils';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  RefreshCw,
  Clock,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Mock export history                                                        */
/* -------------------------------------------------------------------------- */
type ExportRecord = {
  id: string;
  filename: string;
  reportType: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  size: string;
  filtersApplied: string;
  [key: string]: unknown;
};

function generateExportHistory(): ExportRecord[] {
  const reportTypes = ['Revenue Report', 'Package Inventory', 'Expense Report', 'Mail Stats', 'KPI Dashboard', 'Franchise Summary'];
  const formats = ['xlsx', 'csv', 'pdf', 'qbo'];
  const users = ['Sarah Chen', 'Admin', 'System'];

  return Array.from({ length: 25 }, (_, i) => {
    const reportType = reportTypes[i % reportTypes.length];
    const format = formats[i % formats.length];
    const day = 21 - Math.floor(i / 2);
    return {
      id: `exp_${i + 1}`,
      filename: `${reportType.replace(/\s+/g, '_')}_2026-02-${String(day).padStart(2, '0')}.${format}`,
      reportType,
      format: format.toUpperCase(),
      generatedAt: `Feb ${day}, 2026 ${seededRandom(i + 900, 8, 17)}:${String(seededRandom(i + 950, 0, 59)).padStart(2, '0')}`,
      generatedBy: users[i % users.length],
      size: `${seededRandom(i + 1000, 45, 2400)} KB`,
      filtersApplied: i % 3 === 0 ? 'All' : i % 3 === 1 ? 'FedEx, This Month' : 'iPostal, Q1 2026',
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Format icon helper                                                         */
/* -------------------------------------------------------------------------- */
function FormatIcon({ format }: { format: string }) {
  switch (format) {
    case 'XLSX': return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
    case 'CSV': return <FileText className="h-4 w-4 text-blue-400" />;
    case 'PDF': return <File className="h-4 w-4 text-red-400" />;
    case 'QBO': return <FileText className="h-4 w-4 text-purple-400" />;
    default: return <FileText className="h-4 w-4 text-surface-400" />;
  }
}

/* -------------------------------------------------------------------------- */
/*  Export History Page                                                         */
/* -------------------------------------------------------------------------- */
export default function ExportHistoryPage() {
  const exports = useMemo(() => generateExportHistory(), []);
  const [formatFilter, setFormatFilter] = useState('all');

  const filteredExports = useMemo(
    () => formatFilter === 'all' ? exports : exports.filter((e) => e.format === formatFilter),
    [exports, formatFilter]
  );

  const columns: Column<ExportRecord>[] = [
    {
      key: 'filename',
      label: 'File',
      render: (r) => (
        <div className="flex items-center gap-2">
          <FormatIcon format={r.format} />
          <span className="font-medium text-surface-200 truncate max-w-[300px]">{r.filename}</span>
        </div>
      ),
    },
    { key: 'reportType', label: 'Report' },
    {
      key: 'format',
      label: 'Format',
      render: (r) => {
        const variantMap: Record<string, 'success' | 'info' | 'danger' | 'default'> = {
          XLSX: 'success',
          CSV: 'info',
          PDF: 'danger',
          QBO: 'default',
        };
        return <Badge variant={variantMap[r.format] || 'muted'} dot={false}>{r.format}</Badge>;
      },
    },
    { key: 'generatedAt', label: 'Generated' },
    { key: 'generatedBy', label: 'By' },
    { key: 'size', label: 'Size', align: 'right' },
    { key: 'filtersApplied', label: 'Filters' },
    {
      key: 'actions',
      label: '',
      render: () => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" iconOnly><Download className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" iconOnly><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export History"
        icon={<Clock className="h-6 w-6" />}
        description="Download past exports."
        actions={
          <div className="flex items-center gap-2">
            <Select
              options={[
                { value: 'all', label: 'All Formats' },
                { value: 'XLSX', label: 'Excel' },
                { value: 'CSV', label: 'CSV' },
                { value: 'PDF', label: 'PDF' },
                { value: 'QBO', label: 'QBO' },
              ]}
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
            />
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-100">{exports.length}</p>
            <p className="text-xs text-surface-400 mt-1">Total Exports</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-100">{exports.filter((e) => e.format === 'XLSX').length}</p>
            <p className="text-xs text-surface-400 mt-1">Excel Files</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-100">{exports.filter((e) => e.format === 'PDF').length}</p>
            <p className="text-xs text-surface-400 mt-1">PDF Files</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-surface-100">{exports.filter((e) => e.format === 'QBO').length}</p>
            <p className="text-xs text-surface-400 mt-1">QBO Files</p>
          </div>
        </Card>
      </div>

      {/* Export format info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { format: 'Excel (.xlsx)', desc: 'Multi-sheet workbooks with formatting, headers, and data types preserved', color: 'border-emerald-500/30 bg-emerald-500/5' },
          { format: 'CSV', desc: 'Standard UTF-8 comma-separated values, compatible with all tools', color: 'border-blue-500/30 bg-blue-500/5' },
          { format: 'QBO', desc: 'QuickBooks Online compatible format for direct import with account mapping', color: 'border-purple-500/30 bg-purple-500/5' },
          { format: 'PDF', desc: 'Print-ready report with branding, charts, page numbers, and 8.5×11 layout', color: 'border-red-500/30 bg-red-500/5' },
        ].map((info) => (
          <Card key={info.format} className={`border ${info.color}`}>
            <p className="text-sm font-semibold text-surface-200">{info.format}</p>
            <p className="text-xs text-surface-400 mt-1">{info.desc}</p>
          </Card>
        ))}
      </div>

      {/* Data table */}
      <Card padding="none">
        <div className="p-4">
          <DataTable
            columns={columns}
            data={filteredExports}
            keyAccessor={(r) => r.id}
            searchable
            searchPlaceholder="Search exports..."
            searchFields={['filename', 'reportType', 'generatedBy']}
            pageSize={10}
          />
        </div>
      </Card>
    </div>
  );
}
