'use client';
/* eslint-disable */

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatDate, cn } from '@/lib/utils';
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
  Zap,
  FileText,
  ShieldCheck,
  ShieldX,
  RotateCw,
  Timer,
  ChevronRight,
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
type RenewalAction = 'auto_renew' | 'manual_renew' | 'send_reminder' | 'suspend';

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

function getDaysLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return `${days}d`;
}

function getDaysColor(days: number) {
  if (days < 0) return 'text-red-400 font-medium';
  if (days <= 7) return 'text-red-400 font-medium';
  if (days <= 30) return 'text-yellow-400 font-medium';
  return 'text-surface-300';
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function RenewalsPage() {
  const [customers, setCustomers] = useState<RenewalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Renewal action modal
  const [selectedCustomer, setSelectedCustomer] = useState<RenewalCustomer | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [renewalTerm, setRenewalTerm] = useState('12');
  const [infoChanged, setInfoChanged] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleRenewalAction = async (action: RenewalAction) => {
    if (!selectedCustomer) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/renewals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          action,
          renewalTermMonths: parseInt(renewalTerm, 10),
          infoChanged,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResult({
          success: true,
          message: action === 'auto_renew'
            ? `Auto-renewed until ${formatDate(data.newRenewalDate)}`
            : action === 'manual_renew'
              ? `Renewed until ${formatDate(data.newRenewalDate)}${data.form1583RefilingRequired ? ' — PS1583 re-filing required' : ''}`
              : action === 'send_reminder'
                ? 'Reminder sent successfully'
                : 'Customer suspended',
        });
        await fetchRenewals();
      } else {
        setActionResult({
          success: false,
          message: data.message || 'Action failed',
        });
      }
    } catch (e) {
      setActionResult({ success: false, message: 'Network error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Stats
  const current = customers.filter((c) => c.renewalStatus === 'current').length;
  const dueSoon = customers.filter((c) => c.renewalStatus === 'due_soon').length;
  const pastDue = customers.filter((c) => c.renewalStatus === 'past_due').length;
  const suspended = customers.filter((c) => c.renewalStatus === 'suspended').length;
  const autoRenewEligible = customers.filter((c) =>
    c.renewalStatus === 'due_soon' && c.daysUntilRenewal <= 30
  ).length;

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
        description="Track and process mailbox renewals. Auto-renew eligible customers or handle manual renewals."
        icon={<CalendarClock className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={runCron}
              loading={processing}
              leftIcon={<Timer className="h-4 w-4" />}
            >
              Run Cron
            </Button>
            <Button onClick={runCron} loading={processing} leftIcon={<Send className="h-4 w-4" />}>
              Process Renewals
            </Button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Current" value={current} />
        <StatCard icon={<Clock className="h-5 w-5" />} title="Due Soon" value={dueSoon} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Past Due" value={pastDue} />
        <StatCard icon={<Ban className="h-5 w-5" />} title="Suspended" value={suspended} />
        <StatCard icon={<Zap className="h-5 w-5" />} title="Auto-Renew Ready" value={autoRenewEligible} />
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
                <th className="text-right px-4 py-3 font-medium text-surface-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-surface-500" />
                    <p className="text-sm text-surface-500 mt-2">Loading renewals…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-500">
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
                      <span className={getDaysColor(c.daysUntilRenewal)}>
                        {getDaysLabel(c.daysUntilRenewal)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(c.renewalStatus)}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">
                      {c.lastRenewalNotice ? formatDate(c.lastRenewalNotice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowActionModal(true);
                          setActionResult(null);
                        }}
                        leftIcon={<ChevronRight className="h-3.5 w-3.5" />}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Renewal Action Modal */}
      <Modal
        open={showActionModal}
        onClose={() => { setShowActionModal(false); setSelectedCustomer(null); setActionResult(null); }}
        title="Manage Renewal"
        description={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} · ${selectedCustomer.pmbNumber}` : ''}
        size="md"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            {/* Customer Summary */}
            <div className="rounded-lg bg-surface-800/40 p-3 border border-surface-700">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-surface-400 text-xs">Renewal Date</span>
                  <p className="text-surface-200">
                    {selectedCustomer.renewalDate ? formatDate(selectedCustomer.renewalDate) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-surface-400 text-xs">Days Remaining</span>
                  <p className={getDaysColor(selectedCustomer.daysUntilRenewal)}>
                    {getDaysLabel(selectedCustomer.daysUntilRenewal)}
                  </p>
                </div>
                <div>
                  <span className="text-surface-400 text-xs">Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedCustomer.renewalStatus)}</div>
                </div>
                <div>
                  <span className="text-surface-400 text-xs">Last Notice</span>
                  <p className="text-surface-300 text-xs mt-0.5">
                    {selectedCustomer.lastRenewalNotice ? formatDate(selectedCustomer.lastRenewalNotice) : 'None'}
                  </p>
                </div>
              </div>
            </div>

            {/* Renewal Term */}
            <Select
              label="Renewal Term"
              value={renewalTerm}
              onChange={(e) => setRenewalTerm(e.target.value)}
              options={[
                { value: '1', label: '1 Month' },
                { value: '3', label: '3 Months' },
                { value: '6', label: '6 Months' },
                { value: '12', label: '12 Months' },
                { value: '24', label: '24 Months' },
              ]}
            />

            {/* Info Changed Toggle */}
            <label className="flex items-center gap-3 cursor-pointer rounded-lg p-3 bg-surface-800/30 hover:bg-surface-800/50 transition-colors">
              <input
                type="checkbox"
                checked={infoChanged}
                onChange={(e) => setInfoChanged(e.target.checked)}
                className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500/30"
              />
              <div>
                <span className="text-sm text-surface-200">Customer info changed since last PS1583</span>
                <p className="text-xs text-surface-500 mt-0.5">
                  If checked, a new Form 1583 will need to be filed
                </p>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleRenewalAction('auto_renew')}
                loading={actionLoading}
                leftIcon={<Zap className="h-3.5 w-3.5" />}
              >
                Auto-Renew
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleRenewalAction('manual_renew')}
                loading={actionLoading}
                leftIcon={<RotateCw className="h-3.5 w-3.5" />}
              >
                Manual Renew
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleRenewalAction('send_reminder')}
                loading={actionLoading}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                Send Reminder
              </Button>
              <Button
                variant="danger"
                className="w-full"
                onClick={() => handleRenewalAction('suspend')}
                loading={actionLoading}
                leftIcon={<Ban className="h-3.5 w-3.5" />}
              >
                Suspend
              </Button>
            </div>

            {/* Result */}
            {actionResult && (
              <div className={cn(
                'rounded-lg p-3 border',
                actionResult.success
                  ? 'bg-emerald-950/20 border-emerald-800/40'
                  : 'bg-red-950/20 border-red-800/40'
              )}>
                <div className="flex items-center gap-2">
                  {actionResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={cn(
                    'text-sm',
                    actionResult.success ? 'text-emerald-300' : 'text-red-300'
                  )}>
                    {actionResult.message}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
