'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useTenant } from '@/components/tenant-provider';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Users,
  Package,
  Check,
  Loader2,
  Building2,
  Phone,
  Star,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface Store {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  isDefault: boolean;
  _count: { users: number; customers: number; packages: number };
}

interface StoreFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: StoreFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  isDefault: false,
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function LocationsPage() {
  const { localUser } = useTenant();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState<StoreFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = localUser?.role === 'superadmin' || localUser?.role === 'admin';

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores || []);
      }
    } catch (err) {
      console.error('Failed to fetch stores', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleOpenNew = () => {
    setEditingStore(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (store: Store) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      zipCode: store.zipCode || '',
      phone: store.phone || '',
      isDefault: store.isDefault,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingStore ? 'PATCH' : 'POST';
      const body = editingStore ? { id: editingStore.id, ...form } : form;

      const res = await fetch('/api/stores', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        fetchStores();
      }
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return;
    try {
      await fetch(`/api/stores?id=${id}`, { method: 'DELETE' });
      fetchStores();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Locations"
        description="Manage multiple store locations for your business"
        icon={<MapPin className="h-6 w-6" />}
        actions={
          isAdmin && (
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
        </div>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-surface-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-300 mb-2">No Locations Yet</h3>
            <p className="text-sm text-surface-500 mb-4">
              Add your first store location to get started with multi-store management.
            </p>
            {isAdmin && (
              <Button onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Location
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary-500" />
                    <CardTitle className="text-base">{store.name}</CardTitle>
                  </div>
                  {store.isDefault && (
                    <Badge variant="default" className="text-[10px]">
                      <Star className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(store.address || store.city) && (
                  <p className="text-sm text-surface-400">
                    {store.address && <span>{store.address}<br /></span>}
                    {store.city && store.state && (
                      <span>{store.city}, {store.state} {store.zipCode}</span>
                    )}
                  </p>
                )}

                {store.phone && (
                  <div className="flex items-center gap-2 text-sm text-surface-400">
                    <Phone className="h-3.5 w-3.5" />
                    {store.phone}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-surface-500 pt-2 border-t border-surface-800">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {store._count.users} users
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {store._count.customers} customers
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {store._count.packages} packages
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(store)}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    {!store.isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(store.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingStore ? 'Edit Location' : 'Add New Location'}
      >
        <div className="space-y-4 py-2">
          <Input
            label="Store Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Main Store"
            required
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="123 Main St"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="New York"
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="NY"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ZIP Code"
              value={form.zipCode}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
              placeholder="10001"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 555-5555"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                form.isDefault ? 'bg-primary-600' : 'bg-surface-700'
              }`}
              onClick={() => setForm({ ...form, isDefault: !form.isDefault })}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
                  form.isDefault ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="text-sm text-surface-200">Set as default location</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {editingStore ? 'Update' : 'Create'} Location
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
