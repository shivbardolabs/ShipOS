'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  Package,
  Search,
  Filter,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  Ban,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ChargeEventCustomer {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  email: string | null;
}

interface ChargeEvent {
  id: string;
  tenantId: string;
  customerId: string;
  pmbNumber: string;
  serviceType: string;
  description: string;
  quantity: number;
  unitRate: number;
  costBasis: number;
  markup: number;
  totalCharge: number;
  status: string;
  packageId: string | null;
  shipmentId: string | null;
  mailPieceId: string | null;
  invoiceId: string | null;
  createdById: string | null;
  voidedById: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: ChargeEventCustomer;
}

interface Summary {
  count: number;
  totalCharge: number;
  totalCost: number;
  totalMarkup: number;
}

interface NewChargeForm {
  customerId: string;
  serviceType: string;
  description: string;
  quantity: number;
  unitRate: number;
  costBasis: number;
  markup: number;
  notes: string;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const SERVICE_TYPES = [
  { value: 'receiving', label: 'Receiving', icon: '📦' },
  { value: 'storage', label: 'Storage', icon: '🏠' },
  { value: 'forwarding', label: 'Forwarding', icon: '📤' },
  { value: 'scanning', label: 'Scanning', icon: '📄' },
  { value: 'pickup', label: 'Pickup', icon: '🚚' },
  { value: 'disposal', label: 'Disposal', icon: '🗑️' },
  { value: 'shipping', label: 'Shipping', icon: '✈️' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

const STATUS_BADGE_MAP: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  pending: 'warning',
  posted: 'info',
  invoiced: 'default',
  paid: 'success',
  void: 'danger',
  disputed: 'danger',
};

const PAGE_SIZE = 20;

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function ChargeEventsPage() {
  const { localUser } = useTenant();
  const [chargeEvents, setChargeEvents] = useState<ChargeEvent[]>([]);
  const [summary, setSummary] = useState<Summary>({ count: 0, totalCharge: 0, totalCost: 0, totalMarkup: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCharge, setNewCharge] = useState<NewChargeForm>({
    customerId: '',
    serviceType: 'receiving',
    description: '',
    quantity: 1,
    unitRate: 0,
    costBasis: 0,
    markup: 0,
    notes: '',
  });

  // Detail view
  const [selectedEvent, setSelectedEvent] = useState<ChargeEvent | null>(null);

  const isAdmin = localUser?.role === 'admin' || localUser?.role === 'superadmin' || localUser?.role === 'manager';

  /* ── Fetch charge events ─────────────────────────────────────────────── */

  const loadChargeEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      if (statusFilter) params.set('status', statusFilter);
      if (serviceFilter) params.set('serviceType', serviceFilter);

      const res = await fetch(`/api/charge-events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setChargeEvents(data.chargeEvents || []);
        setTotal(data.total || 0);
        setSummary(data.summary || { count: 0, totalCharge: 0, totalCost: 0, totalMarkup: 0 });
      }
    } catch (err) {
      console.error('Failed to load charge events:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, serviceFilter]);

  useEffect(() => {
    loadChargeEvents();
  }, [loadChargeEvents]);

  /* ── Search customers for create form ────────────────────────────────── */

  useEffect(() => {
    if (!showCreate || customerSearch.length < 2) {
      setCustomers([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(customerSearch)}&mode=name_company`);
        if (res.ok) {
          const data = await res.json();
          setCustomers(
            (data.customers || []).map((c: CustomerOption) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              pmbNumber: c.pmbNumber,
            })),
          );
        }
      } catch {
        // Ignore search errors
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearch, showCreate]);

  /* ── Create charge event ─────────────────────────────────────────────── */

  const handleCreate = async () => {
    if (!newCharge.customerId || !newCharge.description) return;
    setCreating(true);
    try {
      const res = await fetch('/api/charge-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCharge),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewCharge({
          customerId: '',
          serviceType: 'receiving',
          description: '',
          quantity: 1,
          unitRate: 0,
          costBasis: 0,
          markup: 0,
          notes: '',
        });
        setCustomerSearch('');
        loadChargeEvents();
      }
    } catch (err) {
      console.error('Failed to create charge event:', err);
    } finally {
      setCreating(false);
    }
  };

  /* ── Void charge event ───────────────────────────────────────────────── */

  const handleVoid = async (id: string) => {
    const reason = prompt('Enter reason for voiding this charge:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/charge-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'void', voidReason: reason }),
      });
      if (res.ok) {
        loadChargeEvents();
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error('Failed to void charge event:', err);
    }
  };

  /* ── Client-side search filter ───────────────────────────────────────── */

  const filteredEvents = searchQuery
    ? chargeEvents.filter(
        (e) =>
          e.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.pmbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : chargeEvents;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const profitMargin = summary.totalCharge > 0
    ? ((summary.totalMarkup / summary.totalCharge) * 100).toFixed(1)
    : '0.0';

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charge Events"
        description="Track all billable service charges by customer and PMB."
        icon={<Receipt className="h-6 w-6" />}
      />

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <Receipt className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Total Charges</p>
                <p className="text-xl font-bold text-surface-100">{summary.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-xl font-bold text-surface-100">{formatCurrency(summary.totalCharge)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Package className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Total COGS</p>
                <p className="text-xl font-bold text-surface-100">{formatCurrency(summary.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-surface-500 uppercase tracking-wide">Margin</p>
                <p className="text-xl font-bold text-surface-100">
                  {formatCurrency(summary.totalMarkup)}{' '}
                  <span className="text-sm text-surface-400">({profitMargin}%)</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <Input
            placeholder="Search by name, PMB, or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'text-primary-500' : ''}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>

        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Charge
          </Button>
        )}
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-surface-500 mb-1 uppercase tracking-wide">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="posted">Posted</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1 uppercase tracking-wide">Service Type</label>
              <select
                value={serviceFilter}
                onChange={(e) => { setServiceFilter(e.target.value); setPage(0); }}
                className="bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200"
              >
                <option value="">All Types</option>
                {SERVICE_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.icon} {st.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter(''); setServiceFilter(''); setPage(0); }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Charge Events Table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Charge Events
            <span className="text-surface-500 font-normal text-sm">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-surface-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">No charge events found</p>
              {isAdmin && (
                <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Charge
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 text-left">
                      <th className="py-2 pr-4 text-surface-400 font-medium">Date</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium">Customer</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium">PMB</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium">Service</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium">Description</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium text-right">Cost</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium text-right">Markup</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium text-right">Total</th>
                      <th className="py-2 pr-4 text-surface-400 font-medium">Status</th>
                      <th className="py-2 text-surface-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => {
                      const svc = SERVICE_TYPES.find((s) => s.value === event.serviceType);
                      return (
                        <tr key={event.id} className="border-b border-surface-800 hover:bg-surface-800/50">
                          <td className="py-3 pr-4 text-surface-300 whitespace-nowrap">
                            {formatDateTime(event.createdAt)}
                          </td>
                          <td className="py-3 pr-4 text-surface-200 font-medium">
                            {event.customer.firstName} {event.customer.lastName}
                          </td>
                          <td className="py-3 pr-4 text-surface-400 font-mono text-xs">
                            {event.pmbNumber}
                          </td>
                          <td className="py-3 pr-4 text-surface-300">
                            <span className="mr-1">{svc?.icon || '⚙️'}</span>
                            {svc?.label || event.serviceType}
                          </td>
                          <td className="py-3 pr-4 text-surface-300 max-w-[200px] truncate">
                            {event.description}
                          </td>
                          <td className="py-3 pr-4 text-surface-300 text-right whitespace-nowrap">
                            {formatCurrency(event.costBasis)}
                          </td>
                          <td className="py-3 pr-4 text-surface-300 text-right whitespace-nowrap">
                            {formatCurrency(event.markup)}
                          </td>
                          <td className="py-3 pr-4 text-surface-100 font-medium text-right whitespace-nowrap">
                            {formatCurrency(event.totalCharge)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={STATUS_BADGE_MAP[event.status] || 'muted'}>
                              {event.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedEvent(event)}
                                className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isAdmin && event.status !== 'void' && (
                                <button
                                  onClick={() => handleVoid(event.id)}
                                  className="p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-400"
                                  title="Void charge"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-surface-800 mt-4">
                  <p className="text-sm text-surface-500">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-surface-400">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Panel ───────────────────────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <h3 className="font-semibold text-surface-100">Charge Event Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded hover:bg-surface-700 text-surface-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase">Customer</p>
                  <p className="text-sm text-surface-200 font-medium">
                    {selectedEvent.customer.firstName} {selectedEvent.customer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase">PMB #</p>
                  <p className="text-sm text-surface-200 font-mono">{selectedEvent.pmbNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase">Service Type</p>
                  <p className="text-sm text-surface-200">
                    {SERVICE_TYPES.find((s) => s.value === selectedEvent.serviceType)?.label || selectedEvent.serviceType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase">Status</p>
                  <Badge variant={STATUS_BADGE_MAP[selectedEvent.status] || 'muted'}>
                    {selectedEvent.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-surface-500 uppercase">Description</p>
                <p className="text-sm text-surface-200">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-surface-800">
                <div>
                  <p className="text-xs text-surface-500 uppercase">Cost Basis</p>
                  <p className="text-sm text-surface-200 font-medium">{formatCurrency(selectedEvent.costBasis)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase">Markup</p>
                  <p className="text-sm text-surface-200 font-medium">{formatCurrency(selectedEvent.markup)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase">Total Charge</p>
                  <p className="text-sm text-surface-100 font-bold">{formatCurrency(selectedEvent.totalCharge)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase">Quantity</p>
                  <p className="text-sm text-surface-200">{selectedEvent.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase">Unit Rate</p>
                  <p className="text-sm text-surface-200">{formatCurrency(selectedEvent.unitRate)}</p>
                </div>
              </div>

              {selectedEvent.notes && (
                <div>
                  <p className="text-xs text-surface-500 uppercase">Notes</p>
                  <p className="text-sm text-surface-300">{selectedEvent.notes}</p>
                </div>
              )}

              {selectedEvent.voidedAt && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-300 font-medium">Voided</p>
                    <p className="text-xs text-red-400">{selectedEvent.voidReason}</p>
                    <p className="text-xs text-surface-500 mt-1">{formatDateTime(selectedEvent.voidedAt)}</p>
                  </div>
                </div>
              )}

              <div className="text-xs text-surface-500">
                Created: {formatDateTime(selectedEvent.createdAt)} · Updated: {formatDateTime(selectedEvent.updatedAt)}
              </div>

              {isAdmin && selectedEvent.status !== 'void' && (
                <div className="flex justify-end pt-2 border-t border-surface-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleVoid(selectedEvent.id)}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Void Charge
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <h3 className="font-semibold text-surface-100">New Charge Event</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-surface-700 text-surface-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Customer Search */}
              <div>
                <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">
                  Customer *
                </label>
                <Input
                  placeholder="Search customer by name or PMB…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customers.length > 0 && (
                  <div className="mt-1 border border-surface-700 rounded-md bg-surface-800 max-h-32 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setNewCharge({ ...newCharge, customerId: c.id });
                          setCustomerSearch(`${c.firstName} ${c.lastName} (PMB ${c.pmbNumber})`);
                          setCustomers([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-surface-200 hover:bg-surface-700"
                      >
                        {c.firstName} {c.lastName}{' '}
                        <span className="text-surface-500 font-mono text-xs">PMB {c.pmbNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
                {newCharge.customerId && (
                  <p className="text-xs text-emerald-400 mt-1">✓ Customer selected</p>
                )}
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">
                  Service Type *
                </label>
                <select
                  value={newCharge.serviceType}
                  onChange={(e) => setNewCharge({ ...newCharge, serviceType: e.target.value })}
                  className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-surface-200"
                >
                  {SERVICE_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.icon} {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">
                  Description *
                </label>
                <Input
                  placeholder="e.g., Package receiving fee"
                  value={newCharge.description}
                  onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                />
              </div>

              {/* Quantity & Unit Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">Quantity</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={newCharge.quantity}
                    onChange={(e) => setNewCharge({ ...newCharge, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">Unit Rate ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCharge.unitRate}
                    onChange={(e) => setNewCharge({ ...newCharge, unitRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Cost Basis & Markup */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">Cost Basis ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCharge.costBasis}
                    onChange={(e) => setNewCharge({ ...newCharge, costBasis: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">Markup ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCharge.markup}
                    onChange={(e) => setNewCharge({ ...newCharge, markup: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Calculated total */}
              <div className="p-3 rounded-lg bg-surface-800 border border-surface-700">
                <p className="text-xs text-surface-500 uppercase">Calculated Total</p>
                <p className="text-lg font-bold text-surface-100">
                  {formatCurrency(
                    newCharge.costBasis + newCharge.markup > 0
                      ? newCharge.costBasis + newCharge.markup
                      : newCharge.quantity * newCharge.unitRate,
                  )}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  {newCharge.costBasis + newCharge.markup > 0
                    ? 'Cost basis + markup'
                    : 'Quantity × unit rate'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-surface-500 uppercase tracking-wide mb-1">Notes</label>
                <textarea
                  value={newCharge.notes}
                  onChange={(e) => setNewCharge({ ...newCharge, notes: e.target.value })}
                  className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-surface-200 resize-y min-h-[60px]"
                  placeholder="Optional notes…"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-surface-800">
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newCharge.customerId || !newCharge.description}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Charge
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
