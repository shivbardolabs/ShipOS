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
import { formatDate } from '@/lib/utils';
import {
  CreditCard,
  Building2,
  Wallet,
  Plus,
  Trash2,
  Star,
  StarOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PaymentMethod {
  id: string;
  tenantId: string;
  customerId: string;
  type: string;
  label: string;
  isDefault: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  bankName: string | null;
  accountLast4: string | null;
  paypalEmail: string | null;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function typeIcon(type: string) {
  switch (type) {
    case 'card': return <CreditCard className="h-5 w-5 text-blue-500" />;
    case 'ach': return <Building2 className="h-5 w-5 text-green-500" />;
    case 'paypal': return <Wallet className="h-5 w-5 text-indigo-500" />;
    default: return <CreditCard className="h-5 w-5 text-gray-400" />;
  }
}

function isExpiringSoon(month: number | null, year: number | null): boolean {
  if (!month || !year) return false;
  const now = new Date();
  const expiry = new Date(year, month, 0); // Last day of exp month
  const diffMs = expiry.getTime() - now.getTime();
  return diffMs > 0 && diffMs < 60 * 24 * 60 * 60 * 1000; // 60 days
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function PaymentMethodsPage() {
  const { localUser } = useTenant();
  const isAdmin = localUser?.role === 'admin' || localUser?.role === 'superadmin' || localUser?.role === 'manager';

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // New method modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMethod, setNewMethod] = useState({
    type: 'card',
    cardBrand: 'visa',
    cardLast4: '',
    cardExpMonth: '',
    cardExpYear: '',
    bankName: '',
    accountLast4: '',
    routingLast4: '',
    paypalEmail: '',
    label: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch customers
  useEffect(() => {
    fetch('/api/customers?limit=200')
      .then(r => r.json())
      .then(data => setCustomers(data.customers || []))
      .catch(() => {});
  }, []);

  const fetchMethods = useCallback(async (custId: string) => {
    if (!custId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payment-methods?customerId=${custId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMethods(data.paymentMethods || []);
      setCustomer(data.customer || null);
    } catch {
      console.error('Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) fetchMethods(selectedCustomerId);
  }, [selectedCustomerId, fetchMethods]);

  const handleSetDefault = async (methodId: string) => {
    await fetch(`/api/payment-methods/${methodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    fetchMethods(selectedCustomerId);
  };

  const handleRemove = async (methodId: string) => {
    if (!confirm('Remove this payment method?')) return;
    await fetch(`/api/payment-methods/${methodId}`, { method: 'DELETE' });
    fetchMethods(selectedCustomerId);
  };

  const handleAdd = async () => {
    if (!selectedCustomerId) return;
    setSubmitting(true);

    let label = newMethod.label;
    if (!label) {
      if (newMethod.type === 'card') label = `${newMethod.cardBrand.toUpperCase()} ****${newMethod.cardLast4}`;
      else if (newMethod.type === 'ach') label = `${newMethod.bankName} ****${newMethod.accountLast4}`;
      else label = `PayPal ${newMethod.paypalEmail}`;
    }

    try {
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type: newMethod.type,
          label,
          cardBrand: newMethod.type === 'card' ? newMethod.cardBrand : undefined,
          cardLast4: newMethod.type === 'card' ? newMethod.cardLast4 : undefined,
          cardExpMonth: newMethod.type === 'card' ? parseInt(newMethod.cardExpMonth) || undefined : undefined,
          cardExpYear: newMethod.type === 'card' ? parseInt(newMethod.cardExpYear) || undefined : undefined,
          bankName: newMethod.type === 'ach' ? newMethod.bankName : undefined,
          accountLast4: newMethod.type === 'ach' ? newMethod.accountLast4 : undefined,
          routingLast4: newMethod.type === 'ach' ? newMethod.routingLast4 : undefined,
          paypalEmail: newMethod.type === 'paypal' ? newMethod.paypalEmail : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add');
      setShowAddModal(false);
      setNewMethod({ type: 'card', cardBrand: 'visa', cardLast4: '', cardExpMonth: '', cardExpYear: '', bankName: '', accountLast4: '', routingLast4: '', paypalEmail: '', label: '' });
      fetchMethods(selectedCustomerId);
    } catch {
      console.error('Failed to add payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = search
    ? customers.filter(c =>
        `${c.firstName} ${c.lastName} ${c.pmbNumber}`.toLowerCase().includes(search.toLowerCase()))
    : customers;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Methods"
        description="Manage stored payment methods per customer"
      />

      {/* Customer Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              options={[
                { value: '', label: 'Select a customer...' },
                ...filteredCustomers.map(c => ({
                  value: c.id,
                  label: `${c.firstName} ${c.lastName} — ${c.pmbNumber}`,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods List */}
      {selectedCustomerId && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {customer ? `${customer.firstName} ${customer.lastName} (${customer.pmbNumber})` : 'Customer'}
            </h3>
            {isAdmin && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Method
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : methods.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No payment methods on file</p>
                <p className="text-xs mt-1">Add a card, bank account, or PayPal to enable billing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {methods.map(m => (
                <Card key={m.id} className={m.isDefault ? 'ring-2 ring-blue-400' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {typeIcon(m.type)}
                        <CardTitle className="text-base">{m.label}</CardTitle>
                      </div>
                      {m.isDefault && (
                        <Badge variant="info">Default</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-gray-500">
                      {m.type === 'card' && m.cardExpMonth && m.cardExpYear && (
                        <div className="flex items-center gap-1">
                          Expires {String(m.cardExpMonth).padStart(2, '0')}/{m.cardExpYear}
                          {isExpiringSoon(m.cardExpMonth, m.cardExpYear) && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      )}
                      {m.type === 'ach' && m.bankName && (
                        <div>{m.bankName}</div>
                      )}
                      {m.type === 'paypal' && m.paypalEmail && (
                        <div>{m.paypalEmail}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {m.verifiedAt ? (
                        <><CheckCircle2 className="h-3 w-3 text-green-500" /> Verified {formatDate(m.verifiedAt)}</>
                      ) : (
                        <><AlertTriangle className="h-3 w-3 text-amber-500" /> Unverified</>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex gap-2 pt-2 border-t">
                        {!m.isDefault && (
                          <Button variant="ghost" size="sm" onClick={() => handleSetDefault(m.id)}>
                            <Star className="h-3.5 w-3.5 mr-1" /> Set Default
                          </Button>
                        )}
                        {m.isDefault && (
                          <Button variant="ghost" size="sm" disabled>
                            <StarOff className="h-3.5 w-3.5 mr-1 text-gray-300" /> Default
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(m.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Payment Method Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Payment Method">
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Select
              value={newMethod.type}
              onChange={e => setNewMethod(prev => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'card', label: '💳 Credit / Debit Card' },
                { value: 'ach', label: '🏦 ACH Bank Transfer' },
                { value: 'paypal', label: '🅿️ PayPal' },
              ]}
            />
          </div>

          {newMethod.type === 'card' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Card Brand</label>
                  <Select
                    value={newMethod.cardBrand}
                    onChange={e => setNewMethod(prev => ({ ...prev, cardBrand: e.target.value }))}
                    options={[
                      { value: 'visa', label: 'Visa' },
                      { value: 'mastercard', label: 'Mastercard' },
                      { value: 'amex', label: 'American Express' },
                      { value: 'discover', label: 'Discover' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last 4 Digits</label>
                  <Input
                    maxLength={4}
                    placeholder="4242"
                    value={newMethod.cardLast4}
                    onChange={e => setNewMethod(prev => ({ ...prev, cardLast4: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Exp Month</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="MM"
                    value={newMethod.cardExpMonth}
                    onChange={e => setNewMethod(prev => ({ ...prev, cardExpMonth: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exp Year</label>
                  <Input
                    type="number"
                    min={2026}
                    max={2040}
                    placeholder="YYYY"
                    value={newMethod.cardExpYear}
                    onChange={e => setNewMethod(prev => ({ ...prev, cardExpYear: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}

          {newMethod.type === 'ach' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <Input
                  placeholder="Bank of America"
                  value={newMethod.bankName}
                  onChange={e => setNewMethod(prev => ({ ...prev, bankName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Account Last 4</label>
                  <Input
                    maxLength={4}
                    placeholder="1234"
                    value={newMethod.accountLast4}
                    onChange={e => setNewMethod(prev => ({ ...prev, accountLast4: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Routing Last 4</label>
                  <Input
                    maxLength={4}
                    placeholder="5678"
                    value={newMethod.routingLast4}
                    onChange={e => setNewMethod(prev => ({ ...prev, routingLast4: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
              </div>
            </>
          )}

          {newMethod.type === 'paypal' && (
            <div>
              <label className="block text-sm font-medium mb-1">PayPal Email</label>
              <Input
                type="email"
                placeholder="customer@example.com"
                value={newMethod.paypalEmail}
                onChange={e => setNewMethod(prev => ({ ...prev, paypalEmail: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Custom Label (optional)</label>
            <Input
              placeholder="Auto-generated if blank"
              value={newMethod.label}
              onChange={e => setNewMethod(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Payment Method
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
