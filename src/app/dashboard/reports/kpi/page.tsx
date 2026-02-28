'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';

import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { Sparkline, DonutChart } from '@/components/reports/mini-bar-chart';
import { formatNumber, seededRandom } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import { shipments, packages, customers } from '@/lib/mock-data';
import {
  Activity,
  Package,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Clock,
  Settings2,
  GripVertical,
  Eye,
  EyeOff,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  KPI definitions                                                           */
/* -------------------------------------------------------------------------- */
interface KpiDef {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  getValue: () => number;
  format: 'number' | 'currency' | 'percent';
  change: number; // mock % change vs prior period
  sparkData: number[];
  enabled: boolean;
}

function useKpiDefinitions(): KpiDef[] {
  return useMemo(() => {
    const activeCustomers = customers.filter((c) => c.status === 'active').length;
    const totalPkgs = packages.length;
    const inSystem = packages.filter((p) => p.status !== 'released').length;
    const checkedIn = packages.filter((p) => p.status === 'checked_in').length;
    const released = packages.filter((p) => p.status === 'released').length;
    const totalRevenue = shipments.reduce((s, sh) => s + sh.retailPrice, 0);
    const totalCost = shipments.reduce((s, sh) => s + sh.wholesaleCost, 0);
    const pendingPickups = packages.filter((p) => p.status === 'ready' || p.status === 'notified').length;
    const totalMail = customers.reduce((s, c) => s + (c.mailCount ?? 0), 0);

    const mkSpark = (seed: number) => Array.from({ length: 14 }, (_, i) => seededRandom(seed + i, 5, 30));

    return [
      { id: 'total_packages', label: 'Total Packages', category: 'Packages', icon: <Package className="h-5 w-5" />, getValue: () => totalPkgs, format: 'number', change: 8.3, sparkData: mkSpark(1), enabled: true },
      { id: 'checked_in', label: 'Checked In Today', category: 'Packages', icon: <Package className="h-5 w-5" />, getValue: () => checkedIn, format: 'number', change: 5.2, sparkData: mkSpark(2), enabled: true },
      { id: 'checked_out', label: 'Checked Out Today', category: 'Packages', icon: <Package className="h-5 w-5" />, getValue: () => released, format: 'number', change: -2.1, sparkData: mkSpark(3), enabled: true },
      { id: 'in_system', label: 'In System Now', category: 'Packages', icon: <Package className="h-5 w-5" />, getValue: () => inSystem, format: 'number', change: -3.5, sparkData: mkSpark(4), enabled: true },
      { id: 'pending_pickups', label: 'Pending Pickups', category: 'Packages', icon: <Clock className="h-5 w-5" />, getValue: () => pendingPickups, format: 'number', change: 12.0, sparkData: mkSpark(5), enabled: true },
      { id: 'mail_processed', label: 'Mail Processed', category: 'Mail', icon: <Mail className="h-5 w-5" />, getValue: () => totalMail, format: 'number', change: 3.9, sparkData: mkSpark(6), enabled: true },
      { id: 'revenue', label: 'Revenue', category: 'Financial', icon: <DollarSign className="h-5 w-5" />, getValue: () => totalRevenue, format: 'currency', change: 15.7, sparkData: mkSpark(7), enabled: true },
      { id: 'profit', label: 'Gross Profit', category: 'Financial', icon: <TrendingUp className="h-5 w-5" />, getValue: () => totalRevenue - totalCost, format: 'currency', change: 11.2, sparkData: mkSpark(8), enabled: true },
      { id: 'margin', label: 'Profit Margin', category: 'Financial', icon: <BarChart3 className="h-5 w-5" />, getValue: () => totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0, format: 'percent', change: 2.1, sparkData: mkSpark(9), enabled: true },
      { id: 'active_customers', label: 'Active Customers', category: 'Customers', icon: <Users className="h-5 w-5" />, getValue: () => activeCustomers, format: 'number', change: 6.4, sparkData: mkSpark(10), enabled: true },
      { id: 'cost', label: 'Total COGS', category: 'Financial', icon: <DollarSign className="h-5 w-5" />, getValue: () => totalCost, format: 'currency', change: 4.5, sparkData: mkSpark(11), enabled: false },
    ];
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Format helper                                                              */
/* -------------------------------------------------------------------------- */
function formatKpiValue(value: number, format: 'number' | 'currency' | 'percent'): string {
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'percent': return `${value.toFixed(1)}%`;
    default: return formatNumber(value);
  }
}

/* -------------------------------------------------------------------------- */
/*  KPI Dashboard Page                                                        */
/* -------------------------------------------------------------------------- */
export default function KpiDashboardPage() {
  const allKpis = useKpiDefinitions();
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    new Set(allKpis.filter((k) => k.enabled).map((k) => k.id))
  );
  const [timePeriod, setTimePeriod] = useState('month');

  const enabledKpis = allKpis.filter((k) => enabledIds.has(k.id));

  const toggleKpi = (id: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity className="h-4 w-4" /> },
    { id: 'configure', label: 'Configure KPIs', icon: <Settings2 className="h-4 w-4" /> },
  ];

  /* Donut data for category breakdown */
  const categoryTotals = useMemo(() => {
    const cats: Record<string, number> = {};
    enabledKpis.forEach((k) => {
      cats[k.category] = (cats[k.category] || 0) + 1;
    });
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return Object.entries(cats).map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length],
    }));
  }, [enabledKpis]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI Dashboard"
        icon={<Activity className="h-6 w-6" />}
        description="Configure your KPI dashboard."
        actions={<ExportToolbar reportName="KPI_Dashboard" />}
      />

      <Card>
        <CardHeader><CardTitle>Dimension Filters</CardTitle></CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Dashboard Tab ------- */}
      <TabPanel active={activeTab === 'dashboard'}>
        {/* Time period toggle */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-surface-400">Period:</span>
          {['day', 'week', 'month'].map((p) => (
            <Button
              key={p}
              variant={timePeriod === p ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setTimePeriod(p)}
            >
              {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </Button>
          ))}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {enabledKpis.map((kpi) => {
            const value = kpi.getValue();
            const isPositive = kpi.change >= 0;
            return (
              <Card key={kpi.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    {kpi.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={kpi.category === 'Financial' ? 'info' : kpi.category === 'Packages' ? 'success' : 'muted'} dot={false}>
                      {kpi.category}
                    </Badge>
                  </div>
                </div>
                <p className="text-2xl font-bold text-surface-100">{formatKpiValue(value, kpi.format)}</p>
                <p className="text-xs text-surface-400 mt-1">{kpi.label}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs font-medium flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isPositive ? '+' : ''}{kpi.change}% vs prior
                  </span>
                  <Sparkline data={kpi.sparkData} color={isPositive ? '#10b981' : '#ef4444'} height={24} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Period Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left py-2 text-surface-400 font-medium">KPI</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Current</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Previous</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Change</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledKpis.slice(0, 8).map((kpi) => {
                      const current = kpi.getValue();
                      const prev = current * (1 - kpi.change / 100);
                      return (
                        <tr key={kpi.id} className="border-b border-surface-800/50">
                          <td className="py-2 text-surface-200 font-medium">{kpi.label}</td>
                          <td className="py-2 text-right text-surface-200">{formatKpiValue(current, kpi.format)}</td>
                          <td className="py-2 text-right text-surface-400">{formatKpiValue(prev, kpi.format)}</td>
                          <td className="py-2 text-right">
                            <span className={kpi.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            {kpi.change > 0 ? <TrendingUp className="h-4 w-4 text-emerald-400 inline" /> :
                             kpi.change < 0 ? <TrendingDown className="h-4 w-4 text-red-400 inline" /> :
                             <Minus className="h-4 w-4 text-surface-500 inline" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>KPI Categories</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <DonutChart
                data={categoryTotals}
                size={140}
                centerValue={String(enabledKpis.length)}
                centerLabel="Active KPIs"
              />
              <div className="mt-4 space-y-2 w-full">
                {categoryTotals.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300">{seg.label}</span>
                    </div>
                    <span className="text-surface-400">{seg.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Configure Tab ------- */}
      <TabPanel active={activeTab === 'configure'}>
        <Card>
          <CardHeader>
            <CardTitle>Available KPIs</CardTitle>
            <p className="text-xs text-surface-400">Toggle KPIs to show or hide them on the dashboard</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allKpis.map((kpi) => {
                const isOn = enabledIds.has(kpi.id);
                return (
                  <div
                    key={kpi.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/30 hover:bg-surface-800/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-surface-600 cursor-grab" />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-700">
                      {kpi.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-200">{kpi.label}</p>
                      <p className="text-xs text-surface-500">{kpi.category}</p>
                    </div>
                    <Button
                      variant={isOn ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => toggleKpi(kpi.id)}
                      leftIcon={isOn ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    >
                      {isOn ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
