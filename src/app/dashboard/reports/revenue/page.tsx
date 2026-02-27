'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, Sparkline, DonutChart } from '@/components/reports/mini-bar-chart';
import { seededRandom, generateDailySeries } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import { shipments, customers } from '@/lib/mock-data';
import {
  DollarSign,
  TrendingUp,


  BarChart3,
  Users,
  Truck,
  Layers,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Revenue data computations                                                  */
/* -------------------------------------------------------------------------- */
function useRevenueData() {
  return useMemo(() => {
    const totalRevenue = shipments.reduce((s, sh) => s + sh.retailPrice, 0);
    const totalCost = shipments.reduce((s, sh) => s + sh.wholesaleCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    /* Revenue by service line */
    const serviceLines = [
      { label: 'Shipping', revenue: totalRevenue * 0.52, cost: totalCost * 0.55, color: '#6366f1' },
      { label: 'Mailbox Rental', revenue: seededRandom(300, 3000, 5500), cost: seededRandom(301, 400, 800), color: '#10b981' },
      { label: 'Package Handling', revenue: seededRandom(302, 2000, 4000), cost: seededRandom(303, 600, 1200), color: '#f59e0b' },
      { label: 'Add-on Services', revenue: seededRandom(304, 800, 2000), cost: seededRandom(305, 200, 600), color: '#ef4444' },
      { label: 'Retail Sales', revenue: seededRandom(306, 500, 1500), cost: seededRandom(307, 300, 900), color: '#8b5cf6' },
    ];

    /* Carrier profitability */
    const byCarrier: Record<string, { count: number; revenue: number; cost: number }> = {};
    shipments.forEach((s) => {
      const key = s.carrier.toUpperCase();
      if (!byCarrier[key]) byCarrier[key] = { count: 0, revenue: 0, cost: 0 };
      byCarrier[key].count++;
      byCarrier[key].revenue += s.retailPrice;
      byCarrier[key].cost += s.wholesaleCost;
    });
    const carrierProfits = Object.entries(byCarrier)
      .map(([carrier, d]) => ({
        carrier,
        ...d,
        profit: d.revenue - d.cost,
        margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    /* Top customers by revenue */
    const customerRevenue = customers
      .filter((c) => c.status === 'active')
      .map((c) => ({
        name: `${c.firstName} ${c.lastName}`,
        pmb: c.pmbNumber || '—',
        revenue: (c.packageCount ?? 0) * 4.5 + (c.mailCount ?? 0) * 1.2 + seededRandom(parseInt(c.id.replace(/\D/g, '') || '0'), 50, 500),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    /* Revenue by platform */
    const platformRevenue = [
      { label: 'In-Store Physical', value: totalRevenue * 0.35, color: '#6366f1' },
      { label: 'iPostal1', value: totalRevenue * 0.28, color: '#10b981' },
      { label: 'PostScan Mail', value: totalRevenue * 0.22, color: '#f59e0b' },
      { label: 'AnyTime Mailbox', value: totalRevenue * 0.15, color: '#ef4444' },
    ];

    /* Trend data */
    const revenueTrend = generateDailySeries(30, 200, 400, 900);
    const profitTrend = generateDailySeries(30, 300, 150, 450);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      margin,
      serviceLines,
      carrierProfits,
      customerRevenue,
      platformRevenue,
      revenueTrend,
      profitTrend,
    };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Revenue Report Page                                                        */
/* -------------------------------------------------------------------------- */
export default function RevenueReportPage() {
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('summary');
  const data = useRevenueData();

  const tabs = [
    { id: 'summary', label: 'Revenue Summary', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'services', label: 'By Service Line', icon: <Layers className="h-4 w-4" /> },
    { id: 'carriers', label: 'By Carrier', icon: <Truck className="h-4 w-4" /> },
    { id: 'customers', label: 'By Customer', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue & Profitability"
        icon={<DollarSign className="h-6 w-6" />}
        description="Comprehensive revenue analysis — income, margins, and profit across all service lines"
        actions={<ExportToolbar reportName="Revenue_Report" />}
      />

      <Card>
        <CardHeader><CardTitle>Dimension Filters</CardTitle></CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Summary ------- */}
      <TabPanel active={activeTab === 'summary'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(data.totalRevenue)} change={12.4} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total COGS" value={formatCurrency(data.totalCost)} change={4.5} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Gross Profit" value={formatCurrency(data.totalProfit)} change={18.2} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} title="Profit Margin" value={`${data.margin.toFixed(1)}%`} change={2.1} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader><CardTitle>Revenue Trend (30 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xl font-bold text-surface-100">{formatCurrency(data.totalRevenue)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12.4% vs prior period
                </span>
              </div>
              <Sparkline data={data.revenueTrend.map((d) => d.value)} color="#10b981" height={60} />
              <div className="flex justify-between mt-2 text-[10px] text-surface-500">
                <span>{data.revenueTrend[0]?.date}</span>
                <span>{data.revenueTrend[data.revenueTrend.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by platform donut */}
          <Card>
            <CardHeader><CardTitle>Revenue by Platform</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.platformRevenue}
                size={150}
                centerValue={formatCurrency(data.totalRevenue)}
                centerLabel="total"
              />
              <div className="space-y-3 flex-1">
                {data.platformRevenue.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300">{seg.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatCurrency(seg.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Program revenue */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Revenue by Special Program</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={[
                { label: 'Amazon Counter', value: seededRandom(401, 1200, 3500), color: 'bg-yellow-500/60' },
                { label: 'PUDO Point', value: seededRandom(402, 800, 2200), color: 'bg-blue-500/60' },
                { label: 'FedEx Easy Returns', value: seededRandom(403, 600, 1800), color: 'bg-purple-500/60' },
                { label: 'Happy Returns', value: seededRandom(404, 400, 1500), color: 'bg-emerald-500/60' },
                { label: 'Vinted', value: seededRandom(405, 300, 1000), color: 'bg-pink-500/60' },
                { label: 'The Return', value: seededRandom(406, 200, 800), color: 'bg-orange-500/60' },
                { label: 'Return Queen', value: seededRandom(407, 100, 600), color: 'bg-red-500/60' },
              ]}
              barHeight={28}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- By Service Line ------- */}
      <TabPanel active={activeTab === 'services'}>
        <Card>
          <CardHeader><CardTitle>Service Line P&L</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Service</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">COGS</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Gross Profit</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Margin</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">% of Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serviceLines.map((svc) => {
                    const profit = svc.revenue - svc.cost;
                    const svcMargin = svc.revenue > 0 ? (profit / svc.revenue) * 100 : 0;
                    const revShare = (svc.revenue / data.serviceLines.reduce((s, l) => s + l.revenue, 0)) * 100;
                    return (
                      <tr key={svc.label} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: svc.color }} />
                            <span className="text-surface-200 font-medium">{svc.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(svc.revenue)}</td>
                        <td className="py-2.5 text-right text-surface-400">{formatCurrency(svc.cost)}</td>
                        <td className="py-2.5 text-right text-emerald-400">{formatCurrency(profit)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={svcMargin > 50 ? 'success' : svcMargin > 25 ? 'warning' : 'danger'} dot={false}>
                            {svcMargin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-400">{revShare.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-700">
                    <td className="py-2.5 font-semibold text-surface-100">Total</td>
                    <td className="py-2.5 text-right font-semibold text-surface-100">{formatCurrency(data.serviceLines.reduce((s, l) => s + l.revenue, 0))}</td>
                    <td className="py-2.5 text-right font-semibold text-surface-300">{formatCurrency(data.serviceLines.reduce((s, l) => s + l.cost, 0))}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-400">{formatCurrency(data.serviceLines.reduce((s, l) => s + l.revenue - l.cost, 0))}</td>
                    <td className="py-2.5 text-right"><Badge variant="success" dot={false}>{data.margin.toFixed(1)}%</Badge></td>
                    <td className="py-2.5 text-right text-surface-400">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Service Revenue Breakdown</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <DonutChart
              data={data.serviceLines.map((svc) => ({ label: svc.label, value: svc.revenue, color: svc.color }))}
              size={180}
              centerValue={formatCurrency(data.serviceLines.reduce((s, l) => s + l.revenue, 0))}
              centerLabel="total revenue"
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- By Carrier ------- */}
      <TabPanel active={activeTab === 'carriers'}>
        <Card>
          <CardHeader><CardTitle>Carrier Revenue & Profitability</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Carrier</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Shipments</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Wholesale</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Retail</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Profit</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.carrierProfits.map((cp) => (
                    <tr key={cp.carrier} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="py-2.5 font-medium text-surface-200">{cp.carrier}</td>
                      <td className="py-2.5 text-right text-surface-300">{cp.count}</td>
                      <td className="py-2.5 text-right text-surface-400">{formatCurrency(cp.cost)}</td>
                      <td className="py-2.5 text-right text-surface-200">{formatCurrency(cp.revenue)}</td>
                      <td className="py-2.5 text-right text-emerald-400">{formatCurrency(cp.profit)}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant={cp.margin > 30 ? 'success' : cp.margin > 15 ? 'warning' : 'danger'} dot={false}>
                          {cp.margin.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- By Customer ------- */}
      <TabPanel active={activeTab === 'customers'}>
        <Card>
          <CardHeader><CardTitle>Top 10 Customers by Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2 text-surface-400 font-medium">#</th>
                    <th className="text-left py-2 text-surface-400 font-medium">Customer</th>
                    <th className="text-left py-2 text-surface-400 font-medium">PMB</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customerRevenue.map((cr, i) => {
                    const totalCustRev = data.customerRevenue.reduce((s, c) => s + c.revenue, 0);
                    return (
                      <tr key={cr.pmb} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2 text-surface-500">{i + 1}</td>
                        <td className="py-2 text-surface-200 font-medium">{cr.name}</td>
                        <td className="py-2 text-surface-400">{cr.pmb}</td>
                        <td className="py-2 text-right text-surface-200">{formatCurrency(cr.revenue)}</td>
                        <td className="py-2 text-right text-surface-400">
                          {((cr.revenue / totalCustRev) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Customer Revenue Distribution</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.customerRevenue.map((cr) => ({ label: cr.name, value: cr.revenue }))}
              barHeight={24}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
