'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency } from '@/lib/utils';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Save,
  Loader2,
  Hash,
  TrendingUp,
  Clock,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  discountAppliesTo: string;
  startsAt: string;
  expiresAt: string | null;
  maxRedemptions: number;
  maxPerCustomer: number;
  applicableTierSlugs: string[] | null;
  isActive: boolean;
  redemptionCount: number;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function PromoCodesPage() {
  const { localUser } = useTenant();
  const isAdmin = localUser?.role === 'superadmin' || localUser?.role === 'admin';
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; promo: PromoCode | null }>({ open: false, promo: null });
  const [form, setForm] = useState<Record<string, string | number | boolean | null>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pmb/promo-codes');
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promoCodes ?? []);
      }
    } catch (err) {
      console.error('Failed to load promos:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const savePromo = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pmb/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModal({ open: false, promo: null });
        fetchData();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Deactivate this promo code?')) return;
    await fetch('/api/pmb/promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const openEdit = (promo: PromoCode | null) => {
    if (promo) {
      setForm({
        id: promo.id,
        code: promo.code,
        description: promo.description ?? '',
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAppliesTo: promo.discountAppliesTo,
        expiresAt: promo.expiresAt ? promo.expiresAt.split('T')[0] : '',
        maxRedemptions: promo.maxRedemptions,
        maxPerCustomer: promo.maxPerCustomer,
        isActive: promo.isActive,
      });
    } else {
      setForm({
        code: '',
        description: '',
        discountType: 'percent',
        discountValue: 10,
        discountAppliesTo: 'all',
        expiresAt: '',
        maxRedemptions: 0,
        maxPerCustomer: 1,
        isActive: true,
      });
    }
    setModal({ open: true, promo });
  };

  const activePromos = promos.filter((p) => p.isActive);
  const totalRedemptions = promos.reduce((s, p) => s + p.redemptionCount, 0);
  const expiringSoon = promos.filter((p) => {
    if (!p.expiresAt || !p.isActive) return false;
    const daysUntil = (new Date(p.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 7;
  });

  const discountLabel = (type: string, value: number) => {
    switch (type) {
      case 'percent': return `${value}% off`;
      case 'fixed_amount': return `${formatCurrency(value)} off`;
      case 'free_months': return `${value} mo free`;
      default: return String(value);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Promo Codes"
        description="Create and manage promotional pricing codes for CUSTOMER signups"
        icon={<Tag className="h-6 w-6" />}
        actions={
          isAdmin ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openEdit(null)}>
              Create Promo Code
            </Button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Tag className="h-5 w-5" />} title="Active Promos" value={activePromos.length} />
        <StatCard icon={<Hash className="h-5 w-5" />} title="Total Redemptions" value={totalRedemptions} />
        <StatCard icon={<Clock className="h-5 w-5" />} title="Expiring Soon" value={expiringSoon.length} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} title="Total Codes" value={promos.length} />
      </div>

      {/* Promo Codes Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase">Code</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-surface-500 uppercase">Discount</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-surface-500 uppercase">Applies To</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-surface-500 uppercase">Redemptions</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-surface-500 uppercase">Expires</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-surface-500 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {promos.map((p) => {
                const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date();
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-surface-100">{p.code}</span>
                      {p.description && <div className="text-xs text-surface-400 mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="info">{discountLabel(p.discountType, p.discountValue)}</Badge>
                    </td>
                    <td className="px-3 py-3 text-surface-300 capitalize">{p.discountAppliesTo.replace('_', ' ')}</td>
                    <td className="px-3 py-3 text-center text-surface-100">
                      {p.redemptionCount}{p.maxRedemptions > 0 ? ` / ${p.maxRedemptions}` : ''}
                    </td>
                    <td className="px-3 py-3 text-center text-surface-400">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={isExpired ? 'muted' : p.isActive ? 'success' : 'warning'}>
                        {isExpired ? 'Expired' : p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" iconOnly onClick={() => openEdit(p)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" iconOnly onClick={() => deletePromo(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {promos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-surface-500">
                    No promo codes yet — create one to get started
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit/Create Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, promo: null })}
        title={modal.promo ? `Edit — ${modal.promo.code}` : 'New Promo Code'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Promo Code"
            value={String(form.code ?? '')}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. WELCOME20"
          />
          <Input
            label="Description"
            value={String(form.description ?? '')}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Type"
              value={String(form.discountType ?? 'percent')}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              options={[
                { value: 'percent', label: 'Percentage (%)' },
                { value: 'fixed_amount', label: 'Fixed Amount ($)' },
                { value: 'free_months', label: 'Free Months' },
              ]}
            />
            <Input
              label="Discount Value"
              type="number"
              step="0.01"
              value={String(form.discountValue ?? '')}
              onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <Select
            label="Applies To"
            value={String(form.discountAppliesTo ?? 'all')}
            onChange={(e) => setForm({ ...form, discountAppliesTo: e.target.value })}
            options={[
              { value: 'all', label: 'All Billing Cycles' },
              { value: 'monthly', label: 'Monthly Only' },
              { value: 'annual', label: 'Annual Only' },
              { value: 'specific_tier', label: 'Specific Tier(s)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expires At"
              type="date"
              value={String(form.expiresAt ?? '')}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
            <Input
              label="Max Redemptions (0=∞)"
              type="number"
              value={String(form.maxRedemptions ?? '')}
              onChange={(e) => setForm({ ...form, maxRedemptions: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModal({ open: false, promo: null })}>Cancel</Button>
            <Button
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              onClick={savePromo}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
