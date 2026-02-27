'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo, useEffect} from 'react';
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
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  BarChart3,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Carrier data model                                                         */
/* -------------------------------------------------------------------------- */
interface CarrierData {
  id: string;
  name: string;
  isProgram: boolean;
  parentCarrier?: string;
  volume: number;
  revenue: number;
  cost: number;
  avgHoldTime: number;
  onTimePickupPct: number;
  color: string;
}

function useCarrierData(shipments: any[]) {
  return useMemo(() => {
    const byCarrier: Record<string, { count: number; revenue: number; cost: number }> = {};
    shipments.forEach((s) => {
      const key = s.carrier.toUpperCase();
      if (!byCarrier[key]) byCarrier[key] = { count: 0, revenue: 0, cost: 0 };
      byCarrier[key].count++;
      byCarrier[key].revenue += s.retailPrice;
      byCarrier[key].cost += s.wholesaleCost;
    });

    const carriers: CarrierData[] = [
      {
        id: 'fedex',
        name: 'FedEx',
        isProgram: false,
        volume: byCarrier['FEDEX']?.count ?? seededRandom(100, 80, 200),
        revenue: byCarrier['FEDEX']?.revenue ?? seededRandom(101, 5000, 12000),
        cost: byCarrier['FEDEX']?.cost ?? seededRandom(102, 3000, 8000),
        avgHoldTime: seededRandom(103, 12, 48),
        onTimePickupPct: seededRandom(104, 82, 97),
        color: '#4F46E5',
      },
      {
        id: 'fedex_hal',
        name: 'FedEx HAL',
        isProgram: true,
        parentCarrier: 'FedEx',
        volume: seededRandom(110, 30, 80),
        revenue: seededRandom(111, 1500, 4000),
        cost: seededRandom(112, 800, 2500),
        avgHoldTime: seededRandom(113, 24, 72),
        onTimePickupPct: seededRandom(114, 75, 95),
        color: '#818CF8',
      },
      {
        id: 'ups',
        name: 'UPS',
        isProgram: false,
        volume: byCarrier['UPS']?.count ?? seededRandom(120, 60, 180),
        revenue: byCarrier['UPS']?.revenue ?? seededRandom(121, 4000, 10000),
        cost: byCarrier['UPS']?.cost ?? seededRandom(122, 2500, 7000),
        avgHoldTime: seededRandom(123, 10, 36),
        onTimePickupPct: seededRandom(124, 85, 98),
        color: '#D97706',
      },
      {
        id: 'ups_ap',
        name: 'UPS Access Point',
        isProgram: true,
        parentCarrier: 'UPS',
        volume: seededRandom(130, 25, 70),
        revenue: seededRandom(131, 1200, 3500),
        cost: seededRandom(132, 700, 2200),
        avgHoldTime: seededRandom(133, 18, 60),
        onTimePickupPct: seededRandom(134, 78, 96),
        color: '#FBBF24',
      },
      {
        id: 'usps',
        name: 'USPS',
        isProgram: false,
        volume: byCarrier['USPS']?.count ?? seededRandom(140, 100, 250),
        revenue: byCarrier['USPS']?.revenue ?? seededRandom(141, 3000, 8000),
        cost: byCarrier['USPS']?.cost ?? seededRandom(142, 2000, 5500),
        avgHoldTime: seededRandom(143, 8, 24),
        onTimePickupPct: seededRandom(144, 88, 99),
        color: '#2563EB',
      },
      {
        id: 'dhl',
        name: 'DHL',
        isProgram: false,
        volume: seededRandom(150, 15, 50),
        revenue: seededRandom(151, 1000, 3000),
        cost: seededRandom(152, 700, 2200),
        avgHoldTime: seededRandom(153, 14, 40),
        onTimePickupPct: seededRandom(154, 80, 94),
        color: '#DC2626',
      },
      {
        id: 'amazon',
        name: 'Amazon',
        isProgram: false,
        volume: seededRandom(160, 40, 120),
        revenue: seededRandom(161, 2000, 5000),
        cost: seededRandom(162, 1200, 3200),
        avgHoldTime: seededRandom(163, 6, 18),
        onTimePickupPct: seededRandom(164, 90, 99),
        color: '#F97316',
      },
    ];

    const totalVolume = carriers.reduce((s, c) => s + c.volume, 0);
    const totalRevenue = carriers.reduce((s, c) => s + c.revenue, 0);
    const totalCost = carriers.reduce((s, c) => s + c.cost, 0);
    const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const avgOnTime = Math.round(carriers.reduce((s, c) => s + c.onTimePickupPct, 0) / carriers.length);

    return { carriers, totalVolume, totalRevenue, totalCost, avgMargin, avgOnTime };
  }, [shipments]);
}

/* -------------------------------------------------------------------------- */
/*  Carrier Report Page — BAR-274                                              */
/* -------------------------------------------------------------------------- */
export default function CarrierReportPage() {
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
  const data = useCarrierData(shipments);

  const tabs = [
    { id: 'overview', label: 'Carrier Overview', icon: <Truck className="h-4 w-4" /> },
    { id: 'comparison', label: 'Carrier Comparison', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'programs', label: 'HAL & Access Point', icon: <Package className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carrier Dimension"
        icon={<Truck className="h-6 w-6" />}
        description="Carrier-level reporting with FedEx HAL and UPS Access Point program tracking"
        actions={<ExportToolbar reportName="Carrier_Report" />}
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={<Truck className="h-5 w-5" />} title="Total Volume" value={formatNumber(data.totalVolume)} change={9.4} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(data.totalRevenue)} change={11.7} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Cost" value={formatCurrency(data.totalCost)} change={6.3} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Avg Margin" value={`${data.avgMargin.toFixed(1)}%`} change={3.2} />
          <StatCard icon={<Clock className="h-5 w-5" />} title="On-Time Pickup" value={`${data.avgOnTime}%`} change={1.8} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Revenue by Carrier</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.carriers.filter((c) => !c.isProgram).map((c) => ({ label: c.name, value: c.revenue, color: c.color }))}
                size={160}
                centerValue={formatCurrency(data.totalRevenue)}
                centerLabel="total"
              />
              <div className="space-y-2 flex-1">
                {data.carriers.filter((c) => !c.isProgram).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-surface-300">{c.name}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{formatCurrency(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Volume by Carrier</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.carriers.map((c) => ({
                  label: c.name,
                  value: c.volume,
                  color: c.isProgram ? 'bg-purple-500/60' : 'bg-primary-500/60',
                }))}
                barHeight={28}
              />
            </CardContent>
          </Card>
        </div>

        {/* Carrier performance table */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Carrier Performance Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Carrier</th>
                    <th className="text-center py-2.5 text-surface-400 font-medium">Type</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Volume</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Cost</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Margin</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Avg Hold</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">On-Time %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.carriers.map((c) => {
                    const margin = c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0;
                    return (
                      <tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-surface-200 font-medium">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge variant={c.isProgram ? 'info' : 'muted'} dot={false}>
                            {c.isProgram ? 'Program' : 'General'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(c.volume)}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(c.revenue)}</td>
                        <td className="py-2.5 text-right text-surface-400">{formatCurrency(c.cost)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'danger'} dot={false}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-300">{c.avgHoldTime}h</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={c.onTimePickupPct >= 90 ? 'success' : c.onTimePickupPct >= 80 ? 'warning' : 'danger'} dot={false}>
                            {c.onTimePickupPct}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-700">
                    <td className="py-2.5 font-semibold text-surface-100">Total</td>
                    <td />
                    <td className="py-2.5 text-right font-semibold text-surface-100">{formatNumber(data.totalVolume)}</td>
                    <td className="py-2.5 text-right font-semibold text-surface-100">{formatCurrency(data.totalRevenue)}</td>
                    <td className="py-2.5 text-right font-semibold text-surface-300">{formatCurrency(data.totalCost)}</td>
                    <td className="py-2.5 text-right"><Badge variant="success" dot={false}>{data.avgMargin.toFixed(1)}%</Badge></td>
                    <td />
                    <td className="py-2.5 text-right"><Badge variant="success" dot={false}>{data.avgOnTime}%</Badge></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Carrier Comparison ------- */}
      <TabPanel active={activeTab === 'comparison'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Revenue Comparison</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.carriers
                  .filter((c) => !c.isProgram)
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((c) => ({ label: c.name, value: c.revenue }))}
                barHeight={32}
                formatValue={(v) => formatCurrency(v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Margin Comparison</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.carriers
                  .filter((c) => !c.isProgram)
                  .map((c) => ({
                    label: c.name,
                    value: c.revenue > 0 ? Math.round(((c.revenue - c.cost) / c.revenue) * 100) : 0,
                    color: 'bg-emerald-500/60',
                  }))
                  .sort((a, b) => b.value - a.value)}
                barHeight={32}
                formatValue={(v) => `${v}%`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>On-Time Pickup Performance</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.carriers
                  .sort((a, b) => b.onTimePickupPct - a.onTimePickupPct)
                  .map((c) => ({
                    label: c.name,
                    value: c.onTimePickupPct,
                    color: c.onTimePickupPct >= 90 ? 'bg-emerald-500/60' : c.onTimePickupPct >= 80 ? 'bg-yellow-500/60' : 'bg-red-500/60',
                  }))}
                barHeight={28}
                formatValue={(v) => `${v}%`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Average Hold Time (hours)</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.carriers
                  .sort((a, b) => a.avgHoldTime - b.avgHoldTime)
                  .map((c) => ({
                    label: c.name,
                    value: c.avgHoldTime,
                    color: c.avgHoldTime <= 24 ? 'bg-emerald-500/60' : c.avgHoldTime <= 48 ? 'bg-yellow-500/60' : 'bg-red-500/60',
                  }))}
                barHeight={28}
                formatValue={(v) => `${v}h`}
              />
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- HAL & Access Point Programs ------- */}
      <TabPanel active={activeTab === 'programs'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {data.carriers.filter((c) => c.isProgram).map((c) => (
            <StatCard
              key={c.id}
              icon={<Package className="h-5 w-5" />}
              title={`${c.name} Volume`}
              value={formatNumber(c.volume)}
              change={seededRandom(c.volume + 900, -5, 20)}
            />
          ))}
          {data.carriers.filter((c) => c.isProgram).map((c) => (
            <StatCard
              key={`${c.id}-rev`}
              icon={<DollarSign className="h-5 w-5" />}
              title={`${c.name} Revenue`}
              value={formatCurrency(c.revenue)}
              change={seededRandom(c.revenue + 1000, 2, 25)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.carriers.filter((c) => c.isProgram).map((c) => {
            const margin = c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </CardTitle>
                  <Badge variant="info" dot={false}>{c.parentCarrier} Program</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-surface-400">Volume</p>
                      <p className="text-lg font-semibold text-surface-100">{formatNumber(c.volume)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Revenue</p>
                      <p className="text-lg font-semibold text-emerald-400">{formatCurrency(c.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Cost</p>
                      <p className="text-lg font-semibold text-surface-300">{formatCurrency(c.cost)}</p>
                    </div>
                    <div>
                      <p className="text-surface-400">Margin</p>
                      <Badge variant={margin > 30 ? 'success' : margin > 15 ? 'warning' : 'danger'} dot={false}>
                        {margin.toFixed(1)}%
                      </Badge>
                    </div>
                    <div>
                      <p className="text-surface-400">Avg Hold Time</p>
                      <p className="text-lg font-semibold text-surface-100">{c.avgHoldTime}h</p>
                    </div>
                    <div>
                      <p className="text-surface-400">On-Time Pickup</p>
                      <Badge variant={c.onTimePickupPct >= 90 ? 'success' : 'warning'} dot={false}>
                        {c.onTimePickupPct}%
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-surface-500 mb-2">Volume Trend (14d)</p>
                    <div className="flex items-center gap-3">
                      <Sparkline
                        data={generateDailySeries(14, c.volume + 500, 5, 15).map((d) => d.value)}
                        color={c.color}
                        height={36}
                      />
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> +{seededRandom(c.volume + 800, 3, 18)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Program vs General table */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Program vs General Shipments</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Category</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Volume</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Avg Revenue/Pkg</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">On-Time %</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const programs = data.carriers.filter((c) => c.isProgram);
                    const general = data.carriers.filter((c) => !c.isProgram);
                    const progVol = programs.reduce((s, c) => s + c.volume, 0);
                    const genVol = general.reduce((s, c) => s + c.volume, 0);
                    const progRev = programs.reduce((s, c) => s + c.revenue, 0);
                    const genRev = general.reduce((s, c) => s + c.revenue, 0);
                    const progOT = Math.round(programs.reduce((s, c) => s + c.onTimePickupPct, 0) / (programs.length || 1));
                    const genOT = Math.round(general.reduce((s, c) => s + c.onTimePickupPct, 0) / (general.length || 1));

                    return [
                      { cat: 'Program (HAL + AP)', vol: progVol, rev: progRev, avgRev: progVol > 0 ? progRev / progVol : 0, ot: progOT },
                      { cat: 'General Shipping', vol: genVol, rev: genRev, avgRev: genVol > 0 ? genRev / genVol : 0, ot: genOT },
                    ].map((row) => (
                      <tr key={row.cat} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 font-medium text-surface-200">{row.cat}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(row.vol)}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(row.rev)}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatCurrency(row.avgRev)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={row.ot >= 90 ? 'success' : 'warning'} dot={false}>{row.ot}%</Badge>
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
    </div>
  );
}
