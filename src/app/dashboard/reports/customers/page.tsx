'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo, useEffect, useCallback} from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ReportFilters, type ReportFilterValues } from '@/components/reports/report-filters';
import { ExportToolbar } from '@/components/reports/export-toolbar';
import { MiniBarChart, DonutChart } from '@/components/reports/mini-bar-chart';
import { seededRandom, formatNumber } from '@/lib/report-utils';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  Package,
  Mail,
  DollarSign,
  TrendingUp,
  BarChart3,
  Search,
  AlertTriangle,
  Calendar,
  Shield,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Customer analytics data                                                    */
/* -------------------------------------------------------------------------- */
interface CustomerAnalytics {
  id: string;
  name: string;
  pmb: string;
  status: string;
  packages: number;
  mail: number;
  revenue: number;
  serviceUsage: string[];
  tenure: number;
  lastActivity: number;
  platform: string;
  tier: string;
}

function useCustomerData(customers: any[]) {
  return useMemo(() => {
    const analytics: CustomerAnalytics[] = customers.map((c, i) => {
      const pkgCount = c.packageCount ?? seededRandom(i + 700, 5, 60);
      const mailCount = c.mailCount ?? seededRandom(i + 800, 10, 80);
      const revenue = pkgCount * 4.5 + mailCount * 1.2 + seededRandom(i + 900, 50, 500);
      const services = ['Shipping', 'Mail Forwarding', 'Package Holding', 'Scanning', 'Returns'];
      const usedServices = services.slice(0, seededRandom(i + 950, 1, 5));
      const tenure = seededRandom(i + 960, 1, 48);
      const lastActivity = seededRandom(i + 970, 0, 90);
      const platforms = ['In-Store Physical', 'AnyTime Mailbox', 'iPostal1', 'PostScan Mail'];
      const tiers = ['Basic', 'Standard', 'Premium', 'Enterprise'];

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        pmb: c.pmbNumber || `PMB-${1000 + i}`,
        status: c.status,
        packages: pkgCount,
        mail: mailCount,
        revenue,
        serviceUsage: usedServices,
        tenure,
        lastActivity,
        platform: platforms[seededRandom(i + 980, 0, 3)],
        tier: tiers[seededRandom(i + 990, 0, 3)],
      };
    });

    /* Rankings */
    const byRevenue = [...analytics].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const byVolume = [...analytics].sort((a, b) => (b.packages + b.mail) - (a.packages + a.mail)).slice(0, 10);
    const byActivity = [...analytics].sort((a, b) => a.lastActivity - b.lastActivity).slice(0, 10);

    /* PMB status */
    const activePMBs = analytics.filter((c) => c.status === 'active').length;
    const inactivePMBs = analytics.filter((c) => c.status !== 'active').length;
    const totalPMBCapacity = analytics.length + seededRandom(2000, 20, 50);
    const occupancyRate = totalPMBCapacity > 0 ? (analytics.length / totalPMBCapacity) * 100 : 0;

    /* Upcoming renewals */
    const upcomingRenewals = seededRandom(2010, 8, 25);
    const expiringThisMonth = seededRandom(2011, 3, 12);

    /* Totals */
    const totalRevenue = analytics.reduce((s, c) => s + c.revenue, 0);
    const totalPackages = analytics.reduce((s, c) => s + c.packages, 0);
    const totalMail = analytics.reduce((s, c) => s + c.mail, 0);

    /* Segmentation */
    const byPlatform = [
      { label: 'In-Store Physical', value: analytics.filter((c) => c.platform === 'In-Store Physical').length, color: '#6366F1' },
      { label: 'AnyTime Mailbox', value: analytics.filter((c) => c.platform === 'AnyTime Mailbox').length, color: '#10B981' },
      { label: 'iPostal1', value: analytics.filter((c) => c.platform === 'iPostal1').length, color: '#F59E0B' },
      { label: 'PostScan Mail', value: analytics.filter((c) => c.platform === 'PostScan Mail').length, color: '#EF4444' },
    ];

    const byTier = [
      { label: 'Enterprise', value: analytics.filter((c) => c.tier === 'Enterprise').length, color: '#8B5CF6' },
      { label: 'Premium', value: analytics.filter((c) => c.tier === 'Premium').length, color: '#6366F1' },
      { label: 'Standard', value: analytics.filter((c) => c.tier === 'Standard').length, color: '#10B981' },
      { label: 'Basic', value: analytics.filter((c) => c.tier === 'Basic').length, color: '#F59E0B' },
    ];

    return {
      analytics,
      byRevenue,
      byVolume,
      byActivity,
      activePMBs,
      inactivePMBs,
      totalPMBCapacity,
      occupancyRate,
      upcomingRenewals,
      expiringThisMonth,
      totalRevenue,
      totalPackages,
      totalMail,
      byPlatform,
      byTier,
    };
  }, [customers]);
}

/* -------------------------------------------------------------------------- */
/*  Customer Analytics Report Page — BAR-277                                   */
/* -------------------------------------------------------------------------- */
export default function CustomersReportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
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
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [inactiveThreshold, setInactiveThreshold] = useState('30');
  const data = useCustomerData(customers);

  const inactiveCustomers = data.analytics.filter(
    (c) => c.lastActivity >= parseInt(inactiveThreshold)
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Users className="h-4 w-4" /> },
    { id: 'rankings', label: 'Rankings', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'pmb', label: 'PMB Status', icon: <Shield className="h-4 w-4" /> },
    { id: 'segmentation', label: 'Segmentation', icon: <TrendingUp className="h-4 w-4" /> },
  ];

  /* Filter customers by search */
  const filteredCustomers = searchQuery
    ? data.analytics.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.pmb.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data.analytics;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer / PMB Holder Analytics"
        icon={<Users className="h-6 w-6" />}
        description="Per-customer insights — activity, revenue contribution, PMB status, and segmentation"
        actions={<ExportToolbar reportName="Customer_Analytics" />}
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
          <StatCard icon={<Users className="h-5 w-5" />} title="Total Customers" value={formatNumber(data.analytics.length)} change={4.2} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Revenue" value={formatCurrency(data.totalRevenue)} change={11.5} />
          <StatCard icon={<Package className="h-5 w-5" />} title="Total Packages" value={formatNumber(data.totalPackages)} change={8.3} />
          <StatCard icon={<Mail className="h-5 w-5" />} title="Total Mail" value={formatNumber(data.totalMail)} change={6.7} />
        </div>

        {/* Customer search + table */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Directory</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Search by name or PMB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-2.5 text-surface-400 font-medium">Customer</th>
                    <th className="text-left py-2.5 text-surface-400 font-medium">PMB</th>
                    <th className="text-center py-2.5 text-surface-400 font-medium">Status</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Packages</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Mail</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Revenue</th>
                    <th className="text-left py-2.5 text-surface-400 font-medium">Platform</th>
                    <th className="text-left py-2.5 text-surface-400 font-medium">Tier</th>
                    <th className="text-right py-2.5 text-surface-400 font-medium">Tenure</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.slice(0, 15).map((c) => (
                    <tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                      <td className="py-2.5 text-surface-200 font-medium">{c.name}</td>
                      <td className="py-2.5 text-surface-400">{c.pmb}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant={c.status === 'active' ? 'success' : 'muted'} dot>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-surface-300">{c.packages}</td>
                      <td className="py-2.5 text-right text-surface-300">{c.mail}</td>
                      <td className="py-2.5 text-right text-surface-200">{formatCurrency(c.revenue)}</td>
                      <td className="py-2.5 text-surface-400 text-xs">{c.platform}</td>
                      <td className="py-2.5">
                        <Badge variant={c.tier === 'Enterprise' ? 'info' : c.tier === 'Premium' ? 'success' : 'muted'} dot={false}>
                          {c.tier}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-surface-400">{c.tenure}mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCustomers.length > 15 && (
                <p className="text-xs text-surface-500 mt-3 text-center">
                  Showing 15 of {filteredCustomers.length} customers
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- Rankings ------- */}
      <TabPanel active={activeTab === 'rankings'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top by Revenue */}
          <Card>
            <CardHeader><CardTitle>Top 10 by Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left py-2 text-surface-400 font-medium">#</th>
                      <th className="text-left py-2 text-surface-400 font-medium">Customer</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byRevenue.map((c, i) => (
                      <tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2 text-surface-500">{i + 1}</td>
                        <td className="py-2 text-surface-200 font-medium">{c.name}</td>
                        <td className="py-2 text-right text-emerald-400">{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top by Volume */}
          <Card>
            <CardHeader><CardTitle>Top 10 by Volume</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left py-2 text-surface-400 font-medium">#</th>
                      <th className="text-left py-2 text-surface-400 font-medium">Customer</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Pkgs + Mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byVolume.map((c, i) => (
                      <tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2 text-surface-500">{i + 1}</td>
                        <td className="py-2 text-surface-200 font-medium">{c.name}</td>
                        <td className="py-2 text-right text-surface-300">{formatNumber(c.packages + c.mail)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Most Active */}
          <Card>
            <CardHeader><CardTitle>Most Active (Recent Activity)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left py-2 text-surface-400 font-medium">#</th>
                      <th className="text-left py-2 text-surface-400 font-medium">Customer</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byActivity.map((c, i) => (
                      <tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2 text-surface-500">{i + 1}</td>
                        <td className="py-2 text-surface-200 font-medium">{c.name}</td>
                        <td className="py-2 text-right text-surface-300">
                          {c.lastActivity === 0 ? 'Today' : `${c.lastActivity}d ago`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Inactive Customers */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" /> Inactive Customers
                </span>
              </CardTitle>
              <div className="w-40">
                <Select
                  label="Threshold"
                  options={[
                    { value: '14', label: '14 days' },
                    { value: '30', label: '30 days' },
                    { value: '60', label: '60 days' },
                    { value: '90', label: '90 days' },
                  ]}
                  value={inactiveThreshold}
                  onChange={(e) => setInactiveThreshold(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-surface-500 mb-3">
                {inactiveCustomers.length} customers with no activity in {inactiveThreshold}+ days
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-800">
                      <th className="text-left py-2 text-surface-400 font-medium">Customer</th>
                      <th className="text-left py-2 text-surface-400 font-medium">PMB</th>
                      <th className="text-right py-2 text-surface-400 font-medium">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveCustomers.slice(0, 8).map((c) => (
                      <tr key={c.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                        <td className="py-2 text-surface-200">{c.name}</td>
                        <td className="py-2 text-surface-400">{c.pmb}</td>
                        <td className="py-2 text-right">
                          <Badge variant="warning" dot={false}>{c.lastActivity}d ago</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue distribution chart */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Customer Revenue Distribution</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={data.byRevenue.map((c) => ({ label: c.name, value: c.revenue }))}
              barHeight={24}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* ------- PMB Status ------- */}
      <TabPanel active={activeTab === 'pmb'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Shield className="h-5 w-5" />} title="Active PMBs" value={data.activePMBs} change={3.2} />
          <StatCard icon={<Shield className="h-5 w-5" />} title="Inactive PMBs" value={data.inactivePMBs} />
          <StatCard icon={<Users className="h-5 w-5" />} title="PMB Capacity" value={data.totalPMBCapacity} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} title="Occupancy Rate" value={`${data.occupancyRate.toFixed(1)}%`} change={1.5} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>PMB Status Distribution</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={[
                  { label: 'Active', value: data.activePMBs, color: '#10B981' },
                  { label: 'Inactive', value: data.inactivePMBs, color: '#6B7280' },
                  { label: 'Available', value: data.totalPMBCapacity - data.analytics.length, color: '#374151' },
                ]}
                size={160}
                centerValue={`${data.occupancyRate.toFixed(0)}%`}
                centerLabel="occupied"
              />
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-surface-300">Active</span>
                  </div>
                  <span className="text-surface-200 font-medium">{data.activePMBs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-surface-500" />
                    <span className="text-surface-300">Inactive</span>
                  </div>
                  <span className="text-surface-200 font-medium">{data.inactivePMBs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-surface-700" />
                    <span className="text-surface-300">Available</span>
                  </div>
                  <span className="text-surface-200 font-medium">{data.totalPMBCapacity - data.analytics.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Upcoming Renewals</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-200">Expiring This Month</p>
                      <p className="text-xs text-surface-400">Require renewal attention</p>
                    </div>
                  </div>
                  <Badge variant="warning" dot={false}>{data.expiringThisMonth}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-200">Upcoming (Next 90 days)</p>
                      <p className="text-xs text-surface-400">Future renewals pipeline</p>
                    </div>
                  </div>
                  <Badge variant="info" dot={false}>{data.upcomingRenewals}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-surface-200">Renewal Rate</p>
                      <p className="text-xs text-surface-400">Last 12 months</p>
                    </div>
                  </div>
                  <Badge variant="success" dot={false}>{seededRandom(2020, 78, 95)}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      {/* ------- Segmentation ------- */}
      <TabPanel active={activeTab === 'segmentation'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Customers by Platform</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.byPlatform}
                size={150}
                centerValue={formatNumber(data.analytics.length)}
                centerLabel="customers"
              />
              <div className="space-y-2 flex-1">
                {data.byPlatform.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300">{seg.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{seg.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customers by Service Tier</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <DonutChart
                data={data.byTier}
                size={150}
                centerValue={formatNumber(data.analytics.length)}
                centerLabel="customers"
              />
              <div className="space-y-2 flex-1">
                {data.byTier.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-surface-300">{seg.label}</span>
                    </div>
                    <span className="text-surface-200 font-medium">{seg.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Revenue by Platform Segment</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={['In-Store Physical', 'AnyTime Mailbox', 'iPostal1', 'PostScan Mail'].map((plat, i) => ({
                  label: plat,
                  value: data.analytics
                    .filter((c) => c.platform === plat)
                    .reduce((s, c) => s + c.revenue, 0),
                  color: ['bg-indigo-500/60', 'bg-emerald-500/60', 'bg-yellow-500/60', 'bg-red-500/60'][i],
                }))}
                barHeight={32}
                formatValue={(v) => formatCurrency(v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Avg Revenue by Tier</CardTitle></CardHeader>
            <CardContent>
              <MiniBarChart
                data={['Enterprise', 'Premium', 'Standard', 'Basic'].map((tier) => {
                  const tierCustomers = data.analytics.filter((c) => c.tier === tier);
                  const avg = tierCustomers.length > 0
                    ? tierCustomers.reduce((s, c) => s + c.revenue, 0) / tierCustomers.length
                    : 0;
                  return { label: tier, value: Math.round(avg), color: 'bg-primary-500/60' };
                })}
                barHeight={32}
                formatValue={(v) => formatCurrency(v)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Tenure distribution */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Customer Tenure Distribution</CardTitle></CardHeader>
          <CardContent>
            <MiniBarChart
              data={[
                { label: '< 3 months', value: data.analytics.filter((c) => c.tenure < 3).length },
                { label: '3–6 months', value: data.analytics.filter((c) => c.tenure >= 3 && c.tenure < 6).length },
                { label: '6–12 months', value: data.analytics.filter((c) => c.tenure >= 6 && c.tenure < 12).length },
                { label: '1–2 years', value: data.analytics.filter((c) => c.tenure >= 12 && c.tenure < 24).length },
                { label: '2+ years', value: data.analytics.filter((c) => c.tenure >= 24).length },
              ]}
              barHeight={28}
            />
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
