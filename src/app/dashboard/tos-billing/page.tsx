'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import {
  DollarSign,
  CreditCard,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface TosCharge {
  id: string;
  tenantId: string;
  customerId: string;
  description: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  mode: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  retryCount: number;
  failureReason: string | null;
  invoiceId: string | null;
  dueDate: string | null;
  referenceType: string | null;
  createdAt: string;
}

interface Summary {
  totalCharges: number;
  totalAmount: number;
  pendingDeferredCount: number;
  pendingDeferredAmount: number;
  paidImmediateCount: number;
  paidImmediateAmount: number;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
}

/* -------------------------------------------------------------------------- */
/*  Status badge                                                              */
/* -------------------------------------------------------------------------- */

function statusVariant(s: string): 'success' | 'warning' | 'danger' | 'default' | 'info' {
  switch (s) {
    case 'paid': return 'success';
    case 'pending': return 'warning';
    case 'invoiced': return 'info';
    case 'failed': return 'danger';
    case 'void': case 'refunded': return 'default';
    default: return 'default';
  }
}

function modeIcon(mode: string) {
  return mode === 'immediate'
    ? <CreditCard className="h-3.5 w-3.5 inline mr-1" />
    : <Clock className="h-3.5 w-3.5 inline mr-1" />;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function TosBillingPage() {
  const { localUser } = useTenant();
  const isAdmin = localUser?.role === 'admin' || localUser?.role === 'superadmin' || localUser?.role === 'manager';

  const [charges, setCharges] = useState<TosCharge[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  // New charge modal
  const [showNewCharge, setShowNewCharge] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [newCharge, setNewCharge] = useState({
    customerId: '',
    description: '',
    amount: '',
    tax: '0',
    mode: 'auto',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (modeFilter) params.set('mode', modeFilter);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`/api/tos-billing?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCharges(data.charges);
      setTotal(data.total);
      setSummary(data.summary);
    } catch {
      console.error('Failed to fetch TOS charges');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, modeFilter, page]);

  useEffect(() => { fetchCharges(); }, [fetchCharges]);

  // Fetch customers for the new charge form
  useEffect(() => {
    if (showNewCharge && customers.length === 0) {
      fetch('/api/customers?limit=200')
        .then(r => r.json())
        .then(data => setCustomers(data.customers || []))
        .catch(() => {});
    }
  }, [showNewCharge, customers.length]);

  const handleCreateCharge = async () => {
    if (!newCharge.customerId || !newCharge.description || !newCharge.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tos-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCharge.customerId,
          description: newCharge.description,
          amount: parseFloat(newCharge.amount),
          tax: parseFloat(newCharge.tax || '0'),
          mode: newCharge.mode === 'auto' ? undefined : newCharge.mode,
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowNewCharge(false);
      setNewCharge({ customerId: '', description: '', amount: '', tax: '0', mode: 'auto' });
      fetchCharges();
    } catch {
      console.error('Failed to create charge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async (chargeId: string) => {
    try {
      await fetch('/api/tos-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', tosChargeId: chargeId }),
      });
      fetchCharges();
    } catch {
      console.error('Failed to retry');
    }
  };

  const filtered = search
    ? charges.filter(c =>
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()))
    : charges;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time-of-Service Billing"
        description="Immediate charges and deferred account billing"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary?.totalAmount ?? 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{summary?.totalCharges ?? 0} charges</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Immediate Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.paidImmediateAmount ?? 0)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-400 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{summary?.paidImmediateCount ?? 0} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Deferred</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(summary?.pendingDeferredAmount ?? 0)}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-amber-400 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{summary?.pendingDeferredCount ?? 0} awaiting invoice</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Collection Rate</p>
                <p className="text-2xl font-bold">
                  {summary && summary.totalAmount > 0
                    ? `${Math.round((summary.paidImmediateAmount / summary.totalAmount) * 100)}%`
                    : '—'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400 opacity-50" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Immediate vs. total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search charges..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
            { value: 'invoiced', label: 'Invoiced' },
            { value: 'failed', label: 'Failed' },
            { value: 'void', label: 'Void' },
          ]}
        />

        <Select
          value={modeFilter}
          onChange={e => { setModeFilter(e.target.value); setPage(0); }}
          options={[
            { value: '', label: 'All Modes' },
            { value: 'immediate', label: 'Immediate' },
            { value: 'deferred', label: 'Deferred' },
          ]}
        />

        {isAdmin && (
          <Button onClick={() => setShowNewCharge(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Charge
          </Button>
        )}
      </div>

      {/* Charges Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TOS Charges</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No charges found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Mode</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Due</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(charge => (
                    <tr key={charge.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium">{charge.description}</div>
                        {charge.referenceType && (
                          <span className="text-xs text-gray-400">{charge.referenceType}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-xs">
                          {modeIcon(charge.mode)}
                          {charge.mode}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-medium">
                        {formatCurrency(charge.total)}
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant(charge.status)}>{charge.status}</Badge>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {formatDateTime(charge.createdAt)}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {charge.dueDate ? formatDate(charge.dueDate) : '—'}
                      </td>
                      <td className="py-3">
                        {charge.status === 'failed' && charge.retryCount < 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(charge.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                          </Button>
                        )}
                        {charge.failureReason && (
                          <span className="text-xs text-red-500 block mt-1">
                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                            {charge.failureReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                Page {page + 1} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Charge Modal */}
      <Modal
        isOpen={showNewCharge}
        onClose={() => setShowNewCharge(false)}
        title="New Time-of-Service Charge"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <Select
              value={newCharge.customerId}
              onChange={e => setNewCharge(prev => ({ ...prev, customerId: e.target.value }))}
              options={[
                { value: '', label: 'Select customer...' },
                ...customers.map(c => ({
                  value: c.id,
                  label: `${c.firstName} ${c.lastName} (${c.pmbNumber})`,
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              placeholder="Package storage fee, shipping label, etc."
              value={newCharge.description}
              onChange={e => setNewCharge(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newCharge.amount}
                onChange={e => setNewCharge(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newCharge.tax}
                onChange={e => setNewCharge(prev => ({ ...prev, tax: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Billing Mode</label>
            <Select
              value={newCharge.mode}
              onChange={e => setNewCharge(prev => ({ ...prev, mode: e.target.value }))}
              options={[
                { value: 'auto', label: 'Auto (use customer/tenant config)' },
                { value: 'immediate', label: 'Immediate — charge card now' },
                { value: 'deferred', label: 'Deferred — add to account balance' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewCharge(false)}>Cancel</Button>
            <Button
              onClick={handleCreateCharge}
              disabled={submitting || !newCharge.customerId || !newCharge.description || !newCharge.amount}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wallet className="h-4 w-4 mr-1" />}
              Create Charge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
