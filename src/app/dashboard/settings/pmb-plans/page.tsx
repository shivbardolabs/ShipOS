'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency } from '@/lib/utils';
import {
  Crown,
  Plus,
  Edit3,
  Save,
  Trash2,
  DollarSign,
  Users,
  Package,
  Mail,
  ScanLine,
  Truck,
  Archive,
  Loader2,
  TrendingUp,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface PlanTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  annualDiscountPct: number;
  includedMailItems: number;
  includedScans: number;
  freeStorageDays: number;
  includedForwarding: number;
  includedShredding: number;
  maxRecipients: number;
  maxPackagesPerMonth: number;
  overageMailRate: number;
  overageScanRate: number;
  overageStorageRate: number;
  overageForwardingRate: number;
  overagePackageRate: number;
  sortOrder: number;
}

interface AddOn {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number | null;
  unit: string;
  quotaType: string | null;
  quotaAmount: number;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function PmbPlansPage() {
  const { localUser } = useTenant();
  const isAdmin = localUser?.role === 'superadmin' || localUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState('tiers');
  const [tiers, setTiers] = useState<PlanTier[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tierModal, setTierModal] = useState<{ open: boolean; tier: PlanTier | null }>({ open: false, tier: null });
  const [addOnModal, setAddOnModal] = useState<{ open: boolean; addOn: AddOn | null }>({ open: false, addOn: null });
  const [editForm, setEditForm] = useState<Partial<PlanTier>>({});
  const [addOnForm, setAddOnForm] = useState<Partial<AddOn>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tierRes, addOnRes] = await Promise.all([
        fetch('/api/pmb/plan-tiers'),
        fetch('/api/pmb/add-ons'),
      ]);
      if (tierRes.ok) {
        const data = await tierRes.json();
        setTiers(data.tiers ?? []);
      }
      if (addOnRes.ok) {
        const data = await addOnRes.json();
        setAddOns(data.addOns ?? []);
      }
    } catch (err) {
      console.error('Failed to load PMB plans:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveTier = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pmb/plan-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setTierModal({ open: false, tier: null });
        fetchData();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const saveAddOn = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pmb/add-ons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addOnForm),
      });
      if (res.ok) {
        setAddOnModal({ open: false, addOn: null });
        fetchData();
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const deleteTier = async (id: string) => {
    if (!confirm('Deactivate this plan tier?')) return;
    await fetch('/api/pmb/plan-tiers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const openTierEdit = (tier: PlanTier | null) => {
    setEditForm(tier ? { ...tier } : { name: '', slug: '', priceMonthly: 0, priceAnnual: 0, annualDiscountPct: 0, sortOrder: tiers.length });
    setTierModal({ open: true, tier });
  };

  const openAddOnEdit = (addOn: AddOn | null) => {
    setAddOnForm(addOn ? { ...addOn } : { name: '', slug: '', priceMonthly: 0, unit: 'month', quotaAmount: 0 });
    setAddOnModal({ open: true, addOn });
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
        title="PMB Plan Configuration"
        description="Manage subscription tiers, add-ons, and pricing for CUSTOMER PMB plans"
        icon={<Crown className="h-6 w-6" />}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Crown className="h-5 w-5" />} title="Active Tiers" value={tiers.length} />
        <StatCard icon={<Package className="h-5 w-5" />} title="Add-ons Available" value={addOns.length} />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Price Range"
          value={tiers.length > 0 ? `${formatCurrency(tiers[0].priceMonthly)} – ${formatCurrency(tiers[tiers.length - 1].priceMonthly)}` : '—'}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Avg Annual Discount"
          value={tiers.length > 0 ? `${Math.round(tiers.reduce((s, t) => s + t.annualDiscountPct, 0) / tiers.length)}%` : '—'}
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'tiers', label: 'Plan Tiers', icon: <Crown className="h-3.5 w-3.5" /> },
          { id: 'addons', label: 'Add-ons', icon: <Plus className="h-3.5 w-3.5" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Plan Tiers Tab */}
      <TabPanel active={activeTab === 'tiers'}>
        {isAdmin && (
          <div className="flex justify-end mb-4">
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openTierEdit(null)}>
              Add Plan Tier
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <Card key={tier.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" iconOnly onClick={() => openTierEdit(tier)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" iconOnly onClick={() => deleteTier(tier.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-surface-100">{formatCurrency(tier.priceMonthly)}</span>
                    <span className="text-sm text-surface-400">/mo</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-surface-400">{formatCurrency(tier.priceAnnual)}/yr</span>
                    {tier.annualDiscountPct > 0 && (
                      <Badge variant="success">Save {tier.annualDiscountPct}%</Badge>
                    )}
                  </div>
                </div>

                {/* Quotas */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-surface-300">
                    <Mail className="h-3.5 w-3.5 text-surface-500" />
                    <span>{tier.includedMailItems === 0 ? 'Unlimited' : tier.includedMailItems} mail items/mo</span>
                  </div>
                  <div className="flex items-center gap-2 text-surface-300">
                    <ScanLine className="h-3.5 w-3.5 text-surface-500" />
                    <span>{tier.includedScans} scan pages/mo</span>
                  </div>
                  <div className="flex items-center gap-2 text-surface-300">
                    <Archive className="h-3.5 w-3.5 text-surface-500" />
                    <span>{tier.freeStorageDays} days free storage</span>
                  </div>
                  <div className="flex items-center gap-2 text-surface-300">
                    <Truck className="h-3.5 w-3.5 text-surface-500" />
                    <span>{tier.includedForwarding} forwarding/mo</span>
                  </div>
                  <div className="flex items-center gap-2 text-surface-300">
                    <Package className="h-3.5 w-3.5 text-surface-500" />
                    <span>{tier.maxPackagesPerMonth === 0 ? 'Unlimited' : tier.maxPackagesPerMonth} packages/mo</span>
                  </div>
                  <div className="flex items-center gap-2 text-surface-300">
                    <Users className="h-3.5 w-3.5 text-surface-500" />
                    <span>{tier.maxRecipients} recipient{tier.maxRecipients !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Overage Rates */}
                <div className="pt-2 border-t border-surface-800">
                  <p className="text-xs font-medium text-surface-500 uppercase mb-2">Overage Rates</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-surface-400">
                    <span>Mail: {formatCurrency(tier.overageMailRate)}/ea</span>
                    <span>Scan: {formatCurrency(tier.overageScanRate)}/pg</span>
                    <span>Storage: {formatCurrency(tier.overageStorageRate)}/day</span>
                    <span>Fwd: {formatCurrency(tier.overageForwardingRate)}/ea</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabPanel>

      {/* Add-ons Tab */}
      <TabPanel active={activeTab === 'addons'}>
        {isAdmin && (
          <div className="flex justify-end mb-4">
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openAddOnEdit(null)}>
              Add Add-on
            </Button>
          </div>
        )}

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase">Add-on</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-surface-500 uppercase">Monthly</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-surface-500 uppercase">Annual</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-surface-500 uppercase">Quota Bonus</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {addOns.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-surface-100">{a.name}</div>
                      {a.description && <div className="text-xs text-surface-400 mt-0.5">{a.description}</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-surface-100">{formatCurrency(a.priceMonthly)}</td>
                    <td className="px-3 py-3 text-right text-surface-300">
                      {a.priceAnnual ? formatCurrency(a.priceAnnual) : '—'}
                    </td>
                    <td className="px-3 py-3 text-surface-300">
                      {a.quotaType ? `+${a.quotaAmount} ${a.quotaType}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin && (
                        <Button size="sm" variant="ghost" iconOnly onClick={() => openAddOnEdit(a)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {addOns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-surface-500">
                      No add-ons configured yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </TabPanel>

      {/* Edit Tier Modal */}
      <Modal open={tierModal.open} onClose={() => setTierModal({ open: false, tier: null })} title={tierModal.tier ? `Edit Tier — ${tierModal.tier.name}` : 'New Plan Tier'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="Slug" value={editForm.slug ?? ''} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Monthly Price ($)" type="number" step="0.01" value={String(editForm.priceMonthly ?? '')} onChange={(e) => setEditForm({ ...editForm, priceMonthly: parseFloat(e.target.value) || 0 })} />
            <Input label="Annual Price ($)" type="number" step="0.01" value={String(editForm.priceAnnual ?? '')} onChange={(e) => setEditForm({ ...editForm, priceAnnual: parseFloat(e.target.value) || 0 })} />
            <Input label="Annual Discount (%)" type="number" step="0.1" value={String(editForm.annualDiscountPct ?? '')} onChange={(e) => setEditForm({ ...editForm, annualDiscountPct: parseFloat(e.target.value) || 0 })} />
          </div>
          <h4 className="text-sm font-semibold text-surface-200 pt-2">Service Quotas</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Mail Items/mo" type="number" value={String(editForm.includedMailItems ?? '')} onChange={(e) => setEditForm({ ...editForm, includedMailItems: parseInt(e.target.value) || 0 })} />
            <Input label="Scan Pages/mo" type="number" value={String(editForm.includedScans ?? '')} onChange={(e) => setEditForm({ ...editForm, includedScans: parseInt(e.target.value) || 0 })} />
            <Input label="Free Storage Days" type="number" value={String(editForm.freeStorageDays ?? '')} onChange={(e) => setEditForm({ ...editForm, freeStorageDays: parseInt(e.target.value) || 0 })} />
            <Input label="Forwarding/mo" type="number" value={String(editForm.includedForwarding ?? '')} onChange={(e) => setEditForm({ ...editForm, includedForwarding: parseInt(e.target.value) || 0 })} />
            <Input label="Shredding/mo" type="number" value={String(editForm.includedShredding ?? '')} onChange={(e) => setEditForm({ ...editForm, includedShredding: parseInt(e.target.value) || 0 })} />
            <Input label="Max Packages/mo" type="number" value={String(editForm.maxPackagesPerMonth ?? '')} onChange={(e) => setEditForm({ ...editForm, maxPackagesPerMonth: parseInt(e.target.value) || 0 })} />
          </div>
          <h4 className="text-sm font-semibold text-surface-200 pt-2">Overage Rates</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Mail ($/item)" type="number" step="0.01" value={String(editForm.overageMailRate ?? '')} onChange={(e) => setEditForm({ ...editForm, overageMailRate: parseFloat(e.target.value) || 0 })} />
            <Input label="Scan ($/page)" type="number" step="0.01" value={String(editForm.overageScanRate ?? '')} onChange={(e) => setEditForm({ ...editForm, overageScanRate: parseFloat(e.target.value) || 0 })} />
            <Input label="Storage ($/day)" type="number" step="0.01" value={String(editForm.overageStorageRate ?? '')} onChange={(e) => setEditForm({ ...editForm, overageStorageRate: parseFloat(e.target.value) || 0 })} />
            <Input label="Forwarding ($/ea)" type="number" step="0.01" value={String(editForm.overageForwardingRate ?? '')} onChange={(e) => setEditForm({ ...editForm, overageForwardingRate: parseFloat(e.target.value) || 0 })} />
            <Input label="Package ($/ea)" type="number" step="0.01" value={String(editForm.overagePackageRate ?? '')} onChange={(e) => setEditForm({ ...editForm, overagePackageRate: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setTierModal({ open: false, tier: null })}>Cancel</Button>
            <Button leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} onClick={saveTier} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Add-on Modal */}
      <Modal open={addOnModal.open} onClose={() => setAddOnModal({ open: false, addOn: null })} title={addOnModal.addOn ? `Edit Add-on — ${addOnModal.addOn.name}` : 'New Add-on'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={addOnForm.name ?? ''} onChange={(e) => setAddOnForm({ ...addOnForm, name: e.target.value })} />
            <Input label="Slug" value={addOnForm.slug ?? ''} onChange={(e) => setAddOnForm({ ...addOnForm, slug: e.target.value })} />
          </div>
          <Input label="Description" value={addOnForm.description ?? ''} onChange={(e) => setAddOnForm({ ...addOnForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monthly Price ($)" type="number" step="0.01" value={String(addOnForm.priceMonthly ?? '')} onChange={(e) => setAddOnForm({ ...addOnForm, priceMonthly: parseFloat(e.target.value) || 0 })} />
            <Input label="Annual Price ($)" type="number" step="0.01" value={String(addOnForm.priceAnnual ?? '')} onChange={(e) => setAddOnForm({ ...addOnForm, priceAnnual: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quota Type" value={addOnForm.quotaType ?? ''} onChange={(e) => setAddOnForm({ ...addOnForm, quotaType: e.target.value })} placeholder="e.g. scans, forwarding" />
            <Input label="Quota Amount" type="number" value={String(addOnForm.quotaAmount ?? '')} onChange={(e) => setAddOnForm({ ...addOnForm, quotaAmount: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddOnModal({ open: false, addOn: null })}>Cancel</Button>
            <Button leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} onClick={saveAddOn} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
