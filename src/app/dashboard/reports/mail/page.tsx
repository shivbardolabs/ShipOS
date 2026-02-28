'use client';
/* eslint-disable */

import { useState, useMemo, useEffect} from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';

import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, Sparkline, DonutChart } from '@/components/reports/mini-bar-chart';
import { formatNumber, seededRandom, generateDailySeries, generateWeeklySeries } from '@/lib/report-utils';
import {
  Mail,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Mail & parcel statistics                                                   */
/* -------------------------------------------------------------------------- */
function useMailStats(customers: any[], packages: any[]) {
  return useMemo(() => {
    const totalMail = customers.reduce((s, c) => s + (c.mailCount ?? 0), 0);
    const totalPackages = packages.length;
    const checkedIn = packages.filter((p) => p.status === 'checked_in').length;
    const checkedOut = packages.filter((p) => p.status === 'released').length;

    /* Mail status breakdown */
    const mailByStatus = [
      { label: 'Received', value: Math.round(totalMail * 0.40), color: '#6366f1' },
      { label: 'Scanned', value: Math.round(totalMail * 0.25), color: '#10b981' },
      { label: 'Forwarded', value: Math.round(totalMail * 0.20), color: '#f59e0b' },
      { label: 'Held', value: Math.round(totalMail * 0.10), color: '#ef4444' },
      { label: 'Disposed', value: Math.round(totalMail * 0.05), color: '#94a3b8' },
    ];

    /* Mail by customer - top 10 */
    const mailByCustomer = customers
      .filter((c) => (c.mailCount ?? 0) > 0)
      .sort((a, b) => (b.mailCount ?? 0) - (a.mailCount ?? 0))
      .slice(0, 10)
      .map((c) => ({ label: `${c.firstName} ${c.lastName}`, value: c.mailCount ?? 0 }));

    /* Mail by platform */
    const platformMail: Record<string, number> = {};
    customers.forEach((c) => {
      const plat = c.platform || 'physical';
      platformMail[plat] = (platformMail[plat] || 0) + (c.mailCount ?? 0);
    });
    const mailByPlatform = Object.entries(platformMail)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
      }));

    /* Carrier breakdown for parcels */
    const carrierParcels: Record<string, number> = {};
    packages.forEach((p) => {
      const key = (p.carrier || 'Unknown').toUpperCase();
      carrierParcels[key] = (carrierParcels[key] || 0) + 1;
    });
    const parcelByCarrier = Object.entries(carrierParcels)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    /* Time series */
    const dailyMail = generateDailySeries(30, 100, 15, 45);
    const dailyParcels = generateDailySeries(30, 200, 5, 20);
    const weeklyMail = generateWeeklySeries(12, 100, 80, 250);
    const weeklyParcels = generateWeeklySeries(12, 200, 40, 120);

    /* Department / function breakdown */
    const functionBreakdown = [
      { label: 'Receiving', value: seededRandom(800, 120, 350) },
      { label: 'Shipping', value: seededRandom(801, 80, 250) },
      { label: 'Mail Processing', value: seededRandom(802, 100, 300) },
      { label: 'Returns', value: seededRandom(803, 30, 100) },
    ];

    /* Average hold time */
    const avgHoldTime = 4.2;

    /* Programs */
    const programParcels = [
      { label: 'Amazon Counter', value: seededRandom(810, 8, 25), color: 'bg-yellow-500/60' },
      { label: 'PUDO Point', value: seededRandom(811, 5, 18), color: 'bg-blue-500/60' },
      { label: 'FedEx HAL', value: seededRandom(812, 4, 15), color: 'bg-purple-500/60' },
      { label: 'UPS Access Point', value: seededRandom(813, 3, 12), color: 'bg-emerald-500/60' },
      { label: 'Vinted', value: seededRandom(814, 2, 8), color: 'bg-pink-500/60' },
    ];

    return {
      totalMail,
      totalPackages,
      checkedIn,
      checkedOut,
      avgHoldTime,
      mailByStatus,
      mailByCustomer,
      mailByPlatform,
      parcelByCarrier,
      dailyMail,
      dailyParcels,
      weeklyMail,
      weeklyParcels,
      functionBreakdown,
      programParcels,
    };
  }, [customers, packages]);
}

/* -------------------------------------------------------------------------- */
/*  Mail & Parcel Statistics Page                                              */
/* -------------------------------------------------------------------------- */
export default function MailReportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
    fetch('/api/customers?limit=500').then(r => r.json()).then(d => setCustomers(d.customers || [])),
    fetch('/api/packages?limit=500').then(r => r.json()).then(d => setPackages(d.packages || [])),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('mail');
  const data = useMailStats(customers, packages);

  const tabs = [
    { id: 'mail', label: 'Mail Statistics', icon: <Mail className="h-4 w-4" /> },
    { id: 'parcels', label: 'Parcel Statistics', icon: <Package className="h-4 w-4" /> },
    { id: 'trends', label: 'Trends & Comparison', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'departments', label: 'By Function', icon: <Layers className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mail & Parcel Statistics"
        icon={<Mail className="h-6 w-6" />}
        description="Volume statistics with time-period granularity — mail, parcels, and function breakdowns"
        actions={<ExportToolbar reportName="Mail_Parcel_Stats" />}
      />

      <Card>
        <CardHeader><CardTitle>Dimension Filters</CardTitle></CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Mail Statistics ------- */}
      <TabPanel active={activeTab === 'mail'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Mail className="h-5 w-5" />} title="Total Mail Pieces" value={formatNumber(data.totalMail)} change={3.9} />
          <StatCard icon={<Mail className="h-5 w-5" />} title="Scanned" value={formatNumber(data.mailByStatus[1]?.value ?? 0)} change={7.2} />
          <StatCard icon={<Mail className="h-5 w-5" />} title="Forwarded" value={formatNumber(data.mailByStatus[2]?.value ?? 0)} change={12.1} />
          <StatCard icon={<Mail className="h-5 w-5" />} title="Held" value={formatNumber(data.mailByStatus[3]?.value ?? 0)} change={-5.4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Mail Status Distribution</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <DonutChart
                data={data.mailByStatus}
                size={170}
                centerValue={formatNumber(data.totalMail)}
                centerLabel="total"
              />
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {data.mailByStatus.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300">{seg.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatNumber(seg.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Mail by Customer (Top 10)</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart data={data.mailByCustomer} barHeight={24} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>Mail by Platform</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.mailByPlatform.map((p) => ({ ...p, color: undefined }))}
              barHeight={28}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Parcel Statistics ------- */}
      <TabPanel active={activeTab === 'parcels'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Packages" value={formatNumber(data.totalPackages)} change={8.1} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Checked In" value={formatNumber(data.checkedIn)} change={5.2} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Checked Out" value={formatNumber(data.checkedOut)} change={-2.1} />
          <StatCard icon={<Clock className="h-5 w-5" />} title="Avg Hold Time" value={`${data.avgHoldTime} days`} change={-1.8} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Parcels by Carrier</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.parcelByCarrier.map((p) => ({ ...p, color: 'bg-primary-500/60' }))}
                barHeight={28}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Parcels by Program</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart data={data.programParcels} barHeight={28} />
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Trends ------- */}
      <TabPanel active={activeTab === 'trends'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Daily Mail Volume (30 days)</CardTitle></CardHeader>
            <CardContent>
              <Sparkline data={data.dailyMail.map((d) => d.value)} color="#6366f1" height={50} />
              <div className="flex justify-between mt-2 text-[10px] text-surface-500">
                <span>{data.dailyMail[0]?.date}</span>
                <span>{data.dailyMail[data.dailyMail.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Daily Parcel Volume (30 days)</CardTitle></CardHeader>
            <CardContent>
              <Sparkline data={data.dailyParcels.map((d) => d.value)} color="#10b981" height={50} />
              <div className="flex justify-between mt-2 text-[10px] text-surface-500">
                <span>{data.dailyParcels[0]?.date}</span>
                <span>{data.dailyParcels[data.dailyParcels.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period comparison table */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Period-over-Period Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2 text-surface-400 font-medium">Metric</th>
                    <th className="text-right py-2 text-surface-400 font-medium">This Period</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Last Period</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Change</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Mail Pieces Received', current: data.totalMail, change: 3.9 },
                    { metric: 'Mail Scanned', current: data.mailByStatus[1]?.value ?? 0, change: 7.2 },
                    { metric: 'Mail Forwarded', current: data.mailByStatus[2]?.value ?? 0, change: 12.1 },
                    { metric: 'Packages Received', current: data.totalPackages, change: 8.1 },
                    { metric: 'Packages Checked Out', current: data.checkedOut, change: -2.1 },
                    { metric: 'Avg Hold Time (days)', current: data.avgHoldTime, change: -1.8 },
                  ].map((row) => {
                    const prev = row.current * (1 - row.change / 100);
                    return (
                      <tr key={row.metric} className="border-b border-surface-800/50">
                        <td className="py-2 text-surface-200">{row.metric}</td>
                        <td className="py-2 text-right text-surface-200 font-medium">
                          {typeof row.current === 'number' && row.current % 1 !== 0
                            ? row.current.toFixed(1)
                            : formatNumber(row.current)}
                        </td>
                        <td className="py-2 text-right text-surface-400">
                          {typeof prev === 'number' && prev % 1 !== 0
                            ? prev.toFixed(1)
                            : formatNumber(Math.round(prev))}
                        </td>
                        <td className="py-2 text-right">
                          <span className={row.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {row.change >= 0 ? '+' : ''}{row.change}%
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          {row.change > 0 ? <TrendingUp className="h-4 w-4 text-emerald-400 inline" /> :
                           row.change < 0 ? <TrendingDown className="h-4 w-4 text-red-400 inline" /> :
                           <span className="text-surface-500">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Weekly comparison */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Weekly Volume Summary (12 weeks)</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2 text-surface-400 font-medium">Week</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Mail</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Parcels</th>
                    <th className="text-right py-2 text-surface-400 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeklyMail.map((wm, i) => {
                    const wp = data.weeklyParcels[i];
                    return (
                      <tr key={wm.label} className="border-b border-surface-800/50">
                        <td className="py-1.5 text-surface-300 text-xs">{wm.label}</td>
                        <td className="py-1.5 text-right text-surface-300">{wm.value}</td>
                        <td className="py-1.5 text-right text-surface-300">{wp?.value ?? 0}</td>
                        <td className="py-1.5 text-right text-surface-200 font-medium">{wm.value + (wp?.value ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- By Function ------- */}
      <TabPanel active={activeTab === 'departments'}>
        <Card>
          <CardHeader>
            <CardTitle>Activity by Function / Department</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.functionBreakdown.map((f) => ({ ...f, color: 'bg-primary-500/60' }))}
              barHeight={36}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {data.functionBreakdown.map((fn) => (
            <Card key={fn.label}>
              <div className="text-center">
                <p className="text-2xl font-bold text-surface-100">{formatNumber(fn.value)}</p>
                <p className="text-xs text-surface-400 mt-1">{fn.label}</p>
                <p className="text-xs text-surface-500 mt-2">activities this period</p>
              </div>
            </Card>
          ))}
        </div>
      </TabPanel>
    </div>
  );
}
