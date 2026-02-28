'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Download,
  Loader2,
  Package,
  Mail,
  Clock,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface RtsReport {
  period: { from: string; to: string };
  summary: {
    total: number;
    packages: number;
    mailPieces: number;
    avgCompletionHours: number | null;
  };
  byReason: Record<string, number>;
  byStep: Record<string, number>;
  byCarrier: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */
const REASON_LABELS: Record<string, string> = {
  no_matching_customer: 'No Matching Customer',
  closed_pmb: 'Closed PMB',
  expired_pmb: 'Expired PMB',
  customer_request: 'Customer Request',
  storage_policy_expiry: 'Storage Policy Expiry',
  refused: 'Refused',
  unclaimed: 'Unclaimed',
  other: 'Other',
};

const STEP_LABELS: Record<string, string> = {
  initiated: 'Initiated',
  label_printed: 'Label Printed',
  carrier_handoff: 'Carrier Handoff',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const REASON_COLORS = [
  'bg-red-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-surface-500',
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function RtsReportPanel() {
  const [report, setReport] = useState<RtsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/packages/rts/report?${params}`);
      if (!res.ok) throw new Error('Failed to load report');
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Report load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCsv = () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    window.open(`/api/packages/rts/report?${params}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-surface-400 block mb-1">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-surface-400 block mb-1">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={fetchReport} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-surface-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : report ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={BarChart3} label="Total RTS" value={report.summary.total} />
            <StatCard icon={Package} label="Packages" value={report.summary.packages} />
            <StatCard icon={Mail} label="Mail Pieces" value={report.summary.mailPieces} />
            <StatCard
              icon={Clock}
              label="Avg. Completion"
              value={
                report.summary.avgCompletionHours !== null
                  ? `${report.summary.avgCompletionHours}h`
                  : '—'
              }
            />
          </div>

          {/* Reason Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-surface-200 mb-3">By Reason</h4>
            {Object.keys(report.byReason).length === 0 ? (
              <p className="text-xs text-surface-500">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(report.byReason)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count], i) => {
                    const pct = report.summary.total > 0 ? (count / report.summary.total) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-surface-300">{REASON_LABELS[key] || key}</span>
                          <span className="text-surface-400">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', REASON_COLORS[i % REASON_COLORS.length])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Step Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-surface-200 mb-3">By Status</h4>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(report.byStep).map(([key, count]) => (
                <div
                  key={key}
                  className="rounded-lg bg-surface-800/50 border border-surface-700 px-4 py-2 text-center"
                >
                  <p className="text-lg font-bold text-surface-100">{count}</p>
                  <p className="text-[10px] text-surface-400 uppercase tracking-wider">
                    {STEP_LABELS[key] || key}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Carrier Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-surface-200 mb-3">By Carrier</h4>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(report.byCarrier)
                .sort(([, a], [, b]) => b - a)
                .map(([key, count]) => (
                  <div
                    key={key}
                    className="rounded-lg bg-surface-800/50 border border-surface-700 px-4 py-2 text-center"
                  >
                    <p className="text-lg font-bold text-surface-100">{count}</p>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider capitalize">
                      {key}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-surface-500 text-center">Failed to load report data.</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                 */
/* -------------------------------------------------------------------------- */
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg bg-surface-800/50 border border-surface-700 p-3 text-center">
      <Icon className="h-4 w-4 text-surface-400 mx-auto mb-1" />
      <p className="text-xl font-bold text-surface-100">{value}</p>
      <p className="text-[10px] text-surface-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}
