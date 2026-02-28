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
  Layers,
  Package,
  DollarSign,
  TrendingUp,
  BarChart3,
  Settings2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Special program data model                                                 */
/* -------------------------------------------------------------------------- */
interface SpecialProgram {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  received: number;
  processed: number;
  pickedUp: number;
  returned: number;
  revenue: number;
  expenses: number;
  avgProcessingTime: number;
  satisfactionScore: number;
  color: string;
}

function useProgramData() {
  return useMemo(() => {
    const programs: SpecialProgram[] = [
      {
        id: 'amazon_counter',
        name: 'Amazon Counter',
        description: 'Amazon package pickup/return service at retail locations',
        enabled: true,
        received: seededRandom(200, 150, 400),
        processed: seededRandom(201, 140, 380),
        pickedUp: seededRandom(202, 120, 350),
        returned: seededRandom(203, 10, 40),
        revenue: seededRandom(204, 3000, 8000),
        expenses: seededRandom(205, 1500, 4000),
        avgProcessingTime: seededRandom(206, 3, 12),
        satisfactionScore: seededRandom(207, 85, 98),
        color: '#F59E0B',
      },
      {
        id: 'vinted',
        name: 'Vinted',
        description: 'Peer-to-peer fashion marketplace with retail drop-off/pickup',
        enabled: true,
        received: seededRandom(210, 80, 200),
        processed: seededRandom(211, 70, 190),
        pickedUp: seededRandom(212, 60, 170),
        returned: seededRandom(213, 5, 25),
        revenue: seededRandom(214, 1500, 4500),
        expenses: seededRandom(215, 800, 2500),
        avgProcessingTime: seededRandom(216, 5, 15),
        satisfactionScore: seededRandom(217, 80, 95),
        color: '#10B981',
      },
      {
        id: 'pudo',
        name: 'PUDO Point',
        description: 'Pick Up Drop Off network for parcel collection',
        enabled: true,
        received: seededRandom(220, 100, 280),
        processed: seededRandom(221, 90, 260),
        pickedUp: seededRandom(222, 80, 240),
        returned: seededRandom(223, 8, 30),
        revenue: seededRandom(224, 2000, 6000),
        expenses: seededRandom(225, 1000, 3200),
        avgProcessingTime: seededRandom(226, 4, 10),
        satisfactionScore: seededRandom(227, 82, 96),
        color: '#6366F1',
      },
      {
        id: 'the_return',
        name: 'The Return',
        description: 'Returns processing and consolidation service',
        enabled: true,
        received: seededRandom(230, 60, 150),
        processed: seededRandom(231, 55, 140),
        pickedUp: seededRandom(232, 45, 120),
        returned: seededRandom(233, 15, 50),
        revenue: seededRandom(234, 1000, 3500),
        expenses: seededRandom(235, 600, 2000),
        avgProcessingTime: seededRandom(236, 8, 20),
        satisfactionScore: seededRandom(237, 78, 93),
        color: '#8B5CF6',
      },
      {
        id: 'return_queen',
        name: 'Return Queen',
        description: 'Returns management platform',
        enabled: false,
        received: seededRandom(240, 30, 100),
        processed: seededRandom(241, 25, 90),
        pickedUp: seededRandom(242, 20, 80),
        returned: seededRandom(243, 8, 30),
        revenue: seededRandom(244, 500, 2000),
        expenses: seededRandom(245, 300, 1200),
        avgProcessingTime: seededRandom(246, 10, 25),
        satisfactionScore: seededRandom(247, 75, 90),
        color: '#EC4899',
      },
    ];

    const totalRevenue = programs.reduce((s, p) => s + p.revenue, 0);
    const totalVolume = programs.reduce((s, p) => s + p.received, 0);
    const activePrograms = programs.filter((p) => p.enabled).length;

    return { programs, totalRevenue, totalVolume, activePrograms };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Special Programs Report Page — BAR-275                                     */
/* -------------------------------------------------------------------------- */
export default function ProgramsReportPage() {
  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const data = useProgramData();

  const tabs = [
    { id: 'overview', label: 'Programs Overview', icon: <Layers className="h-4 w-4" /> },
    { id: 'performance', label: 'Performance', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'config', label: 'Configuration', icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Special Program Reporting"
        icon={<Layers className="h-6 w-6" />}
        description="Track partner programs."
        actions={<ExportToolbar reportName="Special_Programs_Report" />}
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
          <StatCard icon={<Layers className="h-5 w-5" />} title="Active Programs" value={data.activePrograms} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Volume" value={formatNumber(data.totalVolume)} change={10.5} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(data.totalRevenue)} change={15.3} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Avg Satisfaction" value={`${Math.round(data.programs.reduce((s, p) => s + p.satisfactionScore, 0) / data.programs.length)}%`} change={2.1} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Revenue by Program</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.programs.map((p) => ({ label: p.name, value: p.revenue, color: p.color }))}
                size={160}
                centerValue={formatCurrency(data.totalRevenue)}
                centerLabel="total"
              />
              <div className="space-y-2 flex-1">
                {data.programs.map((p) => (
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
            <CardHeader><CardTitle>Volume by Program</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.programs
                  .sort((a, b) => b.received - a.received)
                  .map((p) => ({ label: p.name, value: p.received }))}
                barHeight={32}
              />
            </CardContent>
          </Card>
        </div>

        {/* Program summary table */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Program Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Program</th>
                    <th className="text-center py-2.5 text-surface-400 font-medium">Status</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Received</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Processed</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Picked Up</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Returned</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Expenses</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.programs.map((p) => {
                    const margin = p.revenue > 0 ? ((p.revenue - p.expenses) / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-surface-200 font-medium">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge variant={p.enabled ? 'success' : 'muted'} dot>
                            {p.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(p.received)}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(p.processed)}</td>
                        <td className="py-2.5 text-right text-surface-300">{formatNumber(p.pickedUp)}</td>
                        <td className="py-2.5 text-right text-surface-400">{formatNumber(p.returned)}</td>
                        <td className="py-2.5 text-right text-surface-200">{formatCurrency(p.revenue)}</td>
                        <td className="py-2.5 text-right text-surface-400">{formatCurrency(p.expenses)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant={margin > 40 ? 'success' : margin > 20 ? 'warning' : 'danger'} dot={false}>
                            {margin.toFixed(1)}%
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
      </TabPanel>

      {/* ------- Performance ------- */}
      <TabPanel active={activeTab === 'performance'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Processing Time by Program</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.programs
                  .sort((a, b) => a.avgProcessingTime - b.avgProcessingTime)
                  .map((p) => ({
                    label: p.name,
                    value: p.avgProcessingTime,
                    color: p.avgProcessingTime <= 8 ? 'bg-emerald-500/60' : p.avgProcessingTime <= 15 ? 'bg-yellow-500/60' : 'bg-red-500/60',
                  }))}
                barHeight={28}
                formatValue={(v) => `${v} min`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customer Satisfaction</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.programs
                  .sort((a, b) => b.satisfactionScore - a.satisfactionScore)
                  .map((p) => ({
                    label: p.name,
                    value: p.satisfactionScore,
                    color: p.satisfactionScore >= 90 ? 'bg-emerald-500/60' : p.satisfactionScore >= 80 ? 'bg-yellow-500/60' : 'bg-red-500/60',
                  }))}
                barHeight={28}
                formatValue={(v) => `${v}%`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Profit per Program</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.programs
                  .map((p) => ({ label: p.name, value: p.revenue - p.expenses, color: 'bg-emerald-500/60' }))
                  .sort((a, b) => b.value - a.value)}
                barHeight={28}
                formatValue={(v) => formatCurrency(v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pickup Rate by Program</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={data.programs
                  .map((p) => ({
                    label: p.name,
                    value: p.received > 0 ? Math.round((p.pickedUp / p.received) * 100) : 0,
                    color: 'bg-blue-500/60',
                  }))
                  .sort((a, b) => b.value - a.value)}
                barHeight={28}
                formatValue={(v) => `${v}%`}
              />
            </CardContent>
          </Card>
        </div>

        {/* Per-program detail cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {data.programs.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-surface-400 mb-3">{p.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-surface-400">Processing Time</span><span className="text-surface-200">{p.avgProcessingTime} min</span></div>
                  <div className="flex justify-between"><span className="text-surface-400">Satisfaction</span><span className="text-surface-200">{p.satisfactionScore}%</span></div>
                  <div className="flex justify-between"><span className="text-surface-400">Pickup Rate</span><span className="text-surface-200">{p.received > 0 ? Math.round((p.pickedUp / p.received) * 100) : 0}%</span></div>
                </div>
                <div className="mt-3">
                  <Sparkline
                    data={generateDailySeries(14, p.received + 600, 5, 25).map((d) => d.value)}
                    color={p.color}
                    height={32}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabPanel>

      {/* ------- Configuration ------- */}
      <TabPanel active={activeTab === 'config'}>
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Program Configuration
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-surface-400 mb-4">
              Enable or disable programs your store participates in. New programs can be added via configuration without code changes.
            </p>
            <div className="space-y-3">
              {data.programs.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30 hover:bg-surface-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <div>
                      <p className="text-sm font-medium text-surface-200">{p.name}</p>
                      <p className="text-xs text-surface-500">{p.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.enabled ? (
                      <Badge variant="success" dot>Active</Badge>
                    ) : (
                      <Badge variant="muted" dot>Disabled</Badge>
                    )}
                    {p.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-surface-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg border border-dashed border-surface-700 text-center">
              <p className="text-xs text-surface-500">
                New programs can be added without code changes — contact your administrator to configure additional partnerships.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
