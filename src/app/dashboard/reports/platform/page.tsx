'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo, useEffect, useCallback} from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, Sparkline, DonutChart } from '@/components/reports/mini-bar-chart';
import { seededRandom, generateDailySeries, formatNumber } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import {
  Monitor,
  Mail,

  BarChart3,
  Package,
  DollarSign,
  Users,
  ArrowUpRight,

} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Platform data                                                              */
/* -------------------------------------------------------------------------- */
interface PlatformData {
  id: string;
  name: string;
  type: 'physical' | 'digital';
  packages: number;
  mail: number;
  revenue: number;
  cost: number;
  customers: number;
  avgProcessingTime: number;
  color: string;
}

function usePlatformData(packages: any[], shipments: any[]) {
  return useMemo(() => {
    const totalPkgs = packages.length;
    const totalRev = shipments.reduce((s, sh) => s + sh.retailPrice, 0);
    const totalCost = shipments.reduce((s, sh) => s + sh.wholesaleCost, 0);

    const platforms: PlatformData[] = [
      {
        id: 'physical',
        name: 'In-Store Physical',
        type: 'physical',
        packages: Math.round(totalPkgs * 0.35),
        mail: seededRandom(500, 400, 800),
        revenue: totalRev * 0.35,
        cost: totalCost * 0.32,
        customers: seededRandom(501, 120, 200),
        avgProcessingTime: seededRandom(502, 5, 15),
        color: '#6366f1',
      },
      {
        id: 'anytime',
        name: 'AnyTime Mailbox',
        type: 'digital',
        packages: Math.round(totalPkgs * 0.22),
        mail: seededRandom(510, 300, 600),
        revenue: totalRev * 0.22,
        cost: totalCost * 0.2,
        customers: seededRandom(511, 80, 160),
        avgProcessingTime: seededRandom(512, 8, 20),
        color: '#10b981',
      },
      {
        id: 'ipostal',
        name: 'iPostal1',
        type: 'digital',
        packages: Math.round(totalPkgs * 0.25),
        mail: seededRandom(520, 250, 550),
        revenue: totalRev * 0.25,
        cost: totalCost * 0.28,
        customers: seededRandom(521, 60, 140),
        avgProcessingTime: seededRandom(522, 10, 25),
        color: '#f59e0b',
      },
      {
        id: 'postscan',
        name: 'PostScan Mail',
        type: 'digital',
        packages: Math.round(totalPkgs * 0.18),
        mail: seededRandom(530, 200, 450),
        revenue: totalRev * 0.18,
        cost: totalCost * 0.2,
        customers: seededRandom(531, 50, 120),
        avgProcessingTime: seededRandom(532, 12, 28),
        color: '#ef4444',
      },
    ];

    const physicalTotal = platforms.filter((p) => p.type === 'physical');
    const digitalTotal = platforms.filter((p) => p.type === 'digital');

    const physRevenue = physicalTotal.reduce((s, p) => s + p.revenue, 0);
    const digRevenue = digitalTotal.reduce((s, p) => s + p.revenue, 0);
    const physPkgs = physicalTotal.reduce((s, p) => s + p.packages, 0);
    const digPkgs = digitalTotal.reduce((s, p) => s + p.packages, 0);

    const physTrend = generateDailySeries(30, 600, 300, 700).map((d) => d.value);
    const digTrend = generateDailySeries(30, 700, 500, 1100).map((d) => d.value);

    return { platforms, physRevenue, digRevenue, physPkgs, digPkgs, physTrend, digTrend };
  }, [packages, shipments]);
}

/* -------------------------------------------------------------------------- */
/*  Platform Report Page — BAR-273                                             */
/* -------------------------------------------------------------------------- */
export default function PlatformReportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [packages, setPackages] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
    fetch('/api/packages?limit=500').then(r => r.json()).then(d => setPackages(d.packages || [])),
    fetch('/api/shipments?limit=500').then(r => r.json()).then(d => setShipments(d.shipments || [])),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const data = usePlatformData(packages, shipments);

  const totalRevenue = data.platforms.reduce((s, p) => s + p.revenue, 0);
  const totalPackages = data.platforms.reduce((s, p) => s + p.packages, 0);
  const totalCustomers = data.platforms.reduce((s, p) => s + p.customers, 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Monitor className="h-4 w-4" /> },
    { id: 'comparison', label: 'Physical vs Digital', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'detail', label: 'Platform Detail', icon: <Mail className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dimension"
        icon={<Monitor className="h-6 w-6" />}
        description="Filter and compare performance across In-Store Physical and Digital Mail platforms"
        actions={<ExportToolbar reportName="Platform_Report" />}
      />

      <Card>
        <CardHeader><CardTitle>Dimension Filters</CardTitle></CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Overview ------- */}
      <TabPanel active={activeTab === 'overview'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Monitor className="h-5 w-5" />} title="Active Platforms" value="4" />
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Packages" value={formatNumber(totalPackages)} change={8.3} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(totalRevenue)} change={14.2} />
          <StatCard icon={<Users className="h-5 w-5" />} title="Total Customers" value={formatNumber(totalCustomers)} change={6.1} />
        </div>

        {/* Revenue by platform donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Revenue by Platform</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.platforms.map((p) => ({ label: p.name, value: p.revenue, color: p.color }))}
                size={160}
                centerValue={formatCurrency(totalRevenue)}
                centerLabel="total"
              />
              <div className="space-y-3 flex-1">
                {data.platforms.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-surface-300">{p.name}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Package Volume by Platform</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.platforms.map((p) => ({ label: p.name, value: p.packages, color: `bg-[${p.color}]/60` }))}
                barHeight={32}
                formatValue={(v) => formatNumber(v)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Platform table */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Platform Performance Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Platform</th>
                    <th className="text-center py-2.5 text-surface-400 font-medium">Type</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Packages</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Mail</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Margin</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Customers</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Avg Processing</th>
                  </tr>
                </thead>
                <tbody>
                  {data.platforms.map((p) => {
                    const margin = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-surface-200 font-medium">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge variant={p.type === 'physical' ? 'info' : 'success'} dot={false}>
                            {p.type === 'physical' ? 'Physical' : 'Digital'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(p.packages)}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(p.mail)}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(p.revenue)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'danger'} dot={false}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(p.customers)}</td>
                        <td className="py-2.5 text-right text-surface-400">{p.avgProcessingTime} min</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Physical vs Digital Comparison ------- */}
      <TabPanel active={activeTab === 'comparison'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Monitor className="h-5 w-5" />} title="Physical Revenue" value={formatCurrency(data.physRevenue)} change={5.2} />
          <StatCard icon={<Mail className="h-5 w-5" />} title="Digital Revenue" value={formatCurrency(data.digRevenue)} change={18.7} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Physical Packages" value={formatNumber(data.physPkgs)} change={3.1} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Digital Packages" value={formatNumber(data.digPkgs)} change={12.4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Physical Revenue Trend (30d)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-surface-100">{formatCurrency(data.physRevenue)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> +5.2%</span>
              </div>
              <Sparkline data={data.physTrend} color="#6366f1" height={50} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Digital Revenue Trend (30d)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold text-surface-100">{formatCurrency(data.digRevenue)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> +18.7%</span>
              </div>
              <Sparkline data={data.digTrend} color="#10b981" height={50} />
            </CardContent>
          </Card>
        </div>

        {/* Side-by-side comparison table */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Physical vs Digital — Side by Side</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Metric</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">In-Store Physical</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Digital Platforms</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const physPlats = data.platforms.filter((p) => p.type === 'physical');
                    const digPlats = data.platforms.filter((p) => p.type === 'digital');
                    const physRev = physPlats.reduce((s, p) => s + p.revenue, 0);
                    const digRev = digPlats.reduce((s, p) => s + p.revenue, 0);
                    const physCost = physPlats.reduce((s, p) => s + p.cost, 0);
                    const digCost = digPlats.reduce((s, p) => s + p.cost, 0);
                    const physMail = physPlats.reduce((s, p) => s + p.mail, 0);
                    const digMail = digPlats.reduce((s, p) => s + p.mail, 0);
                    const physCust = physPlats.reduce((s, p) => s + p.customers, 0);
                    const digCust = digPlats.reduce((s, p) => s + p.customers, 0);

                    const rows = [
                      { metric: 'Revenue', phys: formatCurrency(physRev), dig: formatCurrency(digRev), diff: formatCurrency(digRev - physRev), positive: digRev > physRev },
                      { metric: 'Packages', phys: formatNumber(data.physPkgs), dig: formatNumber(data.digPkgs), diff: formatNumber(Math.abs(data.digPkgs - data.physPkgs)), positive: data.digPkgs > data.physPkgs },
                      { metric: 'Mail Pieces', phys: formatNumber(physMail), dig: formatNumber(digMail), diff: formatNumber(Math.abs(digMail - physMail)), positive: digMail > physMail },
                      { metric: 'Customers', phys: formatNumber(physCust), dig: formatNumber(digCust), diff: formatNumber(Math.abs(digCust - physCust)), positive: digCust > physCust },
                      { metric: 'Profit Margin', phys: `${(physRev > 0 ? ((physRev - physCost) / physRev) * 100 : 0).toFixed(1)}%`, dig: `${(digRev > 0 ? ((digRev - digCost) / digRev) * 100 : 0).toFixed(1)}%`, diff: '—', positive: true },
                    ];
                    return rows.map((row) => (
                      <tr key={row.metric} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 font-medium text-surface-200">{row.metric}</td>
                        <td className="py-2.5 text-right text-surface-300">{row.phys}</td>
                        <td className="py-2.5 text-right text-surface-300">{row.dig}</td>
                        <td className="py-2.5 text-right">
                          <span className={row.positive ? 'text-emerald-400' : 'text-red-400'}>{row.diff}</span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Platform Detail ------- */}
      <TabPanel active={activeTab === 'detail'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.platforms.map((p) => {
            const margin = p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0;
            const profit = p.revenue - p.cost;
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </CardTitle>
                  <Badge variant={p.type === 'physical' ? 'info' : 'success'} dot={false}>
                    {p.type === 'physical' ? 'Physical' : 'Digital'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-surface-400">Packages</p>
                      <p className="text-lg font-semibold text-surface-100">{formatNumber(p.packages)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Mail Pieces</p>
                      <p className="text-lg font-semibold text-surface-100">{formatNumber(p.mail)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Revenue</p>
                      <p className="text-lg font-semibold text-emerald-400">{formatCurrency(p.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Profit</p>
                      <p className="text-lg font-semibold text-emerald-400">{formatCurrency(profit)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Margin</p>
                      <Badge variant={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'danger'} dot={false}>
                        {margin.toFixed(1)}%
                      </Badge>
                    </div>
                    <div>
                      <p className="text-surface-400">Customers</p>
                      <p className="text-lg font-semibold text-surface-100">{formatNumber(p.customers)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Avg Processing</p>
                      <p className="text-lg font-semibold text-surface-100">{p.avgProcessingTime} min</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Rev Share</p>
                      <p className="text-lg font-semibold text-surface-100">{((p.revenue / totalRevenue) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Sparkline
                      data={generateDailySeries(14, parseInt(p.id.replace(/\D/g, '') || '0') + 800, 20, 60).map((d) => d.value)}
                      color={p.color}
                      height={36}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabPanel>
    </div>
  );
}
