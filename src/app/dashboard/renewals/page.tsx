'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  CalendarClock,
  Users,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Loader2,
  Send,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface RenewalCustomer {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  email: string | null;
  phone: string | null;
  renewalDate: string | null;
  renewalStatus: string | null;
  lastRenewalNotice: string | null;
  status: string;
  daysUntilRenewal: number;
}

type FilterStatus = 'all' | 'current' | 'due_soon' | 'past_due' | 'suspended';

/* ── Status Helpers ─────────────────────────────────────────────────────── */

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'current':
      return <Badge variant="success">Current</Badge>;
    case 'due_soon':
      return <Badge variant="warning">Due Soon</Badge>;
    case 'past_due':
      return <Badge variant="danger">Past Due</Badge>;
    case 'suspended':
      return <Badge variant="danger">Suspended</Badge>;
    default:
      return <Badge variant="muted">Unknown</Badge>;
  }
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function RenewalsPage() {
  const [customers, setCustomers] = useState<RenewalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const fetchRenewals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/renewals');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error('Failed to fetch renewals', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRenewals();
  }, [fetchRenewals]);

  const runCron = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/cron/renewals', { method: 'POST' });
      if (res.ok) {
        await fetchRenewals();
      }
    } catch (e) {
      console.error('Cron run failed', e);
    } finally {
      setProcessing(false);
    }
  };

  // Stats
  const current = customers.filter((c) => c.renewalStatus === 'current').length;
  const dueSoon = customers.filter((c) => c.renewalStatus === 'due_soon').length;
  const pastDue = customers.filter((c) => c.renewalStatus === 'past_due').length;
  const suspended = customers.filter((c) => c.renewalStatus === 'suspended').length;

  // Filtered
  const filtered = customers.filter((c) => {
    if (statusFilter !== 'all' && c.renewalStatus !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.pmbNumber.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewal Pipeline"
        description="Track and manage customer mailbox renewals"
        icon={<CalendarClock className="h-6 w-6" />}
        actions={
          <Button onClick={runCron} loading={processing} leftIcon={<Send className="h-4 w-4" />}>
            Process Renewals
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Current" value={current} />
        <StatCard icon={<Clock className="h-5 w-5" />} title="Due Soon" value={dueSoon} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Past Due" value={pastDue} />
        <StatCard icon={<Ban className="h-5 w-5" />} title="Suspended" value={suspended} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by name, PMB, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'current', label: 'Current' },
                  { value: 'due_soon', label: 'Due Soon' },
                  { value: 'past_due', label: 'Past Due' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
            </div>
            <Button variant="ghost" onClick={fetchRenewals} iconOnly>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 font-medium text-surface-400">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">PMB</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Renewal Date</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Days Left</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-400">Last Notice</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-surface-500" />
                    <p className="text-sm text-surface-500 mt-2">Loading renewals…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-surface-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No customers match your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-surface-800 hover:bg-surface-900/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-200">{c.firstName} {c.lastName}</div>
                      {c.email && <div className="text-xs text-surface-500">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-surface-300 font-mono">{c.pmbNumber}</td>
                    <td className="px-4 py-3 text-surface-300">
                      {c.renewalDate ? formatDate(c.renewalDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={
                        c.daysUntilRenewal < 0
                          ? 'text-red-400 font-medium'
                          : c.daysUntilRenewal <= 7
                          ? 'text-yellow-400 font-medium'
                          : 'text-surface-300'
                      }>
                        {c.daysUntilRenewal < 0
                          ? `${Math.abs(c.daysUntilRenewal)}d overdue`
                          : `${c.daysUntilRenewal}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(c.renewalStatus)}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {c.lastRenewalNotice ? formatDate(c.lastRenewalNotice) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
