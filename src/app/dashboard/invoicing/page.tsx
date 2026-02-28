'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Ban,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  CreditCard,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface InvoiceLineItem {
  id: string;
  description: string;
  serviceType: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceCustomer {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  email: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string | null;
  customerId: string | null;
  type: string;
  amount: number;
  tax: number;
  amountPaid: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  sentAt: string | null;
  sentVia: string | null;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
  customer: InvoiceCustomer | null;
}

interface Summary {
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  amountDraft: number;
  amountSent: number;
  amountPaid: number;
  amountOverdue: number;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
}

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

function statusVariant(s: string): 'success' | 'warning' | 'danger' | 'default' | 'info' {
  switch (s) {
    case 'paid': return 'success';
    case 'draft': return 'default';
    case 'sent': return 'info';
    case 'overdue': return 'danger';
    case 'partially_paid': return 'warning';
    case 'void': return 'default';
    default: return 'default';
  }
}

function statusIcon(s: string) {
  switch (s) {
    case 'paid': return <CheckCircle2 className="h-3.5 w-3.5" />;
    case 'draft': return <FileText className="h-3.5 w-3.5" />;
    case 'sent': return <Send className="h-3.5 w-3.5" />;
    case 'overdue': return <AlertCircle className="h-3.5 w-3.5" />;
    default: return <Clock className="h-3.5 w-3.5" />;
  }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function InvoicingPage() {
  const { localUser } = useTenant();
  const isAdmin = localUser?.role === 'admin' || localUser?.role === 'superadmin' || localUser?.role === 'manager';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Generate invoice modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [genCustomerId, setGenCustomerId] = useState('');
  const [genMode, setGenMode] = useState<'single' | 'batch'>('single');
  const [generating, setGenerating] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
      setSummary(data.summary || null);
    } catch {
      console.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (showGenerate && customers.length === 0) {
      fetch('/api/customers?limit=200')
        .then(r => r.json())
        .then(data => setCustomers(data.customers || []))
        .catch(() => {});
    }
  }, [showGenerate, customers.length]);

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          genMode === 'single'
            ? { action: 'generate_single', customerId: genCustomerId }
            : { action: 'generate_batch' },
        ),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to generate invoice');
        return;
      }
      setShowGenerate(false);
      fetchInvoices();
    } catch {
      console.error('Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', via: 'email' }),
    });
    fetchInvoices();
  };

  const handleVoidInvoice = async (invoiceId: string) => {
    if (!confirm('Void this invoice? Linked charges will revert to pending.')) return;
    await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'void' }),
    });
    fetchInvoices();
    setSelectedInvoice(null);
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    setPaying(true);
    try {
      await fetch(`/api/invoices/${paymentInvoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          amount: parseFloat(paymentAmount),
          method: paymentMethod,
        }),
      });
      setShowPayment(false);
      setPaymentAmount('');
      fetchInvoices();
      setSelectedInvoice(null);
    } catch {
      console.error('Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoicing"
        description="Generate, track, and manage customer invoices"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Draft</span>
            </div>
            <p className="text-xl font-bold">{summary?.totalDraft ?? 0}</p>
            <p className="text-xs text-gray-400">{formatCurrency(summary?.amountDraft ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-500">Sent</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{summary?.totalSent ?? 0}</p>
            <p className="text-xs text-gray-400">{formatCurrency(summary?.amountSent ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-500">Paid</span>
            </div>
            <p className="text-xl font-bold text-green-600">{summary?.totalPaid ?? 0}</p>
            <p className="text-xs text-gray-400">{formatCurrency(summary?.amountPaid ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-gray-500">Overdue</span>
            </div>
            <p className="text-xl font-bold text-red-600">{summary?.totalOverdue ?? 0}</p>
            <p className="text-xs text-gray-400">{formatCurrency(summary?.amountOverdue ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'void', label: 'Void' },
          ]}
        />

        <div className="flex-1" />

        {isAdmin && (
          <Button onClick={() => setShowGenerate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Generate Invoice
          </Button>
        )}
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-gray-400 py-12">
              No invoices yet. Generate invoices from deferred TOS charges.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Invoice #</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Created</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                      <td className="py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-3">
                        {inv.customer ? (
                          <div>
                            <span className="font-medium">{inv.customer.firstName} {inv.customer.lastName}</span>
                            <span className="text-xs text-gray-400 ml-2">{inv.customer.pmbNumber}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-3 text-right font-mono font-medium">
                        {formatCurrency(inv.amount + inv.tax)}
                        {inv.amountPaid > 0 && inv.status !== 'paid' && (
                          <div className="text-xs text-green-500">Paid: {formatCurrency(inv.amountPaid)}</div>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant(inv.status)}>
                          <span className="flex items-center gap-1">
                            {statusIcon(inv.status)} {inv.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {formatDateTime(inv.createdAt)}
                      </td>
                      <td className="py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {inv.status === 'draft' && isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => handleSendInvoice(inv.id)}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partially_paid') && isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setPaymentInvoiceId(inv.id);
                              setPaymentAmount(String((inv.amount + inv.tax - inv.amountPaid).toFixed(2)));
                              setShowPayment(true);
                            }}>
                              <CreditCard className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {inv.status !== 'paid' && inv.status !== 'void' && isAdmin && (
                            <Button variant="ghost" size="sm" onClick={() => handleVoidInvoice(inv.id)} className="text-red-500">
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">
                Page {page + 1} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
      >
        {selectedInvoice && (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  {selectedInvoice.customer
                    ? `${selectedInvoice.customer.firstName} ${selectedInvoice.customer.lastName}`
                    : 'Unknown Customer'}
                </p>
                {selectedInvoice.customer?.pmbNumber && (
                  <p className="text-sm text-gray-500">{selectedInvoice.customer.pmbNumber}</p>
                )}
              </div>
              <Badge variant={statusVariant(selectedInvoice.status)}>
                {selectedInvoice.status}
              </Badge>
            </div>

            {/* Line Items */}
            {selectedInvoice.lineItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Line Items</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="pb-1 text-left font-medium">Description</th>
                      <th className="pb-1 text-right font-medium">Qty</th>
                      <th className="pb-1 text-right font-medium">Rate</th>
                      <th className="pb-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.lineItems.map(li => (
                      <tr key={li.id} className="border-b last:border-0">
                        <td className="py-1.5">{li.description}</td>
                        <td className="py-1.5 text-right">{li.quantity}</td>
                        <td className="py-1.5 text-right font-mono">{formatCurrency(li.unitPrice)}</td>
                        <td className="py-1.5 text-right font-mono">{formatCurrency(li.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td colSpan={3} className="pt-2 text-right">Subtotal</td>
                      <td className="pt-2 text-right font-mono">{formatCurrency(selectedInvoice.amount)}</td>
                    </tr>
                    {selectedInvoice.tax > 0 && (
                      <tr>
                        <td colSpan={3} className="text-right text-gray-500">Tax</td>
                        <td className="text-right font-mono text-gray-500">{formatCurrency(selectedInvoice.tax)}</td>
                      </tr>
                    )}
                    <tr className="text-lg">
                      <td colSpan={3} className="pt-1 text-right font-bold">Total</td>
                      <td className="pt-1 text-right font-mono font-bold">
                        {formatCurrency(selectedInvoice.amount + selectedInvoice.tax)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Due Date:</span>{' '}
                {selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : '—'}
              </div>
              <div>
                <span className="text-gray-500">Created:</span>{' '}
                {formatDateTime(selectedInvoice.createdAt)}
              </div>
              {selectedInvoice.paidAt && (
                <div>
                  <span className="text-gray-500">Paid:</span>{' '}
                  {formatDateTime(selectedInvoice.paidAt)}
                </div>
              )}
              {selectedInvoice.sentAt && (
                <div>
                  <span className="text-gray-500">Sent:</span>{' '}
                  {formatDateTime(selectedInvoice.sentAt)} via {selectedInvoice.sentVia}
                </div>
              )}
            </div>

            {selectedInvoice.notes && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded p-2">{selectedInvoice.notes}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        title="Generate Invoice"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <Select
              value={genMode}
              onChange={e => setGenMode(e.target.value as 'single' | 'batch')}
              options={[
                { value: 'single', label: 'Single Customer' },
                { value: 'batch', label: 'Batch — All Customers with Pending Charges' },
              ]}
            />
          </div>

          {genMode === 'single' && (
            <div>
              <label className="block text-sm font-medium mb-1">Customer</label>
              <Select
                value={genCustomerId}
                onChange={e => setGenCustomerId(e.target.value)}
                options={[
                  { value: '', label: 'Select customer...' },
                  ...customers.map(c => ({
                    value: c.id,
                    label: `${c.firstName} ${c.lastName} (${c.pmbNumber})`,
                  })),
                ]}
              />
            </div>
          )}

          <p className="text-sm text-gray-500">
            {genMode === 'single'
              ? 'Generates an invoice from all pending deferred charges for this customer.'
              : 'Generates invoices for ALL customers with pending deferred charges.'}
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button
              onClick={handleGenerateInvoice}
              disabled={generating || (genMode === 'single' && !genCustomerId)}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Layers className="h-4 w-4 mr-1" />}
              Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Record Payment"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <Select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'ach', label: 'ACH Bank Transfer' },
                { value: 'paypal', label: 'PayPal' },
                { value: 'check', label: 'Check' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={paying || !paymentAmount}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <DollarSign className="h-4 w-4 mr-1" />}
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
