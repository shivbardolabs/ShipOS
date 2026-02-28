'use client';
/* eslint-disable */

import { useState, useMemo, useEffect} from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, DonutChart } from '@/components/reports/mini-bar-chart';
import { formatNumber, seededRandom } from '@/lib/report-utils';
import {
  Package,
  Clock,
  AlertTriangle,
  Search,
  Layers,
  BarChart3,
  Users,
  Truck,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Derived data                                                              */
/* -------------------------------------------------------------------------- */
type PackageRow = {
  id: string;
  tracking: string;
  carrier: string;
  customer: string;
  pmb: string;
  status: string;
  daysHeld: number;
  platform: string;
  checkedInDate: string;
  [key: string]: unknown;
};

function usePackageData(customers: any[], packages: any[]) {
  return useMemo(() => {
    /* Status counts */
    const statusCounts: Record<string, number> = {};
    packages.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    /* Aging buckets */
    const agingBuckets = [
      { label: '0-3 days', min: 0, max: 3, count: 0 },
      { label: '4-7 days', min: 4, max: 7, count: 0 },
      { label: '8-14 days', min: 8, max: 14, count: 0 },
      { label: '15-30 days', min: 15, max: 30, count: 0 },
      { label: '30+ days', min: 31, max: 9999, count: 0 },
    ];

    /* Carrier breakdown */
    const carrierCounts: Record<string, number> = {};

    /* Platform breakdown */
    const platformCounts: Record<string, number> = {};

    /* Build rows */
    const rows: PackageRow[] = packages.map((p, i) => {
      const cust = customers.find((c) => c.id === p.customerId);
      const daysHeld = seededRandom(i + 100, 0, 45);
      const carrier = p.carrier || 'Unknown';
      const platform = cust?.platform || 'physical';

      carrierCounts[carrier.toUpperCase()] = (carrierCounts[carrier.toUpperCase()] || 0) + 1;
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;

      const bucket = agingBuckets.find((b) => daysHeld >= b.min && daysHeld <= b.max);
      if (bucket) bucket.count++;

      return {
        id: p.id,
        tracking: p.trackingNumber || '—',
        carrier: carrier.toUpperCase(),
        customer: cust ? `${cust.firstName} ${cust.lastName}` : 'Unknown',
        pmb: cust?.pmbNumber || '—',
        status: p.status,
        daysHeld,
        platform,
        checkedInDate: new Date(p.checkedInAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    });

    const inSystem = packages.filter((p) => p.status !== 'released').length;
    const overdue = rows.filter((r) => r.daysHeld > 14 && r.status !== 'released').length;

    /* Customer inventory */
    const customerInventory: Record<string, number> = {};
    rows.filter((r) => r.status !== 'released').forEach((r) => {
      customerInventory[r.customer] = (customerInventory[r.customer] || 0) + 1;
    });
    const topCustomers = Object.entries(customerInventory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ label: name, value: count }));

    return { rows, statusCounts, agingBuckets, carrierCounts, platformCounts, inSystem, overdue, topCustomers };
  }, [customers, packages]);
}

/* -------------------------------------------------------------------------- */
/*  Status badge helper                                                       */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'muted'> = {
    checked_in: 'info',
    notified: 'warning',
    ready: 'success',
    released: 'muted',
    overdue: 'danger',
  };
  return <Badge variant={map[status] || 'muted'}>{status.replace(/_/g, ' ')}</Badge>;
}

/* -------------------------------------------------------------------------- */
/*  Package Inventory Report                                                  */
/* -------------------------------------------------------------------------- */
export default function PackageReportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [packages, setPackages] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
    fetch('/api/packages?limit=500').then(r => r.json()).then(d => setPackages(d.packages || [])),
    fetch('/api/customers?limit=500').then(r => r.json()).then(d => setCustomers(d.customers || [])),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<ReportFilterValues>({
    dateRange: 'month',
    platform: 'all',
    carrier: 'all',
    program: 'all',
  });
  const [activeTab, setActiveTab] = useState('snapshot');
  const data = usePackageData(customers, packages);

  const columns: Column<PackageRow>[] = [
    { key: 'tracking', label: 'Tracking #', render: (r) => <span className="font-mono text-xs">{r.tracking}</span> },
    { key: 'carrier', label: 'Carrier' },
    { key: 'customer', label: 'Customer' },
    { key: 'pmb', label: 'PMB' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'daysHeld', label: 'Days Held', align: 'right', render: (r) => (
      <span className={r.daysHeld > 14 ? 'text-red-400 font-semibold' : 'text-surface-300'}>
        {r.daysHeld}
      </span>
    )},
    { key: 'platform', label: 'Platform' },
    { key: 'checkedInDate', label: 'Checked In' },
  ];

  const tabs = [
    { id: 'snapshot', label: 'Inventory Snapshot', icon: <Layers className="h-4 w-4" /> },
    { id: 'aging', label: 'Aging Report', icon: <Clock className="h-4 w-4" /> },
    { id: 'breakdown', label: 'Breakdowns', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'detail', label: 'Detail Table', icon: <Search className="h-4 w-4" /> },
  ];

  /* Donut for status */
  const statusDonut = useMemo(
    () =>
      Object.entries(data.statusCounts).map(([label, value], i) => ({
        label: label.replace(/_/g, ' '),
        value,
        color: ['#6366f1', '#f59e0b', '#10b981', '#94a3b8', '#ef4444'][i % 5],
      })),
    [data.statusCounts]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Inventory Report"
        icon={<Package className="h-6 w-6" />}
        description="Package inventory at a glance."
        actions={<ExportToolbar reportName="Package_Inventory" />}
      />

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <ReportFilters filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ------- Snapshot ------- */}
      <TabPanel active={activeTab === 'snapshot'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Package className="h-5 w-5" />} title="Total in System" value={formatNumber(data.inSystem)} change={-3.2} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Packages" value={formatNumber(packages.length)} change={8.1} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Overdue (14+ days)" value={formatNumber(data.overdue)} change={-12.5} />
          <StatCard icon={<Clock className="h-5 w-5" />} title="Avg Hold Time" value="4.2 days" change={-1.8} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center">
              <DonutChart
                data={statusDonut}
                size={180}
                centerValue={formatNumber(packages.length)}
                centerLabel="total"
              />
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {statusDonut.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300 capitalize">{seg.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{seg.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top Customers by Inventory</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart data={data.topCustomers} barHeight={24} formatValue={(v) => `${v} pkg`} />
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Aging ------- */}
      <TabPanel active={activeTab === 'aging'}>
        <Card>
          <CardHeader>
            <CardTitle>Package Aging Distribution</CardTitle>
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3 mr-1 inline" />
              {data.overdue} overdue packages
            </Badge>
          </CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.agingBuckets.map((b, i) => ({
                label: b.label,
                value: b.count,
                color: ['bg-emerald-500/60', 'bg-blue-500/60', 'bg-yellow-500/60', 'bg-orange-500/60', 'bg-red-500/60'][i],
              }))}
              barHeight={36}
            />

            {/* Aging alerts */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-surface-300">Configurable Alert Thresholds</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Warning', days: 7, color: 'border-yellow-500/30 bg-yellow-500/5' },
                  { label: 'Overdue', days: 14, color: 'border-orange-500/30 bg-orange-500/5' },
                  { label: 'Storage Fee', days: 30, color: 'border-red-500/30 bg-red-500/5' },
                ].map((threshold) => (
                  <div key={threshold.label} className={`p-4 rounded-lg border ${threshold.color}`}>
                    <p className="text-sm font-semibold text-surface-200">{threshold.label}</p>
                    <p className="text-2xl font-bold text-surface-100 mt-1">{threshold.days} days</p>
                    <p className="text-xs text-surface-400 mt-1">Configurable per store</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Breakdowns ------- */}
      <TabPanel active={activeTab === 'breakdown'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>By Carrier</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={Object.entries(data.carrierCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, value]) => ({ label, value, color: 'bg-primary-500/60' }))}
                barHeight={28}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>By Platform</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={Object.entries(data.platformCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, value]) => ({ label, value, color: 'bg-emerald-500/60' }))}
                barHeight={28}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Truck className="h-4 w-4" /> By Special Program
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart
                data={[
                  { label: 'Amazon Counter', value: seededRandom(50, 5, 18), color: 'bg-yellow-500/60' },
                  { label: 'PUDO Point', value: seededRandom(51, 3, 12), color: 'bg-blue-500/60' },
                  { label: 'Vinted', value: seededRandom(52, 2, 8), color: 'bg-purple-500/60' },
                  { label: 'The Return', value: seededRandom(53, 1, 6), color: 'bg-red-500/60' },
                  { label: 'Return Queen', value: seededRandom(54, 1, 5), color: 'bg-pink-500/60' },
                ]}
                barHeight={28}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> By Customer (Top 8)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniBarChart data={data.topCustomers.slice(0, 8)} barHeight={24} />
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Detail Table ------- */}
      <TabPanel active={activeTab === 'detail'}>
        <Card padding="none">
          <div className="p-4">
            <DataTable
              columns={columns}
              data={data.rows}
              keyAccessor={(r) => r.id}
              searchable
              searchPlaceholder="Search by tracking, customer, PMB..."
              searchFields={['tracking', 'customer', 'pmb', 'carrier']}
              pageSize={15}
            />
          </div>
        </Card>
      </TabPanel>
    </div>
  );
}
