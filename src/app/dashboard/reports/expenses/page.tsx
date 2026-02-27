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
import { seededRandom, generateDailySeries } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Package,
  Settings2,
  Plus,
  BarChart3,
  Layers,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Expense data                                                               */
/* -------------------------------------------------------------------------- */
interface ExpenseCategory {
  id: string;
  label: string;
  amount: number;
  color: string;
  subcategories: { label: string; amount: number }[];
}

function useExpenseData(shipments: any[]) {
  return useMemo(() => {
    const wholesaleCost = shipments.reduce((s, sh) => s + sh.wholesaleCost, 0);
    const totalRevenue = shipments.reduce((s, sh) => s + sh.retailPrice, 0);

    const categories: ExpenseCategory[] = [
      {
        id: 'carrier_costs',
        label: 'Carrier Costs',
        amount: wholesaleCost,
        color: '#6366f1',
        subcategories: [
          { label: 'FedEx Wholesale', amount: wholesaleCost * 0.35 },
          { label: 'UPS Wholesale', amount: wholesaleCost * 0.30 },
          { label: 'USPS Wholesale', amount: wholesaleCost * 0.20 },
          { label: 'DHL Wholesale', amount: wholesaleCost * 0.10 },
          { label: 'Other Carriers', amount: wholesaleCost * 0.05 },
        ],
      },
      {
        id: 'packaging',
        label: 'Packaging & Supplies',
        amount: seededRandom(500, 800, 1600),
        color: '#10b981',
        subcategories: [
          { label: 'Boxes & Mailers', amount: seededRandom(501, 300, 700) },
          { label: 'Tape & Labels', amount: seededRandom(502, 100, 300) },
          { label: 'Bubble Wrap / Packing', amount: seededRandom(503, 150, 350) },
          { label: 'Printer Supplies', amount: seededRandom(504, 50, 200) },
        ],
      },
      {
        id: 'insurance',
        label: 'Insurance Costs',
        amount: seededRandom(510, 400, 1200),
        color: '#f59e0b',
        subcategories: [
          { label: 'Carrier Insurance', amount: seededRandom(511, 200, 600) },
          { label: 'Third-party Insurance', amount: seededRandom(512, 150, 500) },
        ],
      },
      {
        id: 'platform_fees',
        label: 'Platform Fees',
        amount: seededRandom(520, 600, 1800),
        color: '#ef4444',
        subcategories: [
          { label: 'AnyTime Mailbox Fees', amount: seededRandom(521, 150, 500) },
          { label: 'iPostal1 Fees', amount: seededRandom(522, 200, 600) },
          { label: 'PostScan Mail Fees', amount: seededRandom(523, 100, 400) },
        ],
      },
      {
        id: 'equipment',
        label: 'Equipment & Maintenance',
        amount: seededRandom(530, 200, 800),
        color: '#8b5cf6',
        subcategories: [
          { label: 'Printer Maintenance', amount: seededRandom(531, 50, 200) },
          { label: 'Scanner Maintenance', amount: seededRandom(532, 30, 150) },
          { label: 'Scale Calibration', amount: seededRandom(533, 20, 100) },
        ],
      },
      {
        id: 'labor',
        label: 'Labor (Manual Entry)',
        amount: seededRandom(540, 2000, 5000),
        color: '#ec4899',
        subcategories: [
          { label: 'Shipping Staff', amount: seededRandom(541, 1200, 3000) },
          { label: 'Mail Processing', amount: seededRandom(542, 600, 1500) },
        ],
      },
    ];

    const totalExpenses = categories.reduce((s, c) => s + c.amount, 0);
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    const netProfit = totalRevenue - totalExpenses;

    /* Trend */
    const expenseTrend = generateDailySeries(30, 600, 200, 600);

    /* Carrier cost breakdown */
    const carrierCosts: { carrier: string; cost: number; change: number }[] = [];
    const byCarrier: Record<string, number> = {};
    shipments.forEach((s) => {
      const key = s.carrier.toUpperCase();
      byCarrier[key] = (byCarrier[key] || 0) + s.wholesaleCost;
    });
    Object.entries(byCarrier)
      .sort((a, b) => b[1] - a[1])
      .forEach(([carrier, cost], i) => {
        carrierCosts.push({ carrier, cost, change: seededRandom(700 + i, -8, 15) });
      });

    /* Cost per package / per shipment */
    const costPerPackage = totalExpenses / Math.max(shipments.length, 1);
    const costPerShipment = wholesaleCost / Math.max(shipments.length, 1);

    return {
      categories,
      totalExpenses,
      totalRevenue,
      netProfit,
      expenseRatio,
      expenseTrend,
      carrierCosts,
      costPerPackage,
      costPerShipment,
    };
  }, [shipments]);
}

/* -------------------------------------------------------------------------- */
/*  Expenses Report Page                                                       */
/* -------------------------------------------------------------------------- */
export default function ExpensesReportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
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
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const data = useExpenseData(shipments);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Receipt className="h-4 w-4" /> },
    { id: 'categories', label: 'By Category', icon: <Layers className="h-4 w-4" /> },
    { id: 'carrier-costs', label: 'Carrier Costs', icon: <Truck className="h-4 w-4" /> },
    { id: 'configure', label: 'Configure', icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses & COGS"
        icon={<Receipt className="h-6 w-6" />}
        description="Track carrier costs, materials, platform fees, and operating expenses"
        actions={<ExportToolbar reportName="Expense_Report" />}
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
          <StatCard icon={<Receipt className="h-5 w-5" />} title="Total Expenses" value={formatCurrency(data.totalExpenses)} change={4.5} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(data.totalRevenue)} change={12.4} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} title="Expense-to-Revenue" value={`${data.expenseRatio.toFixed(1)}%`} change={-2.3} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Cost per Shipment" value={formatCurrency(data.costPerShipment)} change={-1.8} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense vs Revenue */}
          <Card>
            <CardHeader><CardTitle>Expenses vs Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-400">Revenue</span>
                    <span className="text-surface-200">{formatCurrency(data.totalRevenue)}</span>
                  </div>
                  <div className="h-6 bg-surface-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-400">Total Expenses</span>
                    <span className="text-surface-200">{formatCurrency(data.totalExpenses)}</span>
                  </div>
                  <div className="h-6 bg-surface-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${data.expenseRatio}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-400">Net Profit</span>
                    <span className="text-emerald-400 font-semibold">{formatCurrency(data.netProfit)}</span>
                  </div>
                  <div className="h-6 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500/60 rounded-full"
                      style={{ width: `${((data.netProfit / data.totalRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category donut */}
          <Card>
            <CardHeader><CardTitle>Expense Distribution</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.categories.map((c) => ({ label: c.label, value: c.amount, color: c.color }))}
                size={150}
                centerValue={formatCurrency(data.totalExpenses)}
                centerLabel="total"
              />
              <div className="space-y-2 flex-1">
                {data.categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-surface-300 truncate">{cat.label}</span>
                    </div>
                    <span className="text-surface-200">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Expense Trend (30 days)</CardTitle></CardHeader>
          <CardContent>
            <Sparkline data={data.expenseTrend.map((d) => d.value)} color="#ef4444" height={50} />
            <div className="flex justify-between mt-2 text-[10px] text-surface-500">
              <span>{data.expenseTrend[0]?.date}</span>
              <span>{data.expenseTrend[data.expenseTrend.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Categories ------- */}
      <TabPanel active={activeTab === 'categories'}>
        <div className="space-y-4">
          {data.categories.map((cat) => (
            <Card key={cat.id}>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <div>
                    <p className="text-sm font-semibold text-surface-200">{cat.label}</p>
                    <p className="text-xs text-surface-500">
                      {((cat.amount / data.totalExpenses) * 100).toFixed(1)}% of total expenses
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-surface-100">{formatCurrency(cat.amount)}</span>
              </div>
              {expandedCat === cat.id && (
                <div className="mt-4 pl-6 space-y-2 border-l-2 border-surface-700">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.label} className="flex items-center justify-between text-sm py-1">
                      <span className="text-surface-400">{sub.label}</span>
                      <span className="text-surface-300">{formatCurrency(sub.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </TabPanel>

      {/* ------- Carrier Costs ------- */}
      <TabPanel active={activeTab === 'carrier-costs'}>
        <Card>
          <CardHeader><CardTitle>Carrier Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2 text-surface-400 font-medium">Carrier</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Wholesale Cost</th>
                    <th className="text-right py-2 text-surface-400 font-medium">% of COGS</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Change</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.carrierCosts.map((cc) => {
                    const totalCarrierCost = data.carrierCosts.reduce((s, c) => s + c.cost, 0);
                    return (
                      <tr key={cc.carrier} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 font-medium text-surface-200">{cc.carrier}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(cc.cost)}</td>
                        <td className="py-2.5 text-right text-surface-400">
                          {((cc.cost / totalCarrierCost) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={cc.change >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {cc.change >= 0 ? '+' : ''}{cc.change}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          {cc.change >= 0
                            ? <TrendingUp className="h-4 w-4 text-red-400 inline" />
                            : <TrendingDown className="h-4 w-4 text-emerald-400 inline" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* By program */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Costs by Special Program</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={[
                { label: 'Amazon Counter', value: seededRandom(600, 400, 1200), color: 'bg-yellow-500/60' },
                { label: 'FedEx HAL', value: seededRandom(601, 300, 900), color: 'bg-blue-500/60' },
                { label: 'UPS Access Point', value: seededRandom(602, 200, 700), color: 'bg-purple-500/60' },
                { label: 'FedEx Easy Returns', value: seededRandom(603, 150, 500), color: 'bg-emerald-500/60' },
                { label: 'Happy Returns', value: seededRandom(604, 100, 400), color: 'bg-red-500/60' },
              ]}
              barHeight={28}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Configure ------- */}
      <TabPanel active={activeTab === 'configure'}>
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <p className="text-xs text-surface-400">Configure which expense categories are tracked for your store</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/30">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-surface-200">{cat.label}</span>
                  </div>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
              ))}
              <button className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-surface-600 text-surface-400 hover:text-surface-200 hover:border-surface-500 transition-colors text-sm">
                <Plus className="h-4 w-4" />
                Add Custom Category
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Manual Expense Entry</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-surface-400">
              For labor, equipment, and other non-automated expenses, use the manual entry form to record costs.
              These will be included in expense calculations and reports.
            </p>
            <div className="mt-4 p-6 rounded-lg bg-surface-800/30 border border-dashed border-surface-700 text-center">
              <Receipt className="h-8 w-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-400">Manual expense entry form</p>
              <p className="text-xs text-surface-500 mt-1">Coming soon — currently in development</p>
            </div>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
