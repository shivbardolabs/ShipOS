'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/input';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Clock,
  Users,
  Download,
  RefreshCw,
  Loader2,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  ShieldAlert,
  Zap,
  FileSpreadsheet,
  FileText,
  ChevronRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface OverviewData {
  totalRevenue: number;
  totalCost: number;
  totalMarkup: number;
  chargeCount: number;
  revenueChange: number;
  outstanding: number;
  outstandingCount: number;
  collectionRate: number;
  period: { from: string; to: string };
}

interface ServiceRevenue {
  serviceType: string;
  revenue: number;
  cost: number;
  markup: number;
  count: number;
}

interface ModelRevenue {
  model: string;
  revenue: number;
  cost: number;
  markup: number;
  count: number;
}

interface CustomerBilling {
  customerId: string;
  pmbNumber: string;
  customerName: string;
  email: string | null;
  status: string;
  totalCharge: number;
  totalCost: number;
  totalMarkup: number;
  chargeCount: number;
}

interface AgingBucket {
  bucket: string;
  amount: number;
  count: number;
}

interface TrendPoint {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

interface Optimization {
  type: string;
  severity: string;
  title: string;
  description: string;
  customerId?: string;
  pmbNumber?: string;
  value?: number;
}

interface StatusBreakdown {
  status: string;
  amount: number;
  count: number;
}

interface DashboardData {
  overview: OverviewData;
  revenueByService: ServiceRevenue[];
  revenueByModel: ModelRevenue[];
  customerBilling: CustomerBilling[];
  agingReport: AgingBucket[];
  trendData: TrendPoint[];
  optimizations: Optimization[];
  statusBreakdown: StatusBreakdown[];
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

const SERVICE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  receiving: { label: 'Receiving', icon: '📦', color: '#6366f1' },
  storage: { label: 'Storage', icon: '🏠', color: '#8b5cf6' },
  forwarding: { label: 'Forwarding', icon: '📤', color: '#06b6d4' },
  scanning: { label: 'Scanning', icon: '📄', color: '#10b981' },
  pickup: { label: 'Pickup', icon: '🚗', color: '#f59e0b' },
  disposal: { label: 'Disposal', icon: '🗑️', color: '#ef4444' },
  shipping: { label: 'Shipping', icon: '🚚', color: '#3b82f6' },
  custom: { label: 'Custom', icon: '⚡', color: '#ec4899' },
};

const MODEL_LABELS: Record<string, { label: string; color: string }> = {
  subscription: { label: 'Subscription', color: '#6366f1' },
  usage: { label: 'Usage-Based', color: '#06b6d4' },
  tos: { label: 'Time-of-Service', color: '#f59e0b' },
  other: { label: 'Other', color: '#94a3b8' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  posted: '#3b82f6',
  invoiced: '#8b5cf6',
  paid: '#10b981',
  void: '#6b7280',
  disputed: '#ef4444',
};

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  info: { icon: Lightbulb, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  warning: { icon: ShieldAlert, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  danger: { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

/* -------------------------------------------------------------------------- */
/*  Mini bar chart component                                                  */
/* -------------------------------------------------------------------------- */

function HorizontalBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-surface-300 font-medium">{item.label}</span>
            <span className="text-xs text-surface-400 font-mono">{formatCurrency(item.value)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.max((item.value / maxVal) * 100, 2)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trend sparkline (simple CSS chart)                                        */
/* -------------------------------------------------------------------------- */

function TrendChart({ data, height = 120 }: { data: TrendPoint[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-surface-500 text-sm" style={{ height }}>
        No trend data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barWidth = Math.max(Math.min(100 / data.length - 1, 20), 4);

  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-px">
        {data.map((point, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
            {/* Profit bar */}
            <div
              className="rounded-t transition-all duration-300 cursor-pointer opacity-80 hover:opacity-100"
              style={{
                width: `${barWidth}px`,
                height: `${Math.max((point.revenue / maxRevenue) * (height - 24), 2)}px`,
                background: `linear-gradient(to top, #6366f1, #818cf8)`,
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 whitespace-nowrap">
              <div className="glass-card p-2 text-xs space-y-0.5 shadow-lg">
                <div className="text-surface-300 font-medium">{point.date}</div>
                <div className="text-surface-400">Rev: {formatCurrency(point.revenue)}</div>
                <div className="text-surface-400">Cost: {formatCurrency(point.cost)}</div>
                <div className="text-emerald-400">Profit: {formatCurrency(point.profit)}</div>
                <div className="text-surface-500">{point.count} charges</div>
              </div>
            </div>
            {/* Date label (show every few) */}
            {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) && (
              <span className="text-[9px] text-surface-600 mt-0.5 truncate max-w-[48px]">
                {point.date.slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Aging bucket visualization                                                */
/* -------------------------------------------------------------------------- */

function AgingChart({ data }: { data: AgingBucket[] }) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const bucketColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

  if (total === 0) {
    return (
      <div className="text-center py-8 text-surface-500 text-sm">
        No outstanding balances
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="w-full h-6 rounded-full bg-surface-800 overflow-hidden flex">
        {data.map((bucket, i) => {
          const pct = total > 0 ? (bucket.amount / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={bucket.bucket}
              className="h-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: bucketColors[i],
              }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {data.map((bucket, i) => (
          <div key={bucket.bucket} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: bucketColors[i] }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-surface-300 font-medium">{bucket.bucket}</p>
              <p className="text-sm text-surface-100 font-semibold">{formatCurrency(bucket.amount)}</p>
              <p className="text-[10px] text-surface-500">{bucket.count} charge{bucket.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status donut (simple CSS ring)                                            */
/* -------------------------------------------------------------------------- */

function StatusRing({ data }: { data: StatusBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  // Build conic gradient
  let acc = 0;
  const stops = data.map((d) => {
    const start = acc;
    const pct = (d.count / total) * 100;
    acc += pct;
    return `${STATUS_COLORS[d.status] || '#6b7280'} ${start}% ${acc}%`;
  });

  return (
    <div className="flex items-center gap-6">
      <div
        className="w-24 h-24 rounded-full flex-shrink-0"
        style={{
          background: `conic-gradient(${stops.join(', ')})`,
          WebkitMask: 'radial-gradient(transparent 55%, black 56%)',
          mask: 'radial-gradient(transparent 55%, black 56%)',
        }}
      />
      <div className="space-y-1.5 flex-1">
        {data.map((d) => (
          <div key={d.status} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[d.status] || '#6b7280' }} />
              <span className="text-xs text-surface-300 capitalize">{d.status}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-surface-100 font-medium">{d.count}</span>
              <span className="text-[10px] text-surface-500 ml-1">({formatCurrency(d.amount)})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */

export default function BillingDashboardPage() {
  const { tenant } = useTenant();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [customerSearch, setCustomerSearch] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  /* ── Fetch data ─────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/dashboard?period=${period}`);
      if (!res.ok) throw new Error('Failed to load billing data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Export handler ─────────────────────────────────────────────────────── */
  const handleExport = async (type: string, format: string) => {
    setExporting(`${type}-${format}`);
    try {
      if (format === 'csv') {
        const res = await fetch(`/api/billing/dashboard/export?type=${type}&format=csv`);
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing_dashboard_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silent fail — could add toast
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  /* ── Filtered customer list ─────────────────────────────────────────────── */
  const filteredCustomers = data?.customerBilling.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.pmbNumber.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    );
  }) ?? [];

  /* ── Loading / Error states ─────────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing Dashboard"
          description="Central billing operations hub"
          icon={<DollarSign className="h-6 w-6" />}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-3 text-surface-400">Loading billing data…</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Billing Dashboard"
          description="Central billing operations hub"
          icon={<DollarSign className="h-6 w-6" />}
        />
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-surface-200 mb-2">Unable to Load Data</h3>
            <p className="text-sm text-surface-400 mb-4">{error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  const overview = data?.overview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Billing Dashboard"
        description={`Central billing operations hub${tenant?.name ? ` — ${tenant.name}` : ''}`}
        icon={<DollarSign className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Select
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-[160px]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchData}
              loading={loading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('charges', 'csv')}
              loading={exporting === 'charges-csv'}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Total Revenue"
          value={formatCurrency(overview?.totalRevenue || 0)}
          change={overview?.revenueChange}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          title="Outstanding Balance"
          value={formatCurrency(overview?.outstanding || 0)}
        />
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          title="Charges This Period"
          value={overview?.chargeCount?.toLocaleString() || '0'}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Collection Rate"
          value={`${overview?.collectionRate || 0}%`}
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
          { id: 'customers', label: 'Customer Billing', icon: <Users className="h-4 w-4" /> },
          { id: 'aging', label: 'Aging Report', icon: <Clock className="h-4 w-4" /> },
          { id: 'trends', label: 'Trends', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'optimization', label: 'Optimization', icon: <Zap className="h-4 w-4" />, count: data?.optimizations.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Tab: Overview ──────────────────────────────────────────────────── */}
      <TabPanel active={activeTab === 'overview'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Service Type */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary-500" />
                  Revenue by Service Type
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport('charges', 'csv')}
                leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              >
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              {data && data.revenueByService.length > 0 ? (
                <HorizontalBar
                  items={data.revenueByService.map((s) => ({
                    label: `${SERVICE_LABELS[s.serviceType]?.icon || '•'} ${SERVICE_LABELS[s.serviceType]?.label || s.serviceType}`,
                    value: s.revenue,
                    color: SERVICE_LABELS[s.serviceType]?.color || '#6b7280',
                  }))}
                />
              ) : (
                <p className="text-center text-sm text-surface-500 py-8">No charge data in this period</p>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Billing Model */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary-500" />
                  Revenue by Billing Model
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.revenueByModel.length > 0 ? (
                <HorizontalBar
                  items={data.revenueByModel.map((m) => ({
                    label: MODEL_LABELS[m.model]?.label || m.model,
                    value: m.revenue,
                    color: MODEL_LABELS[m.model]?.color || '#6b7280',
                  }))}
                />
              ) : (
                <p className="text-center text-sm text-surface-500 py-8">No model data available</p>
              )}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Charge Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.statusBreakdown.length > 0 ? (
                <StatusRing data={data.statusBreakdown} />
              ) : (
                <p className="text-center text-sm text-surface-500 py-8">No charge data</p>
              )}
            </CardContent>
          </Card>

          {/* Cost vs Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary-500" />
                  Profitability Summary
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Revenue</span>
                  <span className="text-lg font-bold text-surface-100">
                    {formatCurrency(overview?.totalRevenue || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Cost Basis (COGS)</span>
                  <span className="text-lg font-medium text-surface-300">
                    {formatCurrency(overview?.totalCost || 0)}
                  </span>
                </div>
                <div className="border-t border-surface-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-400">Gross Margin</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(overview?.totalMarkup || 0)}
                    </span>
                  </div>
                  {overview && overview.totalRevenue > 0 && (
                    <div className="flex items-center justify-end mt-1">
                      <Badge variant="success" dot={false}>
                        {((overview.totalMarkup / overview.totalRevenue) * 100).toFixed(1)}% margin
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ── Tab: Customer Billing ──────────────────────────────────────────── */}
      <TabPanel active={activeTab === 'customers'}>
        <div className="space-y-4">
          {/* Search & Export */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px] max-w-md">
              <SearchInput
                placeholder="Search by name, PMB, or email…"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('customers', 'csv')}
              loading={exporting === 'customers-csv'}
              leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            >
              Export CSV
            </Button>
          </div>

          {/* Customer table */}
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">PMB</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Revenue</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Cost</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Margin</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Charges</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-surface-500">
                        {customerSearch ? 'No customers match your search' : 'No customer billing data in this period'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const marginPct = customer.totalCharge > 0
                        ? ((customer.totalMarkup / customer.totalCharge) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr
                          key={customer.customerId}
                          className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-surface-200 font-medium">{customer.customerName}</p>
                              {customer.email && (
                                <p className="text-xs text-surface-500 mt-0.5">{customer.email}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs text-surface-300 bg-surface-800 px-2 py-0.5 rounded">
                              {customer.pmbNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-surface-100 font-semibold">
                              {formatCurrency(customer.totalCharge)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-surface-400">
                            {formatCurrency(customer.totalCost)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {Number(marginPct) >= 0 ? (
                                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-500" />
                              )}
                              <span className={Number(marginPct) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {marginPct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-surface-300">
                            {customer.chargeCount}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge status={customer.status}>{customer.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              onClick={() => {
                                window.open(`/dashboard/charge-events?customerId=${customer.customerId}`, '_self');
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </TabPanel>

      {/* ── Tab: Aging Report ──────────────────────────────────────────────── */}
      <TabPanel active={activeTab === 'aging'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-500" />
                  Outstanding Balance Aging
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport('aging', 'csv')}
                loading={exporting === 'aging-csv'}
                leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              >
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <AgingChart data={data?.agingReport || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aging Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.agingReport.map((bucket) => {
                  const total = data.agingReport.reduce((s, b) => s + b.amount, 0);
                  const pct = total > 0 ? ((bucket.amount / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={bucket.bucket} className="flex items-center justify-between py-2 border-b border-surface-800/50 last:border-0">
                      <div>
                        <p className="text-sm text-surface-200 font-medium">{bucket.bucket}</p>
                        <p className="text-xs text-surface-500">{bucket.count} charge{bucket.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-surface-100 font-semibold">{formatCurrency(bucket.amount)}</p>
                        <p className="text-xs text-surface-500">{pct}% of total</p>
                      </div>
                    </div>
                  );
                })}
                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-surface-700">
                  <span className="text-sm text-surface-300 font-semibold">Total Outstanding</span>
                  <span className="text-lg text-surface-100 font-bold">
                    {formatCurrency(data?.agingReport.reduce((s, b) => s + b.amount, 0) || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ── Tab: Trends ────────────────────────────────────────────────────── */}
      <TabPanel active={activeTab === 'trends'}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary-500" />
                  Revenue Trend — {PERIOD_OPTIONS.find((p) => p.value === period)?.label || period}
                </div>
              </CardTitle>
              <div className="text-xs text-surface-500">
                {data?.trendData.length || 0} data points
              </div>
            </CardHeader>
            <CardContent>
              <TrendChart data={data?.trendData || []} height={180} />
            </CardContent>
          </Card>

          {/* Period-over-period comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="text-center py-2">
                  <p className="text-xs text-surface-500 mb-1">Period Revenue</p>
                  <p className="text-2xl font-bold text-surface-100">
                    {formatCurrency(overview?.totalRevenue || 0)}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {(overview?.revenueChange || 0) >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${(overview?.revenueChange || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {overview?.revenueChange || 0}% vs previous period
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center py-2">
                  <p className="text-xs text-surface-500 mb-1">Daily Average</p>
                  <p className="text-2xl font-bold text-surface-100">
                    {formatCurrency(
                      data?.trendData.length
                        ? (overview?.totalRevenue || 0) / data.trendData.length
                        : 0
                    )}
                  </p>
                  <p className="text-xs text-surface-500 mt-2">
                    avg {Math.round((overview?.chargeCount || 0) / Math.max(data?.trendData.length || 1, 1))} charges/day
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center py-2">
                  <p className="text-xs text-surface-500 mb-1">Peak Day</p>
                  {data?.trendData.length ? (
                    <>
                      <p className="text-2xl font-bold text-surface-100">
                        {formatCurrency(Math.max(...data.trendData.map((d) => d.revenue)))}
                      </p>
                      <p className="text-xs text-surface-500 mt-2">
                        {formatDate(
                          data.trendData.reduce((best, d) =>
                            d.revenue > best.revenue ? d : best
                          ).date
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-surface-100">—</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabPanel>

      {/* ── Tab: Optimization ──────────────────────────────────────────────── */}
      <TabPanel active={activeTab === 'optimization'}>
        <div className="space-y-4">
          {data?.optimizations.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Zap className="h-12 w-12 text-primary-500 mb-4" />
                <h3 className="text-lg font-semibold text-surface-200 mb-2">All Clear!</h3>
                <p className="text-sm text-surface-400">
                  No optimization alerts at this time. Your billing is running efficiently.
                </p>
              </div>
            </Card>
          ) : (
            data?.optimizations.map((opt, i) => {
              const cfg = SEVERITY_CONFIG[opt.severity] || SEVERITY_CONFIG.info;
              const SeverityIcon = cfg.icon;
              return (
                <Card key={i}>
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <SeverityIcon className="h-5 w-5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-surface-200">{opt.title}</h4>
                        <Badge
                          variant={opt.severity === 'danger' ? 'danger' : opt.severity === 'warning' ? 'warning' : 'info'}
                          dot={false}
                        >
                          {opt.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-surface-400 mt-1">{opt.description}</p>
                      {opt.pmbNumber && (
                        <p className="text-xs text-surface-500 mt-2">
                          PMB: <span className="font-mono">{opt.pmbNumber}</span>
                        </p>
                      )}
                    </div>
                    {opt.value !== undefined && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-surface-100">{formatCurrency(opt.value)}</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary-500" />
                  Export Reports
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('charges', 'csv')}
                  loading={exporting === 'charges-csv'}
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                >
                  All Charges (CSV)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('customers', 'csv')}
                  loading={exporting === 'customers-csv'}
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                >
                  Customer Summary (CSV)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('aging', 'csv')}
                  loading={exporting === 'aging-csv'}
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                >
                  Aging Report (CSV)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExport('all', 'json')}
                  loading={exporting === 'all-json'}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Full Dashboard (JSON)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>
    </div>
  );
}
