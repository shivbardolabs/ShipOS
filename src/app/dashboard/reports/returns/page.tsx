'use client';

import { useState, useMemo } from 'react';
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
  RotateCcw,
  Package,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  Users,

} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Returns program data                                                       */
/* -------------------------------------------------------------------------- */
interface ReturnsProgram {
  id: string;
  name: string;
  description: string;
  totalReturns: number;
  revenuePerReturn: number;
  totalRevenue: number;
  avgProcessingTime: number;
  color: string;
}

interface ReturnsByPeriod {
  period: string;
  fedexEasy: number;
  happyReturns: number;
}

function useReturnsData() {
  return useMemo(() => {
    const programs: ReturnsProgram[] = [
      {
        id: 'fedex_easy',
        name: 'FedEx Easy Returns',
        description: 'FedEx-branded returns service at retail locations',
        totalReturns: seededRandom(300, 200, 500),
        revenuePerReturn: seededRandom(301, 3, 8),
        totalRevenue: seededRandom(302, 1200, 3500),
        avgProcessingTime: seededRandom(303, 5, 12),
        color: '#4F46E5',
      },
      {
        id: 'happy_returns',
        name: 'Happy Returns',
        description: 'PayPal-owned returns aggregation with retail drop-off points',
        totalReturns: seededRandom(310, 150, 400),
        revenuePerReturn: seededRandom(311, 2, 6),
        totalRevenue: seededRandom(312, 800, 2800),
        avgProcessingTime: seededRandom(313, 3, 10),
        color: '#10B981',
      },
    ];

    const totalReturns = programs.reduce((s, p) => s + p.totalReturns, 0);
    const totalRevenue = programs.reduce((s, p) => s + p.totalRevenue, 0);
    const avgProcessing = Math.round(programs.reduce((s, p) => s + p.avgProcessingTime, 0) / programs.length);

    /* Returns by carrier */
    const returnsByCarrier = [
      { label: 'FedEx', value: seededRandom(320, 100, 250), color: '#4F46E5' },
      { label: 'UPS', value: seededRandom(321, 60, 180), color: '#D97706' },
      { label: 'USPS', value: seededRandom(322, 40, 120), color: '#2563EB' },
      { label: 'Amazon', value: seededRandom(323, 30, 100), color: '#F97316' },
    ];

    /* Returns by platform */
    const returnsByPlatform = [
      { label: 'In-Store', value: seededRandom(330, 150, 300), color: '#6366F1' },
      { label: 'AnyTime Mailbox', value: seededRandom(331, 60, 150), color: '#10B981' },
      { label: 'iPostal1', value: seededRandom(332, 50, 130), color: '#F59E0B' },
      { label: 'PostScan Mail', value: seededRandom(333, 30, 100), color: '#EF4444' },
    ];

    /* Top merchants by returns */
    const topMerchants = [
      { name: 'Amazon', returns: seededRandom(340, 60, 150), revenue: seededRandom(341, 300, 800) },
      { name: 'Shein', returns: seededRandom(342, 40, 120), revenue: seededRandom(343, 200, 600) },
      { name: 'Zara', returns: seededRandom(344, 30, 80), revenue: seededRandom(345, 150, 450) },
      { name: 'Nike', returns: seededRandom(346, 25, 70), revenue: seededRandom(347, 120, 400) },
      { name: 'H&M', returns: seededRandom(348, 20, 60), revenue: seededRandom(349, 100, 350) },
      { name: 'Target', returns: seededRandom(350, 15, 50), revenue: seededRandom(351, 80, 300) },
      { name: 'Walmart', returns: seededRandom(352, 10, 40), revenue: seededRandom(353, 60, 250) },
      { name: 'Nordstrom', returns: seededRandom(354, 8, 35), revenue: seededRandom(355, 50, 200) },
    ].sort((a, b) => b.returns - a.returns);

    /* Trend data */
    const periods: ReturnsByPeriod[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
      (m, i) => ({
        period: m,
        fedexEasy: seededRandom(360 + i, 20, 50),
        happyReturns: seededRandom(380 + i, 15, 40),
      })
    );

    const returnsTrend = generateDailySeries(30, 400, 5, 25).map((d) => d.value);

    return {
      programs,
      totalReturns,
      totalRevenue,
      avgProcessing,
      returnsByCarrier,
      returnsByPlatform,
      topMerchants,
      periods,
      returnsTrend,
    };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Returns Report Page — BAR-276                                              */
/* -------------------------------------------------------------------------- */
export default function ReturnsReportPage() {
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const data = useReturnsData();

  const tabs = [
    { id: 'overview', label: 'Returns Overview', icon: <RotateCcw className="h-4 w-4" /> },
    { id: 'trends', label: 'Trends', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'merchants', label: 'Top Merchants', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns Program Reporting"
        icon={<RotateCcw className="h-6 w-6" />}
        description="Track returns programs."
        actions={<ExportToolbar reportName="Returns_Report" />}
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
          <StatCard icon={<RotateCcw className="h-5 w-5" />} title="Total Returns" value={formatNumber(data.totalReturns)} change={7.8} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Returns Revenue" value={formatCurrency(data.totalRevenue)} change={12.3} />
          <StatCard icon={<Clock className="h-5 w-5" />} title="Avg Processing" value={`${data.avgProcessing} min`} change={-8.5} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Programs Active" value="2" />
        </div>

        {/* Program cards side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.programs.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </CardTitle>
                <Badge variant="success" dot>Active</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-surface-400 mb-4">{p.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-400">Returns Processed</p>
                    <p className="text-xl font-bold text-surface-100">{formatNumber(p.totalReturns)}</p>
                  </div>
                  <div>
                    <p className="text-surface-400">Revenue</p>
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(p.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-surface-400">Rev / Return</p>
                    <p className="text-lg font-semibold text-surface-200">{formatCurrency(p.revenuePerReturn)}</p>
                  </div>
                  <div>
                    <p className="text-surface-400">Avg Processing</p>
                    <p className="text-lg font-semibold text-surface-200">{p.avgProcessingTime} min</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Sparkline
                    data={generateDailySeries(14, p.totalReturns + 500, 3, 15).map((d) => d.value)}
                    color={p.color}
                    height={36}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Returns distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Returns by Carrier</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.returnsByCarrier}
                size={150}
                centerValue={formatNumber(data.totalReturns)}
                centerLabel="returns"
              />
              <div className="space-y-2 flex-1">
                {data.returnsByCarrier.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-surface-300">{c.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatNumber(c.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Returns by Platform</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.returnsByPlatform}
                size={150}
                centerValue={formatNumber(data.returnsByPlatform.reduce((s, p) => s + p.value, 0))}
                centerLabel="returns"
              />
              <div className="space-y-2 flex-1">
                {data.returnsByPlatform.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-surface-300">{p.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatNumber(p.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Trends ------- */}
      <TabPanel active={activeTab === 'trends'}>
        <Card>
          <CardHeader><CardTitle>Returns Volume Trend (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xl font-bold text-surface-100">{formatNumber(data.totalReturns)} returns</span>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +7.8% vs prior period
              </span>
            </div>
            <Sparkline data={data.returnsTrend} color="#6366f1" height={60} />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Monthly Returns by Program</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Month</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">FedEx Easy</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Happy Returns</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Total</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">MoM Change</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((p, i) => {
                    const total = p.fedexEasy + p.happyReturns;
                    const prevTotal = i > 0 ? data.periods[i - 1].fedexEasy + data.periods[i - 1].happyReturns : total;
                    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
                    return (
                      <tr key={p.period} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 text-surface-200 font-medium">{p.period}</td>
                        <td className="py-2.5 text-right text-surface-300">{p.fedexEasy}</td>
                        <td className="py-2.5 text-right text-surface-300">{p.happyReturns}</td>
                        <td className="py-2.5 text-right text-surface-200 font-medium">{total}</td>
                        <td className="py-2.5 text-right">
                          {i > 0 ? (
                            <span className={change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-surface-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Returns vs Regular Flow */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Returns vs Regular Package Flow</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 rounded-lg bg-surface-800/30">
                <Package className="h-8 w-8 mx-auto text-primary-400 mb-2" />
                <p className="text-2xl font-bold text-surface-100">{formatNumber(seededRandom(390, 400, 900))}</p>
                <p className="text-sm text-surface-400 mt-1">Regular Packages</p>
                <p className="text-xs text-surface-500 mt-1">{seededRandom(391, 70, 85)}% of total flow</p>
              </div>
              <div className="text-center p-6 rounded-lg bg-surface-800/30">
                <RotateCcw className="h-8 w-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-2xl font-bold text-surface-100">{formatNumber(data.totalReturns)}</p>
                <p className="text-sm text-surface-400 mt-1">Returns</p>
                <p className="text-xs text-surface-500 mt-1">{seededRandom(392, 15, 30)}% of total flow</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Top Merchants ------- */}
      <TabPanel active={activeTab === 'merchants'}>
        <Card>
          <CardHeader><CardTitle>Top Returned-to Merchants</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">#</th>
                    <th className="text-left py-2.5 text-surface-400 font-medium">Merchant</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Returns</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topMerchants.map((m, i) => {
                    const pct = data.totalReturns > 0 ? (m.returns / data.totalReturns) * 100 : 0;
                    return (
                      <tr key={m.name} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 text-surface-500">{i + 1}</td>
                        <td className="py-2.5 text-surface-200 font-medium">{m.name}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(m.returns)}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(m.revenue)}</td>
                        <td className="py-2.5 text-right text-surface-400">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Merchant Returns Volume</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.topMerchants.map((m) => ({ label: m.name, value: m.returns }))}
              barHeight={28}
            />
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
