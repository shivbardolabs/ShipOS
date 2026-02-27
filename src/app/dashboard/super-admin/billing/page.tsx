'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  BarChart3,
  DollarSign,
  Building2,
  Store,
  CreditCard,
  Download,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileText,
  Calendar,
  TrendingUp,
  Settings,
  Receipt,
  Send,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ClientBillingStore {
  name: string;
  status: 'active' | 'inactive';
  revenueContribution: number;
}

interface ClientBilling {
  id: string;
  clientName: string;
  totalStores: number;
  activeStores: number;
  subscriptionFee: number;
  monthlyRevenue: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  accountStatus: 'active' | 'inactive' | 'paused';
  lastPaymentDate: string | null;
  activatedDate: string;
  stores: ClientBillingStore[];
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'void';
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const clientBillingData: ClientBilling[] = [
  {
    id: 'c1', clientName: 'Pack & Ship Plus', totalStores: 8, activeStores: 7,
    subscriptionFee: 125, monthlyRevenue: 875, paymentStatus: 'paid', accountStatus: 'active',
    lastPaymentDate: '2026-02-01', activatedDate: '2025-06-15',
    stores: [
      { name: 'Downtown', status: 'active', revenueContribution: 125 },
      { name: 'Uptown', status: 'active', revenueContribution: 125 },
      { name: 'Brooklyn', status: 'active', revenueContribution: 125 },
      { name: 'Queens', status: 'active', revenueContribution: 125 },
      { name: 'Bronx', status: 'active', revenueContribution: 125 },
      { name: 'Staten Island', status: 'active', revenueContribution: 125 },
      { name: 'Jersey City', status: 'active', revenueContribution: 125 },
      { name: 'Hoboken', status: 'inactive', revenueContribution: 0 },
    ],
  },
  {
    id: 'c2', clientName: 'MailBox Express', totalStores: 6, activeStores: 5,
    subscriptionFee: 110, monthlyRevenue: 550, paymentStatus: 'paid', accountStatus: 'active',
    lastPaymentDate: '2026-02-01', activatedDate: '2025-05-01',
    stores: [
      { name: 'Central', status: 'active', revenueContribution: 110 },
      { name: 'Mission', status: 'active', revenueContribution: 110 },
      { name: 'Castro', status: 'active', revenueContribution: 110 },
      { name: 'SOMA', status: 'active', revenueContribution: 110 },
      { name: 'Marina', status: 'active', revenueContribution: 110 },
      { name: 'Sunset', status: 'inactive', revenueContribution: 0 },
    ],
  },
  {
    id: 'c3', clientName: 'Metro Mail Hub', totalStores: 5, activeStores: 4,
    subscriptionFee: 125, monthlyRevenue: 500, paymentStatus: 'pending', accountStatus: 'active',
    lastPaymentDate: '2026-01-01', activatedDate: '2025-08-10',
    stores: [
      { name: 'Midtown', status: 'active', revenueContribution: 125 },
      { name: 'Financial District', status: 'active', revenueContribution: 125 },
      { name: 'Harlem', status: 'active', revenueContribution: 125 },
      { name: 'Chelsea', status: 'active', revenueContribution: 125 },
      { name: 'SoHo', status: 'inactive', revenueContribution: 0 },
    ],
  },
  {
    id: 'c4', clientName: 'Quick Mail Center', totalStores: 4, activeStores: 3,
    subscriptionFee: 125, monthlyRevenue: 375, paymentStatus: 'overdue', accountStatus: 'active',
    lastPaymentDate: '2025-12-01', activatedDate: '2025-09-01',
    stores: [
      { name: 'Main Office', status: 'active', revenueContribution: 125 },
      { name: 'East Side', status: 'active', revenueContribution: 125 },
      { name: 'West Side', status: 'active', revenueContribution: 125 },
      { name: 'South', status: 'inactive', revenueContribution: 0 },
    ],
  },
  {
    id: 'c5', clientName: 'Ship N Go', totalStores: 3, activeStores: 3,
    subscriptionFee: 125, monthlyRevenue: 375, paymentStatus: 'paid', accountStatus: 'active',
    lastPaymentDate: '2026-02-01', activatedDate: '2025-10-01',
    stores: [
      { name: 'Austin HQ', status: 'active', revenueContribution: 125 },
      { name: 'Dallas', status: 'active', revenueContribution: 125 },
      { name: 'Houston', status: 'active', revenueContribution: 125 },
    ],
  },
  {
    id: 'c6', clientName: 'Postal Plus', totalStores: 3, activeStores: 2,
    subscriptionFee: 125, monthlyRevenue: 250, paymentStatus: 'overdue', accountStatus: 'active',
    lastPaymentDate: '2025-11-01', activatedDate: '2025-07-15',
    stores: [
      { name: 'Denver', status: 'active', revenueContribution: 125 },
      { name: 'Boulder', status: 'active', revenueContribution: 125 },
      { name: 'Aspen', status: 'inactive', revenueContribution: 0 },
    ],
  },
  {
    id: 'c7', clientName: 'Mail Stop', totalStores: 2, activeStores: 2,
    subscriptionFee: 125, monthlyRevenue: 250, paymentStatus: 'paid', accountStatus: 'active',
    lastPaymentDate: '2026-02-01', activatedDate: '2025-11-01',
    stores: [
      { name: 'Seattle', status: 'active', revenueContribution: 125 },
      { name: 'Portland', status: 'active', revenueContribution: 125 },
    ],
  },
  {
    id: 'c8', clientName: 'Package Point', totalStores: 2, activeStores: 0,
    subscriptionFee: 125, monthlyRevenue: 0, paymentStatus: 'overdue', accountStatus: 'inactive',
    lastPaymentDate: '2025-10-01', activatedDate: '2025-04-01',
    stores: [
      { name: 'Miami', status: 'inactive', revenueContribution: 0 },
      { name: 'Tampa', status: 'inactive', revenueContribution: 0 },
    ],
  },
];

const invoices: InvoiceRecord[] = [
  { id: 'inv1', invoiceNumber: 'INV-2026-0201', clientName: 'Pack & Ship Plus', amount: 875, status: 'paid', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: '2026-02-03' },
  { id: 'inv2', invoiceNumber: 'INV-2026-0202', clientName: 'MailBox Express', amount: 550, status: 'paid', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: '2026-02-05' },
  { id: 'inv3', invoiceNumber: 'INV-2026-0203', clientName: 'Metro Mail Hub', amount: 500, status: 'pending', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: null },
  { id: 'inv4', invoiceNumber: 'INV-2026-0204', clientName: 'Quick Mail Center', amount: 375, status: 'overdue', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: null },
  { id: 'inv5', invoiceNumber: 'INV-2026-0205', clientName: 'Ship N Go', amount: 375, status: 'paid', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: '2026-02-02' },
  { id: 'inv6', invoiceNumber: 'INV-2026-0206', clientName: 'Postal Plus', amount: 250, status: 'overdue', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: null },
  { id: 'inv7', invoiceNumber: 'INV-2026-0207', clientName: 'Mail Stop', amount: 250, status: 'paid', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: '2026-02-04' },
  { id: 'inv8', invoiceNumber: 'INV-2026-0208', clientName: 'Package Point', amount: 0, status: 'void', issuedDate: '2026-02-01', dueDate: '2026-02-15', paidDate: null },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function formatCurrency(amount: number) {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const paymentVariant = (s: string) => {
  if (s === 'paid') return 'success' as const;
  if (s === 'pending') return 'warning' as const;
  if (s === 'overdue') return 'danger' as const;
  return 'muted' as const;
};

type SortKey = 'clientName' | 'monthlyRevenue' | 'paymentStatus';
type SortDir = 'asc' | 'desc';

/* -------------------------------------------------------------------------- */
/*  Billing & Reporting Page (BAR-238 + BAR-250)                             */
/* -------------------------------------------------------------------------- */
export default function BillingReportingPage() {
  const [activeTab, setActiveTab] = useState('reporting');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('monthlyRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dateRange, setDateRange] = useState('current');
  const [startDate, setStartDate] = useState('2026-02-01');
  const [endDate, setEndDate] = useState('2026-02-28');
  const [overdueThreshold, setOverdueThreshold] = useState('15');

  // Summary metrics
  const summary = useMemo(() => {
    const activeClients = clientBillingData.filter((c) => c.accountStatus === 'active').length;
    const inactiveClients = clientBillingData.filter((c) => c.accountStatus !== 'active').length;
    const totalStores = clientBillingData.reduce((s, c) => s + c.totalStores, 0);
    const activeStores = clientBillingData.reduce((s, c) => s + c.activeStores, 0);
    const inactiveStores = totalStores - activeStores;
    const totalMRR = clientBillingData.reduce((s, c) => s + c.monthlyRevenue, 0);
    const paidCount = clientBillingData.filter((c) => c.paymentStatus === 'paid').length;
    const pendingCount = clientBillingData.filter((c) => c.paymentStatus === 'pending').length;
    const overdueCount = clientBillingData.filter((c) => c.paymentStatus === 'overdue').length;
    return {
      totalClients: clientBillingData.length,
      activeClients,
      inactiveClients,
      totalStores,
      activeStores,
      inactiveStores,
      totalMRR,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }, []);

  // Sorted client data
  const sortedClients = useMemo(() => {
    const data = [...clientBillingData];
    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'clientName') cmp = a.clientName.localeCompare(b.clientName);
      else if (sortKey === 'monthlyRevenue') cmp = a.monthlyRevenue - b.monthlyRevenue;
      else if (sortKey === 'paymentStatus') {
        const order = { overdue: 0, pending: 1, paid: 2 };
        cmp = (order[a.paymentStatus] ?? 3) - (order[b.paymentStatus] ?? 3);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    // In production, this would trigger an API call to generate and download the file
    alert(`Exporting billing report as ${format.toUpperCase()}…`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Performance Reporting"
        description="Revenue metrics, payment status, and client subscription billing"
        icon={<BarChart3 className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => handleExport('xlsx')}>
              Export XLSX
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'reporting', label: 'Reporting Dashboard', icon: <BarChart3 className="h-3.5 w-3.5" /> },
          { id: 'invoices', label: 'Subscription Billing', icon: <CreditCard className="h-3.5 w-3.5" />, count: invoices.length },
          { id: 'settings', label: 'Settings', icon: <Settings className="h-3.5 w-3.5" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ── TAB: Reporting Dashboard (BAR-238) ─────────────────────────── */}
      <TabPanel active={activeTab === 'reporting'}>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-100">{summary.totalClients}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-400">{summary.activeClients} active</span>
              <span className="text-xs text-surface-600">·</span>
              <span className="text-xs text-surface-500">{summary.inactiveClients} inactive</span>
            </div>
            <p className="text-xs text-surface-400 mt-1">Total Clients</p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <Store className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-100">{summary.totalStores}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-400">{summary.activeStores} active</span>
              <span className="text-xs text-surface-600">·</span>
              <span className="text-xs text-surface-500">{summary.inactiveStores} inactive</span>
            </div>
            <p className="text-xs text-surface-400 mt-1">Total Stores</p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                12.5%
              </span>
            </div>
            <p className="text-2xl font-bold text-surface-100">{formatCurrency(summary.totalMRR)}</p>
            <p className="text-xs text-surface-400 mt-1">Monthly Recurring Revenue</p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-lg font-bold text-emerald-400">{summary.paidCount}</span>
                <span className="text-xs text-surface-500 ml-1">paid</span>
              </div>
              <div>
                <span className="text-lg font-bold text-yellow-400">{summary.pendingCount}</span>
                <span className="text-xs text-surface-500 ml-1">pending</span>
              </div>
              <div>
                <span className="text-lg font-bold text-red-400">{summary.overdueCount}</span>
                <span className="text-xs text-surface-500 ml-1">overdue</span>
              </div>
            </div>
            <p className="text-xs text-surface-400 mt-1">Payment Status</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-surface-400">
            <Calendar className="h-4 w-4" />
            Period:
          </div>
          <Select
            options={[
              { value: 'current', label: 'Current Month' },
              { value: 'previous', label: 'Previous Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'custom', label: 'Custom Range' },
            ]}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
          {dateRange === 'custom' && (
            <>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <span className="text-surface-500">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </>
          )}
        </div>

        {/* Client Detail Table */}
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-surface-500 uppercase border-b border-surface-800 bg-surface-800/30">
                  <th className="text-left px-4 py-3 font-medium w-8"></th>
                  <th
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-surface-300"
                    onClick={() => toggleSort('clientName')}
                  >
                    Client {sortKey === 'clientName' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Stores (Active/Total)</th>
                  <th className="text-right px-4 py-3 font-medium">Fee/Store</th>
                  <th
                    className="text-right px-4 py-3 font-medium cursor-pointer hover:text-surface-300"
                    onClick={() => toggleSort('monthlyRevenue')}
                  >
                    Monthly Revenue {sortKey === 'monthlyRevenue' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-center px-4 py-3 font-medium cursor-pointer hover:text-surface-300"
                    onClick={() => toggleSort('paymentStatus')}
                  >
                    Payment Status {sortKey === 'paymentStatus' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Account</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client) => {
                  const isExpanded = expandedRow === client.id;
                  return (
                    <>
                      <tr
                        key={client.id}
                        className="border-b border-surface-800/50 hover:bg-surface-800/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedRow(isExpanded ? null : client.id)}
                      >
                        <td className="px-4 py-3 text-surface-500">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3 font-medium text-surface-200">{client.clientName}</td>
                        <td className="px-4 py-3 text-center text-surface-300">
                          <span className="text-emerald-400">{client.activeStores}</span>
                          <span className="text-surface-600"> / </span>
                          {client.totalStores}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-300">{formatCurrency(client.subscriptionFee)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-surface-100">{formatCurrency(client.monthlyRevenue)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={paymentVariant(client.paymentStatus)} dot>{client.paymentStatus}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={client.accountStatus === 'active' ? 'success' : 'muted'} dot>
                            {client.accountStatus}
                          </Badge>
                        </td>
                      </tr>
                      {/* Drill-down: per-store breakdown */}
                      {isExpanded && (
                        <tr key={`${client.id}-detail`}>
                          <td colSpan={7} className="px-8 py-3 bg-surface-800/20">
                            <p className="text-xs font-medium text-surface-500 uppercase mb-2">Store Breakdown</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {client.stores.map((store) => (
                                <div key={store.name} className="flex items-center gap-2 rounded-lg bg-surface-800/50 px-3 py-2">
                                  <Store className="h-3.5 w-3.5 text-surface-500" />
                                  <span className="text-sm text-surface-300 flex-1">{store.name}</span>
                                  <Badge variant={store.status === 'active' ? 'success' : 'muted'} dot>{store.status}</Badge>
                                  <span className="text-sm font-medium text-surface-200">
                                    {formatCurrency(store.revenueContribution)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-xs text-surface-500">
                              <span>Activated: {formatDate(client.activatedDate)}</span>
                              {client.lastPaymentDate && <span>Last payment: {formatDate(client.lastPaymentDate)}</span>}
                              <span>Revenue = {formatCurrency(client.subscriptionFee)} × {client.activeStores} active stores</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-700 bg-surface-800/30">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-surface-300">Totals</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">{formatCurrency(summary.totalMRR)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Revenue verification note */}
        <div className="flex items-start gap-2 rounded-lg bg-surface-800/30 px-4 py-3 text-xs text-surface-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-surface-400">Revenue calculation:</strong> Monthly revenue = (per-store fee) × (active stores).
            Inactive stores do not incur fees. Pro-rated billing applies for mid-month activations/deactivations.
            All amounts in USD.
          </div>
        </div>
      </TabPanel>

      {/* ── TAB: Subscription Billing / Invoices (BAR-250) ─────────────── */}
      <TabPanel active={activeTab === 'invoices'}>
        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="glass-card p-4">
              <p className="text-2xl font-bold text-surface-100">{invoices.length}</p>
              <p className="text-xs text-surface-400">Total Invoices</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0))}
              </p>
              <p className="text-xs text-surface-400">Collected</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0))}
              </p>
              <p className="text-xs text-surface-400">Pending</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0))}
              </p>
              <p className="text-xs text-surface-400">Overdue</p>
            </div>
          </div>

          {/* Invoice Table */}
          <Card padding="none">
            <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-200">Subscription Invoices — February 2026</h3>
              <Button variant="secondary" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
                Generate All Invoices
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-surface-500 uppercase border-b border-surface-800 bg-surface-800/30">
                    <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium">Client</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Issued</th>
                    <th className="text-left px-4 py-3 font-medium">Due</th>
                    <th className="text-left px-4 py-3 font-medium">Paid</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-surface-300">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-surface-200">{inv.clientName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-100">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={paymentVariant(inv.status)} dot>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-surface-400">{formatDate(inv.issuedDate)}</td>
                      <td className="px-4 py-3 text-surface-400">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3 text-surface-400">{inv.paidDate ? formatDate(inv.paidDate) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" iconOnly title="View invoice">
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          {(inv.status === 'pending' || inv.status === 'overdue') && (
                            <Button variant="ghost" size="sm" iconOnly title="Send reminder">
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {inv.status === 'pending' && (
                            <Button variant="ghost" size="sm" iconOnly title="Mark as paid">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Billing info note */}
          <div className="flex items-start gap-2 rounded-lg bg-surface-800/30 px-4 py-3 text-xs text-surface-500">
            <Receipt className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-surface-400">Billing cycle:</strong> Invoices are generated on the 1st of each month.
              Payment is due within {overdueThreshold} days. Subscriptions are billed at
              the per-store monthly fee × number of active stores. Pro-rated amounts apply for mid-cycle changes.
            </div>
          </div>
        </div>
      </TabPanel>

      {/* ── TAB: Settings ──────────────────────────────────────────────── */}
      <TabPanel active={activeTab === 'settings'}>
        <div className="max-w-xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Default Subscription Fee ($/store/month)"
                  type="number"
                  value="125"
                  helperText="New clients will default to this fee unless overridden"
                />
                <Input
                  label="Overdue Threshold (days)"
                  type="number"
                  value={overdueThreshold}
                  onChange={(e) => setOverdueThreshold(e.target.value)}
                  helperText="Payment not received after this many days past billing date is marked 'Overdue'"
                />
                <Input
                  label="Grace Period (days)"
                  type="number"
                  value="7"
                  helperText="Number of days after billing date before reminders are sent"
                />
                <Select
                  label="Billing Cycle"
                  options={[
                    { value: 'monthly', label: 'Monthly (1st of each month)' },
                    { value: 'quarterly', label: 'Quarterly' },
                  ]}
                  value="monthly"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pro-Rating Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-surface-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p>Mid-month activation: prorated based on remaining calendar days</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p>Mid-month deactivation: charged only for active days</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p>Fee changes mid-month: blended rate using each fee&apos;s active period</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p>Inactive stores are excluded from billing entirely</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </div>
      </TabPanel>
    </div>
  );
}
