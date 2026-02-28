'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Building2,
  Plus,
  Pencil,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Upload,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  AlertTriangle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ClientStore {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: 'active' | 'inactive';
  cmraProof: string | null;
}

interface ClientAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'pending' | 'inactive';
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  status: 'active' | 'inactive' | 'paused';
  subscriptionFee: number;
  feeOverrideReason: string | null;
  paymentMethod: string | null;
  stores: ClientStore[];
  admins: ClientAdmin[];
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Data is fetched from /api/super-admin/clients                             */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusVariant = (s: string) => {
  if (s === 'active') return 'success' as const;
  if (s === 'paused') return 'warning' as const;
  if (s === 'pending') return 'info' as const;
  return 'muted' as const;
};

/* -------------------------------------------------------------------------- */
/*  Client Provisioning Page (BAR-231)                                        */
/* -------------------------------------------------------------------------- */
export default function ClientProvisioningPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const fetchClients = useCallback((searchQuery?: string, statusQuery?: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusQuery && statusQuery !== 'all') params.set('status', statusQuery);
    fetch(`/api/super-admin/clients?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .catch((err) => console.error('Failed to fetch clients:', err))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [, setActiveStoreClient] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [, setActiveAdminClient] = useState<string | null>(null);

  // Filter clients
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.firstName.toLowerCase().includes(search.toLowerCase()) ||
        c.lastName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active').length;
    const totalStores = clients.reduce((s, c) => s + c.stores.length, 0);
    const activeStores = clients.reduce((s, c) => s + c.stores.filter((st) => st.status === 'active').length, 0);
    return { total: clients.length, active, totalStores, activeStores };
  }, [clients]);

  const toggleStatus = useCallback((clientId: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const newStatus = c.status === 'active' ? 'inactive' : 'active';
        return { ...c, status: newStatus, updatedAt: new Date().toISOString() };
      })
    );
  }, []);

  const toggleStoreStatus = useCallback((clientId: string, storeId: string) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        return {
          ...c,
          stores: c.stores.map((s) =>
            s.id === storeId ? { ...s, status: s.status === 'active' ? 'inactive' as const : 'active' as const } : s
          ),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  if (clientsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Client Provisioning"
          description="Create, configure, and manage mailbox platform client accounts"
          icon={<Building2 className="h-6 w-6" />}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-7 w-12 rounded bg-surface-800" />
              <div className="mt-1 h-4 w-20 rounded bg-surface-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Provisioning"
        description="Create, configure, and manage mailbox platform client accounts"
        icon={<Building2 className="h-6 w-6" />}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            New Client
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-surface-100">{stats.total}</p>
          <p className="text-xs text-surface-400">Total Clients</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          <p className="text-xs text-surface-400">Active Clients</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-surface-100">{stats.totalStores}</p>
          <p className="text-xs text-surface-400">Total Stores</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.activeStores}</p>
          <p className="text-xs text-surface-400">Active Stores</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent>
              <p className="text-center text-sm text-surface-400 py-8">No clients found matching your criteria.</p>
            </CardContent>
          </Card>
        )}

        {filtered.map((client) => {
          const isExpanded = expandedId === client.id;
          const activeStoreCount = client.stores.filter((s) => s.status === 'active').length;
          const monthlyRevenue = client.subscriptionFee * activeStoreCount;

          return (
            <Card key={client.id} padding="none">
              {/* Client Header Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-800/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : client.id)}
              >
                <div className="text-surface-500">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-surface-100">{client.companyName}</h3>
                    <Badge variant={statusVariant(client.status)} dot>{client.status}</Badge>
                    {client.feeOverrideReason && (
                      <Badge variant="warning" dot={false}>Custom Fee</Badge>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {client.firstName} {client.lastName} · {client.email} · {client.phone}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <p className="font-semibold text-surface-200">{activeStoreCount}/{client.stores.length}</p>
                    <p className="text-surface-500">Stores</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-surface-200">${client.subscriptionFee}/store</p>
                    <p className="text-surface-500">Fee</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-400">${monthlyRevenue.toFixed(2)}</p>
                    <p className="text-surface-500">MRR</p>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    title={client.status === 'active' ? 'Deactivate' : 'Activate'}
                    onClick={() => toggleStatus(client.id)}
                  >
                    {client.status === 'active' ? <Pause className="h-3.5 w-3.5 text-yellow-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    title="Edit client"
                    onClick={() => setEditClient(client)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-surface-800 px-5 py-4 space-y-5">
                  {/* Contact & Payment */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium text-surface-500 uppercase mb-1">Contact</p>
                      <p className="text-sm text-surface-200">{client.firstName} {client.lastName}</p>
                      <p className="text-sm text-surface-400">{client.email}</p>
                      <p className="text-sm text-surface-400">{client.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-surface-500 uppercase mb-1">Payment</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-surface-500" />
                        <p className="text-sm text-surface-200">{client.paymentMethod || 'No payment method'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-surface-500 uppercase mb-1">Subscription</p>
                      <p className="text-sm text-surface-200">${client.subscriptionFee}/store/month</p>
                      {client.feeOverrideReason && (
                        <p className="text-xs text-yellow-400 mt-0.5">
                          <AlertTriangle className="inline h-3 w-3 mr-1" />
                          {client.feeOverrideReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stores */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-surface-500 uppercase">
                        Stores ({client.stores.length})
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => { setActiveStoreClient(client.id); setShowStoreModal(true); }}
                      >
                        Add Store
                      </Button>
                    </div>
                    {client.stores.length === 0 ? (
                      <p className="text-sm text-surface-500">No stores configured yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-surface-500 uppercase border-b border-surface-800">
                              <th className="text-left py-2 font-medium">Store</th>
                              <th className="text-left py-2 font-medium">Address</th>
                              <th className="text-left py-2 font-medium">CMRA Proof</th>
                              <th className="text-left py-2 font-medium">Status</th>
                              <th className="text-right py-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {client.stores.map((store) => (
                              <tr key={store.id} className="border-b border-surface-800/50">
                                <td className="py-2.5">
                                  <span className="font-medium text-surface-200">{store.name}</span>
                                </td>
                                <td className="py-2.5 text-surface-400">
                                  {store.address}, {store.city}, {store.state} {store.zipCode}
                                </td>
                                <td className="py-2.5">
                                  {store.cmraProof ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Uploaded
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-surface-500">
                                      <XCircle className="h-3.5 w-3.5" />
                                      Missing
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <Badge variant={statusVariant(store.status)} dot>{store.status}</Badge>
                                </td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      iconOnly
                                      title={store.status === 'active' ? 'Deactivate store' : 'Activate store'}
                                      onClick={() => toggleStoreStatus(client.id, store.id)}
                                      disabled={store.status !== 'active' && !store.cmraProof}
                                    >
                                      {store.status === 'active' ? (
                                        <Pause className="h-3.5 w-3.5 text-yellow-400" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5 text-emerald-400" />
                                      )}
                                    </Button>
                                    <Button variant="ghost" size="sm" iconOnly title="Edit store">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Client Admins */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-surface-500 uppercase">
                        Client Admin Users ({client.admins.length})
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => { setActiveAdminClient(client.id); setShowAdminModal(true); }}
                      >
                        Add Admin
                      </Button>
                    </div>
                    {client.admins.length === 0 ? (
                      <p className="text-sm text-surface-500">No admin users configured yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {client.admins.map((admin) => (
                          <div key={admin.id} className="flex items-center gap-3 rounded-lg bg-surface-800/50 px-3 py-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold">
                              {admin.firstName[0]}{admin.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-200 truncate">
                                {admin.firstName} {admin.lastName}
                              </p>
                              <p className="text-xs text-surface-500 truncate">{admin.email}</p>
                            </div>
                            <Badge variant={statusVariant(admin.status)} dot>{admin.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-surface-500 pt-2 border-t border-surface-800/50">
                    <span>Created {formatDate(client.createdAt)}</span>
                    <span>·</span>
                    <span>Updated {formatDate(client.updatedAt)}</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Client Modal */}
      <Modal
        open={showCreateModal || editClient !== null}
        onClose={() => { setShowCreateModal(false); setEditClient(null); }}
        title={editClient ? 'Edit Client' : 'Provision New Client'}
        description={editClient ? 'Update client account details' : 'Create a new client account for the mailbox platform'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreateModal(false); setEditClient(null); }}>
              Cancel
            </Button>
            <Button onClick={() => { setShowCreateModal(false); setEditClient(null); }}>
              {editClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="First Name" placeholder="John" required defaultValue={editClient?.firstName || ''} />
            <Input label="Last Name" placeholder="Smith" required defaultValue={editClient?.lastName || ''} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" placeholder="john@example.com" required defaultValue={editClient?.email || ''} />
            <Input label="Phone" type="tel" placeholder="(555) 123-4567" required defaultValue={editClient?.phone || ''} />
          </div>
          <Input label="Company Name" placeholder="Pack & Ship Plus" required defaultValue={editClient?.companyName || ''} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Subscription Fee ($/store/month)"
              type="number"
              placeholder="125"
              defaultValue={editClient?.subscriptionFee?.toString() || '125'}
            />
            <Input
              label="Fee Override Reason"
              placeholder="Leave blank for default pricing"
              defaultValue={editClient?.feeOverrideReason || ''}
              helperText="Required if fee differs from $125"
            />
          </div>
          <div className="rounded-lg border border-dashed border-surface-700 p-4">
            <p className="text-sm font-medium text-surface-300 mb-2">Payment Method</p>
            <p className="text-xs text-surface-500 mb-3">
              Payment information is securely processed via Stripe. Card details are never stored directly.
            </p>
            <div className="rounded-lg border border-surface-700 bg-surface-800/50 p-4 text-center">
              <CreditCard className="h-8 w-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-400">Stripe Elements payment form placeholder</p>
              <p className="text-xs text-surface-500 mt-1">Secure card input will be embedded here</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Store Modal */}
      <Modal
        open={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        title="Add Store"
        description="Add a new store to this client account"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowStoreModal(false)}>Cancel</Button>
            <Button onClick={() => setShowStoreModal(false)}>Add Store</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Store Name" placeholder="Downtown Location" required />
          <Input label="Street Address" placeholder="123 Main St" required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="City" placeholder="New York" required />
            <Input label="State" placeholder="NY" required />
            <Input label="ZIP Code" placeholder="10001" required />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-300 mb-2">CMRA Proof (Form 1583-A)</p>
            <div className="rounded-lg border border-dashed border-surface-700 p-6 text-center">
              <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" />
              <p className="text-sm text-surface-400">Drop file here or click to upload</p>
              <p className="text-xs text-surface-500 mt-1">PDF, JPG, or PNG · Max 10MB</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Client Admin Modal */}
      <Modal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title="Add Client Admin"
        description="Create an admin user for this client's platform instance"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdminModal(false)}>Cancel</Button>
            <Button onClick={() => setShowAdminModal(false)}>Create Admin</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="First Name" placeholder="Jane" required />
            <Input label="Last Name" placeholder="Doe" required />
          </div>
          <Input label="Email" type="email" placeholder="jane@company.com" required helperText="An invitation email will be sent when the client account is activated" />
        </div>
      </Modal>
    </div>
  );
}
