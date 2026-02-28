'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { Sparkline } from '@/components/reports/mini-bar-chart';
import { reportCategories, formatNumber, generateDailySeries } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import { shipments, packages, customers } from '@/lib/mock-data';
import {
  BarChart3,
  Activity,
  Package,
  DollarSign,
  Receipt,
  Mail,
  Building2,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Users,
  Clock,
  FileText,
  Monitor,
  Truck,
  Layers,
  RotateCcw,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Icon lookup                                                               */
/* -------------------------------------------------------------------------- */
const iconMap: Record<string, React.ElementType> = {
  Activity,
  Package,
  DollarSign,
  Receipt,
  Mail,
  Building2,
  Download,
  Monitor,
  Truck,
  Layers,
  RotateCcw,
  Users,
  BarChart3,
};

/* -------------------------------------------------------------------------- */
/*  Quick-stat derivations from mock data                                     */
/* -------------------------------------------------------------------------- */
function useQuickStats() {
  return useMemo(() => {
    const activeCustomers = customers.filter((c) => c.status === 'active').length;
    const totalPackages = packages.length;
    const inSystem = packages.filter((p) => p.status !== 'released').length;
    const totalRevenue = shipments.reduce((s, sh) => s + sh.retailPrice, 0);
    const totalCost = shipments.reduce((s, sh) => s + sh.wholesaleCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { activeCustomers, totalPackages, inSystem, totalRevenue, totalProfit, margin };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Report Hub Page                                                           */
/* -------------------------------------------------------------------------- */
export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const stats = useQuickStats();

  const revenueTrend = useMemo(() => generateDailySeries(14, 42, 800, 1800).map((d) => d.value), []);
  const packageTrend = useMemo(() => generateDailySeries(14, 77, 8, 25).map((d) => d.value), []);
  const customerTrend = useMemo(() => generateDailySeries(14, 19, 20, 30).map((d) => d.value), []);

  /* Recent exports mock */
  const recentExports = useMemo(
    () => [
      { id: '1', name: 'Revenue_Report_2026-02.xlsx', date: 'Feb 20, 2026', format: 'xlsx' as const, size: '245 KB' },
      { id: '2', name: 'Package_Inventory_2026-02.pdf', date: 'Feb 19, 2026', format: 'pdf' as const, size: '1.2 MB' },
      { id: '3', name: 'Expenses_Q1_2026.csv', date: 'Feb 18, 2026', format: 'csv' as const, size: '89 KB' },
      { id: '4', name: 'Mail_Stats_2026-W07.qbo', date: 'Feb 17, 2026', format: 'qbo' as const, size: '156 KB' },
    ],
    []
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'quick-stats', label: 'Quick Stats', icon: <Activity className="h-4 w-4" /> },
    { id: 'recent-exports', label: 'Recent Exports', icon: <Download className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Report Hub"
        icon={<BarChart3 className="h-6 w-6" />}
        description="All reports in one hub."
        actions={<ExportToolbar reportName="Summary_Report" />}
      />

      {/* Global dimension filter bar */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Overview Tab ------- */}
      <TabPanel active={activeTab === 'overview'}>
        {/* Quick KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(stats.totalRevenue)} change={12.4} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Packages in System" value={formatNumber(stats.inSystem)} change={-3.2} />
          <StatCard icon={<Users className="h-5 w-5" />} title="Active Customers" value={formatNumber(stats.activeCustomers)} change={5.8} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Profit Margin" value={`${stats.margin.toFixed(1)}%`} change={2.1} />
        </div>

        {/* Report category cards */}
        <h3 className="text-sm font-semibold text-surface-300 mb-3">Report Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {reportCategories.map((cat) => {
            const IconComp = iconMap[cat.iconName] || FileText;
            return (
              <Link key={cat.id} href={cat.href}>
                <Card hover className="h-full">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cat.color}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-surface-100 truncate">{cat.title}</h4>
                        {cat.requiredRole && (
                          <Badge variant="info" dot={false}>Admin</Badge>
                        )}
                      </div>
                      <p className="text-xs text-surface-400 mt-1 line-clamp-2">{cat.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-surface-500 shrink-0 mt-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </TabPanel>

      {/* ------- Quick Stats Tab ------- */}
      <TabPanel active={activeTab === 'quick-stats'}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue trend */}
          <Card>
            <CardHeader><CardTitle>Revenue Trend (14 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-2xl font-bold text-surface-100">{formatCurrency(stats.totalRevenue)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12.4%
                </span>
              </div>
              <Sparkline data={revenueTrend} color="#10b981" height={40} />
              <p className="text-xs text-surface-500 mt-2">vs. previous period</p>
            </CardContent>
          </Card>

          {/* Package volume trend */}
          <Card>
            <CardHeader><CardTitle>Package Volume (14 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-2xl font-bold text-surface-100">{formatNumber(stats.totalPackages)}</span>
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> -3.2%
                </span>
              </div>
              <Sparkline data={packageTrend} color="#6366f1" height={40} />
              <p className="text-xs text-surface-500 mt-2">daily check-ins</p>
            </CardContent>
          </Card>

          {/* Customer growth */}
          <Card>
            <CardHeader><CardTitle>Active Customers (14 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-2xl font-bold text-surface-100">{formatNumber(stats.activeCustomers)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +5.8%
                </span>
              </div>
              <Sparkline data={customerTrend} color="#f59e0b" height={40} />
              <p className="text-xs text-surface-500 mt-2">active PMB holders</p>
            </CardContent>
          </Card>
        </div>

        {/* Carrier breakdown */}
        <div className="mt-6">
          <Card>
            <CardHeader><CardTitle>Carrier Performance Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left py-2 text-surface-400 font-medium">Carrier</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Shipments</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Revenue</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Cost</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Profit</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const byCarrier: Record<string, { count: number; revenue: number; cost: number }> = {};
                      shipments.forEach((s) => {
                        const key = s.carrier.toUpperCase();
                        if (!byCarrier[key]) byCarrier[key] = { count: 0, revenue: 0, cost: 0 };
                        byCarrier[key].count++;
                        byCarrier[key].revenue += s.retailPrice;
                        byCarrier[key].cost += s.wholesaleCost;
                      });
                      return Object.entries(byCarrier)
                        .sort((a, b) => b[1].revenue - a[1].revenue)
                        .map(([carrier, data]) => {
                          const profit = data.revenue - data.cost;
                          const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
                          return (
                            <tr key={carrier} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                              <td className="py-2 font-medium text-surface-200">{carrier}</td>
                              <td className="py-2 text-right text-surface-300">{data.count}</td>
                              <td className="py-2 text-right text-surface-300">{formatCurrency(data.revenue)}</td>
                              <td className="py-2 text-right text-surface-300">{formatCurrency(data.cost)}</td>
                              <td className="py-2 text-right text-emerald-400">{formatCurrency(profit)}</td>
                              <td className="py-2 text-right">
                                <Badge variant={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'danger'} dot={false}>
                                  {margin.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Recent Exports Tab ------- */}
      <TabPanel active={activeTab === 'recent-exports'}>
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
            <Link href="/dashboard/reports/export-history">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentExports.map((exp) => (
                <div key={exp.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-800/30 hover:bg-surface-800/50 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-700">
                    <FileText className="h-4 w-4 text-surface-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-200 truncate">{exp.name}</p>
                    <p className="text-xs text-surface-500">{exp.date} · {exp.size}</p>
                  </div>
                  <Badge variant="muted" dot={false}>{exp.format.toUpperCase()}</Badge>
                  <Button variant="ghost" size="sm" iconOnly>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Role-based access info */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Report Access
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {[
              { role: 'Owner', access: 'All reports + configuration' },
              { role: 'Admin', access: 'All reports + franchise view' },
              { role: 'Manager', access: 'Store-level reports' },
              { role: 'Employee', access: 'Basic reports only' },
            ].map((item) => (
              <div key={item.role} className="p-3 rounded-lg bg-surface-800/30">
                <p className="font-semibold text-surface-200">{item.role}</p>
                <p className="text-surface-400 mt-1">{item.access}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
