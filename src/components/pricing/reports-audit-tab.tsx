'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Package,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PieChart,
  Activity,
  Truck,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface RevenueByType {
  parcelType: string;
  revenue: number;
  volume: number;
  avgRevenue: number;
  change: number;
}

interface PlatformCost {
  platform: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

interface AuditEntry {
  id: string;
  date: string;
  entity: string;
  type: string;
  expected: number;
  actual: number;
  difference: number;
  status: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const MOCK_REVENUE_BY_TYPE: RevenueByType[] = [
  { parcelType: 'Package / Box', revenue: 12500, volume: 2500, avgRevenue: 5.00, change: 12.3 },
  { parcelType: 'Letter', revenue: 3200, volume: 6400, avgRevenue: 0.50, change: -2.1 },
  { parcelType: 'Parcel', revenue: 8100, volume: 2700, avgRevenue: 3.00, change: 8.5 },
  { parcelType: 'Large Box', revenue: 6400, volume: 800, avgRevenue: 8.00, change: 15.2 },
  { parcelType: 'Heavy Package', revenue: 4800, volume: 400, avgRevenue: 12.00, change: 5.6 },
  { parcelType: 'Freight', revenue: 3750, volume: 150, avgRevenue: 25.00, change: 22.0 },
  { parcelType: 'Softpak / Bubble Mailer', revenue: 4000, volume: 2000, avgRevenue: 2.00, change: 3.4 },
  { parcelType: 'Special Handling: Art', revenue: 1500, volume: 100, avgRevenue: 15.00, change: -5.0 },
  { parcelType: 'Perishables', revenue: 2000, volume: 200, avgRevenue: 10.00, change: 18.0 },
];

const MOCK_PLATFORM_COSTS: PlatformCost[] = [
  { platform: 'Anytime Mailbox', revenue: 8500, cost: 5950, profit: 2550, profitMargin: 30.0 },
  { platform: 'iPostal1', revenue: 6200, cost: 4650, profit: 1550, profitMargin: 25.0 },
  { platform: 'PostScan Mail', revenue: 4800, cost: 3456, profit: 1344, profitMargin: 28.0 },
  { platform: 'Boxfo', revenue: 2100, cost: 1638, profit: 462, profitMargin: 22.0 },
];

const MOCK_AUDIT: AuditEntry[] = [
  { id: 'a1', date: '2026-02-25', entity: 'FedEx HAL', type: 'Carrier Compensation', expected: 672.00, actual: 672.00, difference: 0, status: 'verified' },
  { id: 'a2', date: '2026-02-25', entity: 'UPS Access Point', type: 'Carrier Compensation', expected: 367.50, actual: 350.00, difference: -17.50, status: 'disputed' },
  { id: 'a3', date: '2026-02-20', entity: 'Anytime Mailbox', type: 'Platform Revenue', expected: 8500, actual: 8350, difference: -150, status: 'under_review' },
  { id: 'a4', date: '2026-02-20', entity: 'iPostal1', type: 'Platform Revenue', expected: 6200, actual: 6200, difference: 0, status: 'verified' },
  { id: 'a5', date: '2026-02-15', entity: 'Happy Returns', type: 'Program Revenue', expected: 2800, actual: 2800, difference: 0, status: 'verified' },
  { id: 'a6', date: '2026-02-15', entity: 'Amazon Counter', type: 'Program Revenue', expected: 5100, actual: 4950, difference: -150, status: 'under_review' },
];

const DATE_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
  { value: '1y', label: 'Last 12 Months' },
];

/* Export options available via the Export button in toolbar */

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function ReportsAuditTab() {
  const [subTab, setSubTab] = useState('pmb-analytics');
  const [dateRange, setDateRange] = useState('30d');

  const subTabs = [
    { id: 'pmb-analytics', label: 'PMB Analytics', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: 'platform-costs', label: 'Platform Costs', icon: <PieChart className="h-3.5 w-3.5" /> },
    { id: 'carrier-analysis', label: 'Carrier Analysis', icon: <Truck className="h-3.5 w-3.5" /> },
    { id: 'program-analysis', label: 'Programs', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'audit', label: 'Audit & Validation', icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  const totalRevenue = MOCK_REVENUE_BY_TYPE.reduce((s, r) => s + r.revenue, 0);
  const totalVolume = MOCK_REVENUE_BY_TYPE.reduce((s, r) => s + r.volume, 0);
  const avgRevPerPkg = totalVolume > 0 ? totalRevenue / totalVolume : 0;
  const topCustomerRevenue = 8750; // Mock

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Tabs tabs={subTabs} activeTab={subTab} onChange={setSubTab} />
      </div>
      <div className="flex items-center gap-3 justify-end">
        <Select options={DATE_RANGE_OPTIONS} value={dateRange} onChange={(e) => setDateRange(e.target.value)} />
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>Export</Button>
      </div>

      {/* PMB Analytics */}
      <TabPanel active={subTab === 'pmb-analytics'}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(totalRevenue)} change={9.4} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Volume" value={totalVolume.toLocaleString()} change={6.8} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Avg Revenue/Package" value={formatCurrency(avgRevPerPkg)} change={2.4} />
          <StatCard icon={<Users className="h-5 w-5" />} title="Top Customer Revenue" value={formatCurrency(topCustomerRevenue)} />
        </div>

        {/* Revenue by parcel type */}
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Revenue by Parcel Type</CardTitle></CardHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-5 py-2 text-xs font-medium text-surface-500 uppercase">Parcel Type</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Revenue</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Volume</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Avg/Pkg</th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-surface-500 uppercase">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {MOCK_REVENUE_BY_TYPE.sort((a, b) => b.revenue - a.revenue).map((r) => (
                  <tr key={r.parcelType}>
                    <td className="px-5 py-3 text-surface-200 font-medium">{r.parcelType}</td>
                    <td className="px-3 py-3 text-right text-surface-100 font-medium">{formatCurrency(r.revenue)}</td>
                    <td className="px-3 py-3 text-right text-surface-300">{r.volume.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-surface-300">{formatCurrency(r.avgRevenue)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${r.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(r.change)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-700">
                  <td className="px-5 py-3 font-bold text-surface-100">Total</td>
                  <td className="px-3 py-3 text-right font-bold text-surface-100">{formatCurrency(totalRevenue)}</td>
                  <td className="px-3 py-3 text-right font-bold text-surface-200">{totalVolume.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-bold text-surface-200">{formatCurrency(avgRevPerPkg)}</td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Revenue distribution bar */}
        <Card>
          <CardHeader><CardTitle>Revenue Distribution</CardTitle></CardHeader>
          <div className="space-y-3">
            {MOCK_REVENUE_BY_TYPE.sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((r) => {
              const pct = (r.revenue / totalRevenue) * 100;
              return (
                <div key={r.parcelType}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-surface-300">{r.parcelType}</span>
                    <span className="text-surface-400">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </TabPanel>

      {/* Platform Costs */}
      <TabPanel active={subTab === 'platform-costs'}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Platform Revenue" value={formatCurrency(MOCK_PLATFORM_COSTS.reduce((s, p) => s + p.revenue, 0))} />
          <StatCard icon={<Activity className="h-5 w-5" />} title="Platform Costs" value={formatCurrency(MOCK_PLATFORM_COSTS.reduce((s, p) => s + p.cost, 0))} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Net Profit" value={formatCurrency(MOCK_PLATFORM_COSTS.reduce((s, p) => s + p.profit, 0))} />
          <StatCard icon={<PieChart className="h-5 w-5" />} title="Avg Margin" value={`${(MOCK_PLATFORM_COSTS.reduce((s, p) => s + p.profitMargin, 0) / MOCK_PLATFORM_COSTS.length).toFixed(1)}%`} />
        </div>

        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Digital Mail Platform Cost Analysis</CardTitle></CardHeader>
          </div>
          <div className="divide-y divide-surface-800">
            {MOCK_PLATFORM_COSTS.map((p) => (
              <div key={p.platform} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-surface-100">{p.platform}</h4>
                  <Badge variant={p.profitMargin >= 28 ? 'success' : p.profitMargin >= 25 ? 'warning' : 'danger'}>
                    {p.profitMargin}% margin
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-800/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-surface-500 uppercase">Revenue</p>
                    <p className="text-sm font-bold text-surface-100">{formatCurrency(p.revenue)}</p>
                  </div>
                  <div className="bg-surface-800/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-surface-500 uppercase">Costs</p>
                    <p className="text-sm font-bold text-red-400">{formatCurrency(p.cost)}</p>
                  </div>
                  <div className="bg-surface-800/50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-surface-500 uppercase">Profit</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(p.profit)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      {/* Carrier Analysis */}
      <TabPanel active={subTab === 'carrier-analysis'}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatCard icon={<Truck className="h-5 w-5" />} title="FedEx HAL Compensation" value={formatCurrency(672.00)} change={9.7} />
          <StatCard icon={<Truck className="h-5 w-5" />} title="UPS AP Compensation" value={formatCurrency(367.50)} change={10.5} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Reconciliation Rate" value="87.5%" />
        </div>

        <Card>
          <CardHeader><CardTitle>Quarterly Compensation Trends</CardTitle></CardHeader>
          <div className="space-y-4">
            {[
              { quarter: 'Q4 2025', fedex: 1793.50, ups: 906.00 },
              { quarter: 'Q1 2026 (partial)', fedex: 1284.50, ups: 717.50 },
            ].map((q) => (
              <div key={q.quarter} className="bg-surface-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-surface-200 mb-3">{q.quarter}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-surface-500">FedEx HAL</p>
                    <p className="text-lg font-bold text-surface-100">{formatCurrency(q.fedex)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">UPS Access Point</p>
                    <p className="text-lg font-bold text-surface-100">{formatCurrency(q.ups)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      {/* Program Analysis */}
      <TabPanel active={subTab === 'program-analysis'}>
        <Card>
          <CardHeader><CardTitle>Special & Return Program Profitability</CardTitle></CardHeader>
          <div className="space-y-3">
            {[
              { name: 'Amazon Counter', revenue: 5100, costs: 3400, profit: 1700, volume: 850, trend: 15.2 },
              { name: 'Happy Returns', revenue: 2800, costs: 1680, profit: 1120, volume: 420, trend: 8.5 },
              { name: 'FedEx Easy Returns', revenue: 1200, costs: 780, profit: 420, volume: 180, trend: -3.2 },
            ].map((p) => (
              <div key={p.name} className="bg-surface-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-surface-100">{p.name}</h4>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${p.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(p.trend)}%
                    </span>
                  </div>
                  <span className="text-xs text-surface-500">{p.volume} items/mo</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-surface-500">Revenue</p>
                    <p className="text-sm font-bold text-surface-100">{formatCurrency(p.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-surface-500">Costs</p>
                    <p className="text-sm font-bold text-red-400">{formatCurrency(p.costs)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-surface-500">Profit</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(p.profit)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      {/* Audit & Validation */}
      <TabPanel active={subTab === 'audit'}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Verified" value={MOCK_AUDIT.filter((a) => a.status === 'verified').length} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Under Review" value={MOCK_AUDIT.filter((a) => a.status === 'under_review').length} />
          <StatCard icon={<Clock className="h-5 w-5" />} title="Disputed" value={MOCK_AUDIT.filter((a) => a.status === 'disputed').length} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Discrepancy" value={formatCurrency(Math.abs(MOCK_AUDIT.reduce((s, a) => s + a.difference, 0)))} />
        </div>

        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Payment Audit Trail</CardTitle></CardHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-5 py-2 text-xs font-medium text-surface-500 uppercase">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-surface-500 uppercase">Entity</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-surface-500 uppercase">Type</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Expected</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Actual</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Diff</th>
                  <th className="text-center px-5 py-2 text-xs font-medium text-surface-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {MOCK_AUDIT.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3 text-surface-300">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-surface-200 font-medium">{a.entity}</td>
                    <td className="px-3 py-3 text-surface-400">{a.type}</td>
                    <td className="px-3 py-3 text-right text-surface-100">{formatCurrency(a.expected)}</td>
                    <td className="px-3 py-3 text-right text-surface-100">{formatCurrency(a.actual)}</td>
                    <td className={`px-3 py-3 text-right font-medium ${a.difference === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.difference === 0 ? '—' : formatCurrency(a.difference)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={a.status === 'verified' ? 'success' : a.status === 'disputed' ? 'danger' : 'warning'}>
                        {a.status === 'verified' ? 'Verified' : a.status === 'disputed' ? 'Disputed' : 'Under Review'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-surface-200">Automated Audit Alerts</h4>
              <p className="text-xs text-surface-500 mt-1">
                Scheduled alerts are configured for overdue payments exceeding 30 days. 
                Discrepancies above $50 are flagged for immediate review. 
                Audit reports can be exported for dispute resolution.
              </p>
            </div>
          </div>
        </Card>
      </TabPanel>
    </div>
  );
}
