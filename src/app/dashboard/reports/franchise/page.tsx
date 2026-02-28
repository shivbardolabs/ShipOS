'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, Sparkline } from '@/components/reports/mini-bar-chart';
import { formatNumber, seededRandom } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  Package,
  Users,
  TrendingUp,

  BarChart3,

  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Franchise mock data                                                        */
/* -------------------------------------------------------------------------- */
interface StoreData {
  id: string;
  name: string;
  location: string;
  revenue: number;
  expenses: number;
  packages: number;
  customers: number;
  mailVolume: number;
  growth: number;
}

function useFranchiseData() {
  return useMemo(() => {
    const stores: StoreData[] = [
      { id: 's1', name: 'Downtown Location', location: 'New York, NY', revenue: seededRandom(2001, 18000, 32000), expenses: seededRandom(2002, 8000, 15000), packages: seededRandom(2003, 150, 350), customers: seededRandom(2004, 40, 85), mailVolume: seededRandom(2005, 200, 500), growth: seededRandom(2006, 5, 25) },
      { id: 's2', name: 'Midtown Hub', location: 'New York, NY', revenue: seededRandom(2011, 15000, 28000), expenses: seededRandom(2012, 7000, 13000), packages: seededRandom(2013, 120, 300), customers: seededRandom(2014, 35, 75), mailVolume: seededRandom(2015, 180, 450), growth: seededRandom(2016, 2, 20) },
      { id: 's3', name: 'Brooklyn Heights', location: 'Brooklyn, NY', revenue: seededRandom(2021, 12000, 22000), expenses: seededRandom(2022, 5000, 10000), packages: seededRandom(2023, 80, 200), customers: seededRandom(2024, 25, 60), mailVolume: seededRandom(2025, 120, 300), growth: seededRandom(2026, -5, 18) },
      { id: 's4', name: 'Jersey City Store', location: 'Jersey City, NJ', revenue: seededRandom(2031, 10000, 20000), expenses: seededRandom(2032, 4000, 9000), packages: seededRandom(2033, 60, 180), customers: seededRandom(2034, 20, 50), mailVolume: seededRandom(2035, 90, 250), growth: seededRandom(2036, -3, 15) },
      { id: 's5', name: 'Hoboken Station', location: 'Hoboken, NJ', revenue: seededRandom(2041, 8000, 18000), expenses: seededRandom(2042, 3500, 8000), packages: seededRandom(2043, 50, 150), customers: seededRandom(2044, 18, 45), mailVolume: seededRandom(2045, 70, 200), growth: seededRandom(2046, 0, 22) },
    ];

    const totalRevenue = stores.reduce((s, st) => s + st.revenue, 0);
    const totalExpenses = stores.reduce((s, st) => s + st.expenses, 0);
    const totalProfit = totalRevenue - totalExpenses;
    const totalPackages = stores.reduce((s, st) => s + st.packages, 0);
    const totalCustomers = stores.reduce((s, st) => s + st.customers, 0);
    const totalMail = stores.reduce((s, st) => s + st.mailVolume, 0);
    const avgGrowth = stores.reduce((s, st) => s + st.growth, 0) / stores.length;

    /* Rankings */
    const byRevenue = [...stores].sort((a, b) => b.revenue - a.revenue);
    const byPackages = [...stores].sort((a, b) => b.packages - a.packages);
    const byGrowth = [...stores].sort((a, b) => b.growth - a.growth);

    return { stores, totalRevenue, totalExpenses, totalProfit, totalPackages, totalCustomers, totalMail, avgGrowth, byRevenue, byPackages, byGrowth };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Franchise Admin Reports Page                                               */
/* -------------------------------------------------------------------------- */
export default function FranchiseReportPage() {
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [storeFilter, setStoreFilter] = useState('all');
  const data = useFranchiseData();

  const tabs = [
    { id: 'overview', label: 'Franchise Overview', icon: <Building2 className="h-4 w-4" /> },
    { id: 'comparison', label: 'Store Comparison', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'rankings', label: 'Rankings', icon: <Trophy className="h-4 w-4" /> },
    { id: 'security', label: 'Data Access', icon: <Shield className="h-4 w-4" /> },
  ];

  const storeOptions = [
    { value: 'all', label: 'All Stores' },
    ...data.stores.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Franchise Admin Reports"
        icon={<Building2 className="h-6 w-6" />}
        description="Compare all locations."
        badge={<Badge variant="info" dot={false}>Franchise Admin Only</Badge>}
        actions={<ExportToolbar reportName="Franchise_Report" />}
      />

      <Card>
        <CardHeader><CardTitle>Franchise Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <Select
                label="Store"
                options={storeOptions}
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
              />
            </div>
            <ReportFilters filters={filters} onChange={setFilters} />
          </div>
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Overview ------- */}
      <TabPanel active={activeTab === 'overview'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Building2 className="h-5 w-5" />} title="Total Stores" value={formatNumber(data.stores.length)} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Franchise Revenue" value={formatCurrency(data.totalRevenue)} change={12.4} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Packages" value={formatNumber(data.totalPackages)} change={8.1} />
          <StatCard icon={<Users className="h-5 w-5" />} title="Total Customers" value={formatNumber(data.totalCustomers)} change={6.4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Profit" value={formatCurrency(data.totalProfit)} change={18.2} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Avg Growth" value={`${data.avgGrowth.toFixed(1)}%`} change={2.3} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} title="Avg Revenue/Store" value={formatCurrency(data.totalRevenue / data.stores.length)} change={5.7} />
        </div>

        {/* Store cards */}
        <h3 className="text-sm font-semibold text-surface-300 mb-3">Store Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.stores.map((store, i) => {
            const profit = store.revenue - store.expenses;
            return (
              <Card key={store.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-surface-100">{store.name}</h4>
                    <p className="text-xs text-surface-500">{store.location}</p>
                  </div>
                  <Badge variant={store.growth > 10 ? 'success' : store.growth > 0 ? 'warning' : 'danger'} dot={false}>
                    {store.growth > 0 ? '+' : ''}{store.growth}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-surface-500">Revenue</p>
                    <p className="font-semibold text-surface-200">{formatCurrency(store.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Profit</p>
                    <p className="font-semibold text-emerald-400">{formatCurrency(profit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Packages</p>
                    <p className="font-semibold text-surface-200">{formatNumber(store.packages)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Customers</p>
                    <p className="font-semibold text-surface-200">{formatNumber(store.customers)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Sparkline
                    data={Array.from({ length: 14 }, (_, j) => seededRandom(3000 + i * 100 + j, 400, 1200))}
                    color={store.growth > 0 ? '#10b981' : '#ef4444'}
                    height={24}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </TabPanel>

      {/* ------- Comparison ------- */}
      <TabPanel active={activeTab === 'comparison'}>
        <Card>
          <CardHeader><CardTitle>Side-by-Side Store Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Store</th>
                    <th className="text-left py-2.5 text-surface-400 font-medium">Location</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Expenses</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Profit</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Margin</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Packages</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Customers</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stores.map((store) => {
                    const profit = store.revenue - store.expenses;
                    const storeMargin = store.revenue > 0 ? (profit / store.revenue) * 100 : 0;
                    return (
                      <tr key={store.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 font-medium text-surface-200">{store.name}</td>
                        <td className="py-2.5 text-surface-400">{store.location}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(store.revenue)}</td>
                        <td className="py-2.5 text-right text-surface-400">{formatCurrency(store.expenses)}</td>
                        <td className="py-2.5 text-right text-emerald-400">{formatCurrency(profit)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={storeMargin > 40 ? 'success' : storeMargin > 25 ? 'warning' : 'danger'} dot={false}>
                            {storeMargin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(store.packages)}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(store.customers)}</td>
                        <td className="py-2.5 text-right">
                          <span className={`flex items-center justify-end gap-1 ${store.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {store.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {store.growth >= 0 ? '+' : ''}{store.growth}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-700">
                    <td className="py-2.5 font-semibold text-surface-100" colSpan={2}>Franchise Total</td>
                    <td className="py-2.5 text-right font-semibold text-surface-100">{formatCurrency(data.totalRevenue)}</td>
                    <td className="py-2.5 text-right font-semibold text-surface-300">{formatCurrency(data.totalExpenses)}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-400">{formatCurrency(data.totalProfit)}</td>
                    <td className="py-2.5 text-right">
                      <Badge variant="success" dot={false}>
                        {(data.totalRevenue > 0 ? ((data.totalProfit / data.totalRevenue) * 100) : 0).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-surface-200">{formatNumber(data.totalPackages)}</td>
                    <td className="py-2.5 text-right font-semibold text-surface-200">{formatNumber(data.totalCustomers)}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-400">+{data.avgGrowth.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Revenue comparison chart */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Revenue by Store</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.byRevenue.map((s) => ({ label: s.name, value: s.revenue, color: 'bg-primary-500/60' }))}
              barHeight={32}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Rankings ------- */}
      <TabPanel active={activeTab === 'rankings'}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>🏆 Revenue Rankings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.byRevenue.map((store, i) => (
                  <div key={store.id} className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-surface-300' : i === 2 ? 'text-orange-400' : 'text-surface-500'}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-200">{store.name}</p>
                      <p className="text-xs text-surface-500">{store.location}</p>
                    </div>
                    <span className="text-sm font-semibold text-surface-200">{formatCurrency(store.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>📦 Package Volume Rankings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.byPackages.map((store, i) => (
                  <div key={store.id} className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-surface-300' : i === 2 ? 'text-orange-400' : 'text-surface-500'}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-200">{store.name}</p>
                      <p className="text-xs text-surface-500">{store.location}</p>
                    </div>
                    <span className="text-sm font-semibold text-surface-200">{formatNumber(store.packages)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>📈 Growth Rankings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.byGrowth.map((store, i) => (
                  <div key={store.id} className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-surface-300' : i === 2 ? 'text-orange-400' : 'text-surface-500'}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-200">{store.name}</p>
                      <p className="text-xs text-surface-500">{store.location}</p>
                    </div>
                    <Badge variant={store.growth > 10 ? 'success' : store.growth > 0 ? 'warning' : 'danger'} dot={false}>
                      {store.growth > 0 ? '+' : ''}{store.growth}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Data Access ------- */}
      <TabPanel active={activeTab === 'security'}>
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Data Access & Security
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700">
                <h4 className="text-sm font-semibold text-surface-200">Franchise Scope</h4>
                <p className="text-xs text-surface-400 mt-1">
                  Franchise Administrators see data for all stores within their franchise only.
                  Cross-franchise data is never visible.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700">
                <h4 className="text-sm font-semibold text-surface-200">Read-Only Access</h4>
                <p className="text-xs text-surface-400 mt-1">
                  Franchise Admin has read-only reporting access to individual store data.
                  Store configuration and settings remain under store Owner/Admin control.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700">
                <h4 className="text-sm font-semibold text-surface-200">Customer PII Protection</h4>
                <p className="text-xs text-surface-400 mt-1">
                  Individual customer PII from other stores is not visible unless explicitly authorized.
                  Reports show aggregated metrics only at the franchise level.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-surface-800/30 border border-surface-700">
                <h4 className="text-sm font-semibold text-surface-200">BI Integration</h4>
                <p className="text-xs text-surface-400 mt-1">
                  Third-party BI tools can connect to franchise-level data via API endpoints.
                  Data is scoped to the authenticated franchise only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
