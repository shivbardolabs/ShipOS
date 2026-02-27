'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, Sparkline, DonutChart } from '@/components/reports/mini-bar-chart';
import { seededRandom, generateDailySeries, formatNumber } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import { shipments, packages, customers } from '@/lib/mock-data';
import {
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  TrendingUp,
  Calendar,
  Save,
  Plus,
  Trash2,
  Clock,
  Package,
  DollarSign,
  Users,
  Mail,
  Eye,
  Sparkles,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Chart types & BI data                                                      */
/* -------------------------------------------------------------------------- */
interface SavedView {
  id: string;
  name: string;
  charts: string[];
  createdAt: string;
  isDefault: boolean;
}

interface HeatmapCell {
  day: string;
  hour: string;
  value: number;
}

function useAnalyticsData() {
  return useMemo(() => {
    const totalRevenue = shipments.reduce((s, sh) => s + sh.retailPrice, 0);
    const totalPkgs = packages.length;
    const activeCust = customers.filter((c) => c.status === 'active').length;

    /* Revenue trend (daily, 30 days) */
    const revenueTrend = generateDailySeries(30, 1000, 400, 1200);
    const packageTrend = generateDailySeries(30, 1100, 8, 30);
    const mailTrend = generateDailySeries(30, 1200, 15, 50);

    /* Stacked data — revenue by service */
    const stackedData = Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      shipping: seededRandom(1300 + i, 2000, 5000),
      mailbox: seededRandom(1400 + i, 1500, 3500),
      handling: seededRandom(1500 + i, 800, 2500),
      addons: seededRandom(1600 + i, 300, 1000),
    }));

    /* Heatmap — activity by day/hour */
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];
    const heatmap: HeatmapCell[] = [];
    days.forEach((day, di) => {
      hours.forEach((hour, hi) => {
        heatmap.push({
          day,
          hour,
          value: seededRandom(2000 + di * 10 + hi, 0, 30),
        });
      });
    });

    /* Donut segments */
    const platformRevenue = [
      { label: 'In-Store Physical', value: totalRevenue * 0.35, color: '#6366F1' },
      { label: 'AnyTime Mailbox', value: totalRevenue * 0.22, color: '#10B981' },
      { label: 'iPostal1', value: totalRevenue * 0.25, color: '#F59E0B' },
      { label: 'PostScan Mail', value: totalRevenue * 0.18, color: '#EF4444' },
    ];

    /* Carrier comparison bars */
    const carrierVolume = [
      { label: 'FedEx', value: seededRandom(2100, 80, 200) },
      { label: 'UPS', value: seededRandom(2101, 60, 180) },
      { label: 'USPS', value: seededRandom(2102, 100, 250) },
      { label: 'DHL', value: seededRandom(2103, 15, 50) },
      { label: 'Amazon', value: seededRandom(2104, 40, 120) },
    ];

    /* Historical benchmarking */
    const currentPeriod = { revenue: totalRevenue, packages: totalPkgs, customers: activeCust };
    const priorPeriod = {
      revenue: totalRevenue * (1 - seededRandom(2200, 5, 15) / 100),
      packages: Math.round(totalPkgs * (1 - seededRandom(2201, 3, 12) / 100)),
      customers: Math.round(activeCust * (1 - seededRandom(2202, 2, 8) / 100)),
    };

    /* Saved views */
    const savedViews: SavedView[] = [
      { id: 'v1', name: 'Executive Summary', charts: ['revenue-trend', 'platform-donut', 'carrier-bars'], createdAt: '2026-02-15', isDefault: true },
      { id: 'v2', name: 'Operations Overview', charts: ['package-trend', 'heatmap', 'carrier-bars'], createdAt: '2026-02-20', isDefault: false },
      { id: 'v3', name: 'Customer Insights', charts: ['customer-trend', 'platform-donut', 'stacked'], createdAt: '2026-02-25', isDefault: false },
    ];

    return {
      totalRevenue,
      totalPkgs,
      activeCust,
      revenueTrend,
      packageTrend,
      mailTrend,
      stackedData,
      heatmap,
      platformRevenue,
      carrierVolume,
      currentPeriod,
      priorPeriod,
      savedViews,
      days,
      hours,
    };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  HeatmapChart                                                               */
/* -------------------------------------------------------------------------- */
function HeatmapChart({ data, days, hours }: { data: HeatmapCell[]; days: string[]; hours: string[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `60px repeat(${hours.length}, 1fr)` }}>
        {/* Header row */}
        <div />
        {hours.map((h) => (
          <div key={h} className="text-[10px] text-surface-500 text-center py-1">{h}</div>
        ))}
        {/* Data rows */}
        {days.map((day) => (
          <>
            <div key={`label-${day}`} className="text-xs text-surface-400 flex items-center">{day}</div>
            {hours.map((hour) => {
              const cell = data.find((d) => d.day === day && d.hour === hour);
              const val = cell?.value ?? 0;
              const intensity = val / maxVal;
              return (
                <div
                  key={`${day}-${hour}`}
                  className="rounded-sm h-8 flex items-center justify-center text-[10px] text-surface-300 cursor-default transition-colors hover:ring-1 hover:ring-primary-500/50"
                  style={{
                    backgroundColor: `rgba(99, 102, 241, ${0.1 + intensity * 0.7})`,
                  }}
                  title={`${day} ${hour}: ${val} activities`}
                >
                  {val}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StackedBarChart                                                            */
/* -------------------------------------------------------------------------- */
function StackedBarChart({ data }: { data: { month: string; shipping: number; mailbox: number; handling: number; addons: number }[] }) {
  const maxTotal = Math.max(...data.map((d) => d.shipping + d.mailbox + d.handling + d.addons), 1);
  const colors = { shipping: '#6366F1', mailbox: '#10B981', handling: '#F59E0B', addons: '#EF4444' };

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 180 }}>
        {data.map((d) => {
          const total = d.shipping + d.mailbox + d.handling + d.addons;
          const pct = (total / maxTotal) * 100;
          const segments = [
            { key: 'shipping', value: d.shipping, color: colors.shipping },
            { key: 'mailbox', value: d.mailbox, color: colors.mailbox },
            { key: 'handling', value: d.handling, color: colors.handling },
            { key: 'addons', value: d.addons, color: colors.addons },
          ];
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden" style={{ height: `${pct}%` }}>
                {segments.map((seg) => (
                  <div
                    key={seg.key}
                    style={{
                      height: `${total > 0 ? (seg.value / total) * 100 : 0}%`,
                      backgroundColor: seg.color,
                    }}
                    className="transition-all duration-300"
                    title={`${d.month} ${seg.key}: ${formatCurrency(seg.value)}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-surface-500 mt-1">{d.month}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 justify-center">
        {Object.entries(colors).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-surface-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Interactive Charts Page — BAR-279                                           */
/* -------------------------------------------------------------------------- */
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('charts');
  const [selectedChart, setSelectedChart] = useState<string>('line');
  const [drillPeriod, setDrillPeriod] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('v1');
  const [newViewName, setNewViewName] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const data = useAnalyticsData();

  const handleDrillDown = useCallback((period: string) => {
    setDrillPeriod(period);
  }, []);

  const tabs = [
    { id: 'charts', label: 'Interactive Charts', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'bi', label: 'BI Dashboard', icon: <Activity className="h-4 w-4" /> },
    { id: 'benchmark', label: 'Benchmarking', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'schedule', label: 'Scheduled Reports', icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactive Charts & BI"
        icon={<BarChart3 className="h-6 w-6" />}
        description="Interactive data visualizations, custom BI dashboards, and business intelligence tools"
        actions={<ExportToolbar reportName="BI_Analytics" />}
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Interactive Charts ------- */}
      <TabPanel active={activeTab === 'charts'}>
        {/* Chart type selector */}
        <Card>
          <CardHeader>
            <CardTitle>Chart Type</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={showLegend ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setShowLegend(!showLegend)}
                leftIcon={<Eye className="h-3.5 w-3.5" />}
              >
                Legend
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'line', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
                { id: 'bar', label: 'Bar Chart', icon: <BarChart3 className="h-4 w-4" /> },
                { id: 'donut', label: 'Donut Chart', icon: <PieChart className="h-4 w-4" /> },
                { id: 'stacked', label: 'Stacked Bar', icon: <BarChart3 className="h-4 w-4" /> },
                { id: 'sparkline', label: 'Sparklines', icon: <Activity className="h-4 w-4" /> },
                { id: 'heatmap', label: 'Heatmap', icon: <Sparkles className="h-4 w-4" /> },
              ].map((ct) => (
                <Button
                  key={ct.id}
                  variant={selectedChart === ct.id ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedChart(ct.id)}
                  leftIcon={ct.icon}
                >
                  {ct.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Line Chart */}
        {selectedChart === 'line' && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend — Line Chart (30 days)</CardTitle>
              <Badge variant="info" dot={false}>Click bars to drill down</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xl font-bold text-surface-100">{formatCurrency(data.totalRevenue)}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12.4% vs prior
                </span>
              </div>
              <Sparkline data={data.revenueTrend.map((d) => d.value)} color="#6366f1" height={80} />
              <div className="flex justify-between mt-2 text-[10px] text-surface-500">
                <span>{data.revenueTrend[0]?.date}</span>
                <span>{data.revenueTrend[data.revenueTrend.length - 1]?.date}</span>
              </div>
              {drillPeriod && (
                <div className="mt-4 p-3 rounded-lg bg-surface-800/30">
                  <p className="text-xs text-surface-400">Drill-down: <span className="text-surface-200 font-medium">{drillPeriod}</span></p>
                  <Button variant="ghost" size="sm" onClick={() => setDrillPeriod(null)}>Back to overview</Button>
                </div>
              )}
              {/* Hover tooltips via clickable day bars */}
              <div className="grid grid-cols-10 gap-0.5 mt-4">
                {data.revenueTrend.slice(-10).map((d) => (
                  <button
                    key={d.fullDate}
                    className="text-center p-1 rounded hover:bg-surface-800/50 transition-colors group"
                    onClick={() => handleDrillDown(d.date)}
                    title={`${d.date}: ${formatCurrency(d.value)}`}
                  >
                    <div
                      className="mx-auto rounded-sm bg-primary-500/60 group-hover:bg-primary-500 transition-colors"
                      style={{ height: `${Math.max((d.value / 1200) * 40, 4)}px`, width: '100%' }}
                    />
                    <span className="text-[9px] text-surface-500 mt-1 block">{d.date.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
              {showLegend && (
                <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                  <div className="flex items-center gap-1.5"><span className="h-2 w-6 rounded bg-primary-500/60" /> Revenue</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bar Chart */}
        {selectedChart === 'bar' && (
          <Card>
            <CardHeader><CardTitle>Carrier Volume — Bar Chart</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.carrierVolume.sort((a, b) => b.value - a.value)}
                barHeight={36}
                formatValue={(v) => `${v} packages`}
              />
              {showLegend && (
                <p className="text-xs text-surface-500 mt-3">Hover over bars for detailed data. Click to drill into carrier details.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Donut Chart */}
        {selectedChart === 'donut' && (
          <Card>
            <CardHeader><CardTitle>Revenue by Platform — Donut Chart</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <DonutChart
                data={data.platformRevenue}
                size={200}
                centerValue={formatCurrency(data.totalRevenue)}
                centerLabel="total revenue"
              />
              {showLegend && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {data.platformRevenue.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300">{seg.label}</span>
                      <span className="text-surface-400 ml-auto">{formatCurrency(seg.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stacked Bar Chart */}
        {selectedChart === 'stacked' && (
          <Card>
            <CardHeader><CardTitle>Monthly Revenue by Service — Stacked Bar</CardTitle></CardHeader>
            <CardContent>
              <StackedBarChart data={data.stackedData} />
            </CardContent>
          </Card>
        )}

        {/* Sparklines */}
        {selectedChart === 'sparkline' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle>Revenue Sparkline</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-surface-100 mb-2">{formatCurrency(data.totalRevenue)}</p>
                <Sparkline data={data.revenueTrend.map((d) => d.value)} color="#10b981" height={48} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Packages Sparkline</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-surface-100 mb-2">{formatNumber(data.totalPkgs)}</p>
                <Sparkline data={data.packageTrend.map((d) => d.value)} color="#6366f1" height={48} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Mail Sparkline</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-surface-100 mb-2">{formatNumber(seededRandom(2300, 200, 500))}</p>
                <Sparkline data={data.mailTrend.map((d) => d.value)} color="#f59e0b" height={48} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Heatmap */}
        {selectedChart === 'heatmap' && (
          <Card>
            <CardHeader><CardTitle>Activity Heatmap — Day / Hour</CardTitle></CardHeader>
            <CardContent>
              <HeatmapChart data={data.heatmap} days={data.days} hours={data.hours} />
              {showLegend && (
                <div className="flex items-center gap-4 mt-4 text-xs text-surface-400">
                  <span>Low activity</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
                      <div key={op} className="h-3 w-6 rounded-sm" style={{ backgroundColor: `rgba(99, 102, 241, ${op})` }} />
                    ))}
                  </div>
                  <span>High activity</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* ------- BI Dashboard ------- */}
      <TabPanel active={activeTab === 'bi'}>
        {/* Saved Views Manager */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" /> Saved Dashboard Views
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="w-48">
                <Input
                  placeholder="New view name..."
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                />
              </div>
              <Button variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Save View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.savedViews.map((view) => (
                <div
                  key={view.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                    activeView === view.id ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-surface-800/30 hover:bg-surface-800/50'
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveView(view.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveView(view.id)}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-surface-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-200">{view.name}</p>
                      <p className="text-xs text-surface-500">{view.charts.length} charts · Created {view.createdAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {view.isDefault && <Badge variant="info" dot={false}>Default</Badge>}
                    <Button variant="ghost" size="sm" iconOnly><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Custom BI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Revenue" value={formatCurrency(data.totalRevenue)} change={12.4} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Packages" value={formatNumber(data.totalPkgs)} change={8.3} />
          <StatCard icon={<Users className="h-5 w-5" />} title="Active Customers" value={formatNumber(data.activeCust)} change={4.2} />
          <StatCard icon={<Mail className="h-5 w-5" />} title="Mail Volume" value={formatNumber(seededRandom(2400, 200, 500))} change={6.7} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <Card>
            <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <Sparkline data={data.revenueTrend.map((d) => d.value)} color="#10b981" height={60} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Platform Mix</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-4">
              <DonutChart
                data={data.platformRevenue}
                size={120}
                centerValue={`${((data.platformRevenue[0].value / data.totalRevenue) * 100).toFixed(0)}%`}
                centerLabel="largest"
              />
              <div className="space-y-1.5 flex-1">
                {data.platformRevenue.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-400">{seg.label}</span>
                    </div>
                    <span className="text-surface-300">{((seg.value / data.totalRevenue) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Carrier Volume</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart data={data.carrierVolume} barHeight={24} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activity Heatmap</CardTitle></CardHeader>
            <CardContent>
              <HeatmapChart data={data.heatmap} days={data.days} hours={data.hours} />
            </CardContent>
          </Card>
        </div>

        {/* Metric selector info */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-400" /> Data Explorer
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { metric: 'Revenue', dims: ['Platform', 'Carrier', 'Program'] },
                { metric: 'Package Volume', dims: ['Status', 'Carrier', 'Platform'] },
                { metric: 'Mail Volume', dims: ['Type', 'Platform', 'Customer'] },
                { metric: 'Customer Count', dims: ['Tier', 'Platform', 'Status'] },
              ].map((item) => (
                <div key={item.metric} className="p-3 rounded-lg bg-surface-800/30">
                  <p className="text-sm font-medium text-surface-200 mb-2">{item.metric}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.dims.map((dim) => (
                      <Badge key={dim} variant="muted" dot={false}>{dim}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-surface-500 mt-3">
              Select metrics and dimensions above to build custom views. Manager+ roles can save configurations.
            </p>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Benchmarking ------- */}
      <TabPanel active={activeTab === 'benchmark'}>
        <Card>
          <CardHeader><CardTitle>Performance vs Prior Period</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Metric</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Current Period</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Prior Period</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Change</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      metric: 'Revenue',
                      current: data.currentPeriod.revenue,
                      prior: data.priorPeriod.revenue,
                      format: (v: number) => formatCurrency(v),
                    },
                    {
                      metric: 'Packages',
                      current: data.currentPeriod.packages,
                      prior: data.priorPeriod.packages,
                      format: (v: number) => formatNumber(v),
                    },
                    {
                      metric: 'Active Customers',
                      current: data.currentPeriod.customers,
                      prior: data.priorPeriod.customers,
                      format: (v: number) => formatNumber(v),
                    },
                  ].map((row) => {
                    const change = row.current - row.prior;
                    const changePct = row.prior > 0 ? (change / row.prior) * 100 : 0;
                    return (
                      <tr key={row.metric} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5 font-medium text-surface-200">{row.metric}</td>
                        <td className="py-2.5 text-right text-surface-200">{row.format(row.current)}</td>
                        <td className="py-2.5 text-right text-surface-400">{row.format(row.prior)}</td>
                        <td className="py-2.5 text-right">
                          <span className={change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {change >= 0 ? '+' : ''}{row.format(change)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge variant={changePct >= 0 ? 'success' : 'danger'} dot={false}>
                            {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Monthly comparison */}
        <Card className="mt-6">
          <CardHeader><CardTitle>12-Month Revenue Comparison</CardTitle></CardHeader>
          <CardContent>
            <StackedBarChart data={data.stackedData} />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Growth Indicators</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Revenue Growth', value: `+${seededRandom(2500, 8, 20)}%`, trend: 'up' },
                { label: 'Customer Growth', value: `+${seededRandom(2501, 3, 12)}%`, trend: 'up' },
                { label: 'Avg Revenue/Customer', value: formatCurrency(data.totalRevenue / (data.activeCust || 1)), trend: 'up' },
                { label: 'Package Growth', value: `+${seededRandom(2502, 5, 15)}%`, trend: 'up' },
                { label: 'Cost Reduction', value: `-${seededRandom(2503, 2, 8)}%`, trend: 'down' },
                { label: 'Margin Improvement', value: `+${seededRandom(2504, 1, 5)}%`, trend: 'up' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-lg bg-surface-800/30 text-center">
                  <p className="text-xs text-surface-400 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Scheduled Reports ------- */}
      <TabPanel active={activeTab === 'schedule'}>
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Scheduled Report Delivery
              </span>
            </CardTitle>
            <Button variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
              New Schedule
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Daily KPI Summary', freq: 'Daily at 8:00 AM', recipients: 'manager@store.com', format: 'PDF', status: 'active' },
                { name: 'Weekly Revenue Report', freq: 'Every Monday at 9:00 AM', recipients: 'owner@store.com', format: 'Excel', status: 'active' },
                { name: 'Monthly P&L Statement', freq: '1st of each month', recipients: 'admin@store.com, owner@store.com', format: 'PDF', status: 'active' },
                { name: 'Quarterly Business Review', freq: 'Quarterly', recipients: 'executive@store.com', format: 'PDF', status: 'paused' },
              ].map((sched) => (
                <div key={sched.name} className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30 hover:bg-surface-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-700">
                      <Calendar className="h-4 w-4 text-surface-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{sched.name}</p>
                      <p className="text-xs text-surface-500">{sched.freq} · {sched.recipients}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="muted" dot={false}>{sched.format}</Badge>
                    <Badge variant={sched.status === 'active' ? 'success' : 'warning'} dot>
                      {sched.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role-based access */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" /> BI Dashboard Access
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              {[
                { role: 'Owner', access: 'Full BI — create, edit, schedule all reports' },
                { role: 'Admin', access: 'Full BI — create and schedule reports' },
                { role: 'Manager', access: 'Create custom views, schedule store reports' },
                { role: 'Employee', access: 'View assigned dashboards only' },
              ].map((item) => (
                <div key={item.role} className="p-3 rounded-lg bg-surface-800/30">
                  <p className="font-semibold text-surface-200">{item.role}</p>
                  <p className="text-surface-400 mt-1">{item.access}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
