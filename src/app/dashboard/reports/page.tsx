'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { shipments, packages, customers } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import {
  Download,
  DollarSign,
  Package,
  Truck,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Receipt,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  UserMinus,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Date presets                                                              */
/* -------------------------------------------------------------------------- */
type DateRange = 'today' | 'week' | 'month' | 'custom';

const datePresets: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

/* -------------------------------------------------------------------------- */
/*  Chart data (last 14 days)                                                 */
/* -------------------------------------------------------------------------- */
const today = new Date('2026-02-21');
const last14Days = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(today.getTime() - (13 - i) * 86400000);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: Math.floor(3 + Math.random() * 12),
    ups: Math.floor(1 + Math.random() * 4),
    fedex: Math.floor(1 + Math.random() * 3),
    usps: Math.floor(0 + Math.random() * 3),
    amazon: Math.floor(1 + Math.random() * 5),
  };
});

/* -------------------------------------------------------------------------- */
/*  Revenue breakdown data                                                    */
/* -------------------------------------------------------------------------- */
const revenueBreakdown = [
  { category: 'Shipping', amount: 12847.50, color: 'bg-primary-500', textColor: 'text-primary-600' },
  { category: 'Storage Fees', amount: 2340.00, color: 'bg-accent-indigo', textColor: 'text-indigo-600' },
  { category: 'Receiving Fees', amount: 4560.00, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
];
const totalBreakdown = revenueBreakdown.reduce((s, r) => s + r.amount, 0);

/* -------------------------------------------------------------------------- */
/*  Carrier profit data                                                       */
/* -------------------------------------------------------------------------- */
function computeCarrierProfits() {
  const byCarrier: Record<string, { shipments: number; wholesale: number; retail: number }> = {};
  shipments.forEach((s) => {
    if (!byCarrier[s.carrier]) byCarrier[s.carrier] = { shipments: 0, wholesale: 0, retail: 0 };
    byCarrier[s.carrier].shipments++;
    byCarrier[s.carrier].wholesale += s.wholesaleCost;
    byCarrier[s.carrier].retail += s.retailPrice;
  });
  return Object.entries(byCarrier).map(([carrier, data]) => ({
    carrier: carrier.toUpperCase(),
    shipments: data.shipments,
    wholesale: data.wholesale,
    retail: data.retail,
    profit: data.retail - data.wholesale,
    margin: data.retail > 0 ? ((data.retail - data.wholesale) / data.retail) * 100 : 0,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Top customers                                                             */
/* -------------------------------------------------------------------------- */
function getTopCustomers() {
  return [...customers]
    .filter((c) => c.status === 'active' && (c.packageCount ?? 0) > 0)
    .sort((a, b) => (b.packageCount ?? 0) - (a.packageCount ?? 0))
    .slice(0, 8)
    .map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      pmb: c.pmbNumber,
      packages: c.packageCount ?? 0,
      revenue: (c.packageCount ?? 0) * 4.5 + (c.mailCount ?? 0) * 1.2,
    }));
}

/* -------------------------------------------------------------------------- */
/*  Reports Page                                                              */
/* -------------------------------------------------------------------------- */
export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const carrierProfits = useMemo(() => computeCarrierProfits(), []);
  const topCustomers = useMemo(() => getTopCustomers(), []);
  const totalProfitRow = useMemo(() => ({
    shipments: carrierProfits.reduce((s, c) => s + c.shipments, 0),
    wholesale: carrierProfits.reduce((s, c) => s + c.wholesale, 0),
    retail: carrierProfits.reduce((s, c) => s + c.retail, 0),
    profit: carrierProfits.reduce((s, c) => s + c.profit, 0),
    margin:
      carrierProfits.reduce((s, c) => s + c.retail, 0) > 0
        ? ((carrierProfits.reduce((s, c) => s + c.retail, 0) -
            carrierProfits.reduce((s, c) => s + c.wholesale, 0)) /
            carrierProfits.reduce((s, c) => s + c.retail, 0)) *
          100
        : 0,
  }), [carrierProfits]);

  const maxBarCount = Math.max(...last14Days.map((d) => d.count));

  const totalRevenue = shipments.reduce((s, sh) => s + sh.retailPrice, 0);
  const totalPkgs = packages.length;
  const totalShipments = shipments.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business insights and performance metrics"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => {
                window.open('/api/reports/export?type=packages&format=csv', '_blank');
              }}
            >
              Export Packages CSV
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => {
                window.open('/api/reports/export?type=customers&format=csv', '_blank');
              }}
            >
              Export Customers CSV
            </Button>
          </div>
        }
      />

      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-surface-400" />
        <span className="text-sm text-surface-400 mr-2">Period:</span>
        {datePresets.map((preset) => (
          <Button
            key={preset.id}
            variant={dateRange === preset.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDateRange(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          change={14}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          title="Total Packages"
          value={totalPkgs}
          change={8}
        />
        <StatCard
          icon={<Truck className="h-5 w-5" />}
          title="Total Shipments"
          value={totalShipments}
          change={12}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Avg Revenue/Day"
          value={formatCurrency(totalRevenue / 30)}
          change={5}
        />
      </div>

      {/* Package Volume Chart + Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Volume Chart (CSS bars) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary-600" />
              Package Volume (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-48">
              {last14Days.map((day) => {
                const pct = (day.count / maxBarCount) * 100;
                // Stacked bar: UPS portion, FedEx portion, USPS portion, Amazon portion
                const total = day.ups + day.fedex + day.usps + day.amazon;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-300"
                      style={{ height: `${pct}%` }}
                    >
                      <div
                        className="bg-amber-500/80"
                        style={{ height: `${(day.ups / total) * 100}%` }}
                      />
                      <div
                        className="bg-indigo-500/80"
                        style={{ height: `${(day.fedex / total) * 100}%` }}
                      />
                      <div
                        className="bg-blue-500/80"
                        style={{ height: `${(day.usps / total) * 100}%` }}
                      />
                      <div
                        className="bg-primary-500/80"
                        style={{ height: `${(day.amazon / total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-surface-500 truncate w-full text-center">
                      {day.date.split(' ')[1]}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-800">
              {[
                { label: 'Amazon', color: 'bg-primary-500' },
                { label: 'USPS', color: 'bg-blue-500' },
                { label: 'FedEx', color: 'bg-indigo-500' },
                { label: 'UPS', color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-surface-400">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary-600" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Visual ring */}
            <div className="flex justify-center mb-6">
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    const colors = ['#4f46e5', '#818cf8', '#10b981'];
                    return revenueBreakdown.map((item, i) => {
                      const pct = (item.amount / totalBreakdown) * 100;
                      const dashArray = `${pct} ${100 - pct}`;
                      const el = (
                        <circle
                          key={item.category}
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke={colors[i]}
                          strokeWidth="3.5"
                          strokeDasharray={dashArray}
                          strokeDashoffset={`-${offset}`}
                          className="transition-all duration-500"
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-surface-100">
                    {formatCurrency(totalBreakdown)}
                  </span>
                  <span className="text-[10px] text-surface-500">Total</span>
                </div>
              </div>
            </div>
            {/* Items */}
            <div className="space-y-3">
              {revenueBreakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-surface-300">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-surface-200">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-xs text-surface-500 ml-2">
                      {((item.amount / totalBreakdown) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Profit Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            Shipping Profit Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-surface-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 bg-surface-900/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Carrier
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Shipments
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Wholesale Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Retail Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Profit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody>
                {carrierProfits.map((row) => (
                  <tr key={row.carrier} className="border-b border-surface-700/60 table-row-hover">
                    <td className="px-4 py-3 text-surface-200 font-medium">{row.carrier}</td>
                    <td className="px-4 py-3 text-right text-surface-300">{row.shipments}</td>
                    <td className="px-4 py-3 text-right text-surface-400">
                      {formatCurrency(row.wholesale)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-200">
                      {formatCurrency(row.retail)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-300">
                      {row.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-surface-800/40 border-t border-surface-700">
                  <td className="px-4 py-3 text-surface-100 font-bold">TOTAL</td>
                  <td className="px-4 py-3 text-right text-surface-100 font-bold">
                    {totalProfitRow.shipments}
                  </td>
                  <td className="px-4 py-3 text-right text-surface-100 font-bold">
                    {formatCurrency(totalProfitRow.wholesale)}
                  </td>
                  <td className="px-4 py-3 text-right text-surface-100 font-bold">
                    {formatCurrency(totalProfitRow.retail)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                    {formatCurrency(totalProfitRow.profit)}
                  </td>
                  <td className="px-4 py-3 text-right text-surface-100 font-bold">
                    {totalProfitRow.margin.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Customers + Sales Tax Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-600" />
              Top Customers by Package Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCustomers.map((cust, idx) => (
                <div
                  key={cust.pmb}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-800/50 transition-colors"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-800 text-xs font-bold text-surface-400 border border-surface-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-surface-200">{cust.name}</span>
                    <span className="text-xs text-surface-500 ml-2">{cust.pmb}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-surface-200">
                      {cust.packages} pkgs
                    </span>
                    <p className="text-xs text-surface-500">{formatCurrency(cust.revenue)}</p>
                  </div>
                  {/* Volume bar */}
                  <div className="w-24 h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                      style={{
                        width: `${(cust.packages / (topCustomers[0]?.packages || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Tax Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary-600" />
              Sales Tax Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">
                  Gross Sales
                </p>
                <p className="text-2xl font-bold text-surface-100">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="h-px bg-surface-800" />
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">
                  Taxable Sales
                </p>
                <p className="text-lg font-semibold text-surface-200">
                  {formatCurrency(totalRevenue * 0.65)}
                </p>
                <p className="text-xs text-surface-500">65% of gross (shipping exempt)</p>
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Tax Rate</p>
                <p className="text-lg font-semibold text-surface-200">8.875%</p>
                <p className="text-xs text-surface-500">NY state + city</p>
              </div>
              <div className="h-px bg-surface-800" />
              <div className="p-3 rounded-lg bg-primary-50 border border-primary-500/20">
                <p className="text-xs text-primary-600 uppercase tracking-wider mb-1">
                  Tax Collected
                </p>
                <p className="text-2xl font-bold text-primary-300">
                  {formatCurrency(totalRevenue * 0.65 * 0.08875)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Advanced BI: Revenue by Service Type ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary-600" />
            Revenue by Service Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Mailbox Rentals', amount: 8400, prev: 7800, icon: <Receipt className="h-5 w-5 text-primary-500" /> },
              { label: 'Shipping Services', amount: 12847.50, prev: 11200, icon: <Truck className="h-5 w-5 text-indigo-500" /> },
              { label: 'Storage Fees', amount: 2340, prev: 2100, icon: <Package className="h-5 w-5 text-amber-500" /> },
              { label: 'Receiving Fees', amount: 4560, prev: 4200, icon: <BarChart3 className="h-5 w-5 text-emerald-500" /> },
            ].map((service) => {
              const change = service.prev > 0
                ? Math.round(((service.amount - service.prev) / service.prev) * 100)
                : 0;
              const isUp = change >= 0;
              return (
                <div key={service.label} className="rounded-lg border border-surface-700 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {service.icon}
                    <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
                      {service.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-surface-100">
                    {formatCurrency(service.amount)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {isUp ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isUp ? '+' : ''}{change}%
                    </span>
                    <span className="text-xs text-surface-500">vs last month</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Advanced BI: Customer Growth Chart ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            Customer Growth (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
            const newCustomers = [12, 18, 15, 22, 20, 25];
            const churned = [2, 3, 1, 4, 2, 3];
            const maxVal = Math.max(...newCustomers);
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-6 text-xs text-surface-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    New Customers
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    Churned
                  </span>
                </div>
                <div className="space-y-3">
                  {months.map((month, i) => (
                    <div key={month} className="flex items-center gap-3">
                      <span className="w-8 text-xs text-surface-500 text-right">{month}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-6 rounded bg-surface-800 overflow-hidden relative">
                          <div
                            className="h-full bg-emerald-500/70 rounded transition-all"
                            style={{ width: `${(newCustomers[i] / maxVal) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-emerald-400 w-6 text-right flex items-center gap-0.5">
                          <UserPlus className="h-3 w-3" />
                          {newCustomers[i]}
                        </span>
                        <span className="text-xs font-medium text-red-400 w-6 text-right flex items-center gap-0.5">
                          <UserMinus className="h-3 w-3" />
                          {churned[i]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-surface-800 flex items-center justify-between">
                  <span className="text-xs text-surface-500">Net growth this period</span>
                  <span className="text-sm font-bold text-emerald-400">
                    +{newCustomers.reduce((a, b) => a + b, 0) - churned.reduce((a, b) => a + b, 0)} customers
                  </span>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* ── Advanced BI: Period Comparison ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            This Month vs Last Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="py-2 pr-4 text-surface-400 font-medium">Metric</th>
                  <th className="py-2 pr-4 text-surface-400 font-medium text-right">This Month</th>
                  <th className="py-2 pr-4 text-surface-400 font-medium text-right">Last Month</th>
                  <th className="py-2 text-surface-400 font-medium text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Revenue', current: 28147.50, previous: 25300 },
                  { metric: 'Packages Received', current: 342, previous: 310 },
                  { metric: 'Packages Released', current: 318, previous: 295 },
                  { metric: 'New Customers', current: 25, previous: 20 },
                  { metric: 'Active Customers', current: 156, previous: 148 },
                  { metric: 'Shipments Created', current: 89, previous: 76 },
                  { metric: 'Avg Storage Days', current: 4.2, previous: 4.8 },
                ].map((row) => {
                  const change = row.previous > 0
                    ? ((row.current - row.previous) / row.previous) * 100
                    : 0;
                  const isUp = change >= 0;
                  // For "Avg Storage Days", down is good
                  const isPositive = row.metric === 'Avg Storage Days' ? !isUp : isUp;
                  return (
                    <tr key={row.metric} className="border-b border-surface-800">
                      <td className="py-3 pr-4 text-surface-300 font-medium">{row.metric}</td>
                      <td className="py-3 pr-4 text-right text-surface-100 font-semibold">
                        {row.metric === 'Revenue'
                          ? formatCurrency(row.current)
                          : typeof row.current === 'number' && row.current % 1 !== 0
                            ? row.current.toFixed(1)
                            : row.current.toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right text-surface-400">
                        {row.metric === 'Revenue'
                          ? formatCurrency(row.previous)
                          : typeof row.previous === 'number' && row.previous % 1 !== 0
                            ? row.previous.toFixed(1)
                            : row.previous.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isUp ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {isUp ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
