'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ACTION_CATEGORIES, SEGMENT_OPTIONS } from '@/lib/action-pricing-db';
import {
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Users,
  User,
  Building2,
  TrendingUp,
  Package,
  Mail,
  Truck,
  FileText,
  Stamp,
  Layers,
  AlertCircle,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ActionPriceOverride {
  id: string;
  action_price_id: string;
  target_type: string;
  target_value: string;
  target_label: string | null;
  retail_price: number | null;
  first_unit_price: number | null;
  additional_unit_price: number | null;
  cogs: number | null;
  cogs_first_unit: number | null;
  cogs_additional_unit: number | null;
}

interface ActionPrice {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  retail_price: number;
  unit_label: string;
  has_tiered_pricing: boolean;
  first_unit_price: number | null;
  additional_unit_price: number | null;
  cogs: number;
  cogs_first_unit: number | null;
  cogs_additional_unit: number | null;
  is_active: boolean;
  sort_order: number;
  overrides: ActionPriceOverride[];
}

interface CustomerInfo {
  id: string;
  firstName: string;
  lastName: string;
  pmbNumber: string;
  platform: string;
}

/* -------------------------------------------------------------------------- */
/*  Category icons                                                            */
/* -------------------------------------------------------------------------- */
const categoryIcons: Record<string, React.ElementType> = {
  mail: Mail,
  package: Package,
  shipping: Truck,
  scanning: FileText,
  notary: Stamp,
  general: Layers,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function fmt(v: number | null | undefined): string {
  if (v == null) return '\u2014';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function margin(price: number, cost: number): string {
  if (price === 0) return '\u2014';
  return `${(((price - cost) / price) * 100).toFixed(1)}%`;
}

/* -------------------------------------------------------------------------- */
/*  Form types                                                                */
/* -------------------------------------------------------------------------- */
interface ActionFormData {
  key: string;
  name: string;
  description: string;
  category: string;
  retailPrice: string;
  unitLabel: string;
  hasTieredPricing: boolean;
  firstUnitPrice: string;
  additionalUnitPrice: string;
  cogs: string;
  cogsFirstUnit: string;
  cogsAdditionalUnit: string;
}

const emptyForm: ActionFormData = {
  key: '',
  name: '',
  description: '',
  category: 'general',
  retailPrice: '0',
  unitLabel: 'per item',
  hasTieredPricing: false,
  firstUnitPrice: '',
  additionalUnitPrice: '',
  cogs: '0',
  cogsFirstUnit: '',
  cogsAdditionalUnit: '',
};

interface OverrideFormData {
  targetType: string;
  targetValue: string;
  targetLabel: string;
  retailPrice: string;
  firstUnitPrice: string;
  additionalUnitPrice: string;
  cogs: string;
  cogsFirstUnit: string;
  cogsAdditionalUnit: string;
}

/* -------------------------------------------------------------------------- */
/*  Create / Edit Action Modal                                                */
/* -------------------------------------------------------------------------- */
function ActionModal({
  open,
  onClose,
  onSave,
  saving,
  initial,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ActionFormData) => void;
  saving: boolean;
  initial: ActionFormData;
  mode: 'create' | 'edit';
}) {
  const [form, setForm] = useState<ActionFormData>(initial);

  useEffect(() => { setForm(initial); }, [initial]);

  const set = (field: keyof ActionFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Create New Action' : 'Edit Action'}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Action Key" placeholder="e.g. scan-document" value={form.key}
            onChange={(e) => set('key', e.target.value)} disabled={mode === 'edit'}
            helperText={mode === 'create' ? 'Unique identifier, cannot be changed later' : undefined} />
          <Input label="Action Name" placeholder="e.g. Document Scanning" value={form.name}
            onChange={(e) => set('name', e.target.value)} />
        </div>
        <Input label="Description" placeholder="What this action does..." value={form.description}
          onChange={(e) => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category"
            options={ACTION_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            value={form.category} onChange={(e) => set('category', e.target.value)} />
          <Input label="Unit Label" placeholder="per item, per page, per lb..."
            value={form.unitLabel} onChange={(e) => set('unitLabel', e.target.value)} />
        </div>

        {/* Tiered pricing toggle */}
        <div className="border border-surface-700 rounded-lg p-4 space-y-3">
          <button type="button" onClick={() => set('hasTieredPricing', !form.hasTieredPricing)}
            className="flex items-center gap-3 w-full text-left">
            {form.hasTieredPricing
              ? <ToggleRight className="h-5 w-5 text-primary-500" />
              : <ToggleLeft className="h-5 w-5 text-surface-500" />}
            <div>
              <span className="text-sm font-medium text-surface-200">Tiered Pricing</span>
              <p className="text-xs text-surface-500">
                Different price for first unit vs. additional units (e.g. first page $2, each additional $1)
              </p>
            </div>
          </button>

          {form.hasTieredPricing ? (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Retail Price</p>
                <Input label="First Unit" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.firstUnitPrice} onChange={(e) => set('firstUnitPrice', e.target.value)} />
                <Input label="Each Additional" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.additionalUnitPrice} onChange={(e) => set('additionalUnitPrice', e.target.value)} />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">COGS</p>
                <Input label="First Unit COGS" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.cogsFirstUnit} onChange={(e) => set('cogsFirstUnit', e.target.value)} />
                <Input label="Each Additional COGS" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.cogsAdditionalUnit} onChange={(e) => set('cogsAdditionalUnit', e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Input label="Retail Price" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.retailPrice} onChange={(e) => set('retailPrice', e.target.value)}
                leftIcon={<DollarSign className="h-4 w-4" />} />
              <Input label="COGS (Cost)" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.cogs} onChange={(e) => set('cogs', e.target.value)}
                leftIcon={<DollarSign className="h-4 w-4" />} />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-800">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} loading={saving}
          leftIcon={mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
          {mode === 'create' ? 'Create Action' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Override Modal                                                            */
/* -------------------------------------------------------------------------- */
function OverrideModal({
  open, onClose, onSave, saving, actionName, hasTieredPricing, customers,
}: {
  open: boolean; onClose: () => void; onSave: (data: OverrideFormData) => void;
  saving: boolean; actionName: string; hasTieredPricing: boolean; customers: CustomerInfo[];
}) {
  const [form, setForm] = useState<OverrideFormData>({
    targetType: 'segment', targetValue: '', targetLabel: '',
    retailPrice: '', firstUnitPrice: '', additionalUnitPrice: '',
    cogs: '', cogsFirstUnit: '', cogsAdditionalUnit: '',
  });

  const set = (field: keyof OverrideFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (form.targetType === 'segment') {
      const seg = SEGMENT_OPTIONS.find((s) => s.value === form.targetValue);
      if (seg) setForm((prev) => ({ ...prev, targetLabel: seg.label }));
    } else {
      const cust = customers.find((c) => c.id === form.targetValue);
      if (cust) setForm((prev) => ({ ...prev, targetLabel: `${cust.firstName} ${cust.lastName} (${cust.pmbNumber})` }));
    }
  }, [form.targetType, form.targetValue, customers]);

  if (!open) return null;

  const customerOptions = customers.map((c) => ({
    value: c.id, label: `${c.firstName} ${c.lastName} \u2014 ${c.pmbNumber}`,
  }));

  return (
    <Modal open={open} onClose={onClose} title={`Add Price Override \u2014 ${actionName}`}>
      <div className="space-y-4">
        <Select label="Override Level" options={[
          { value: 'segment', label: 'Segment (mailbox service / store)' },
          { value: 'customer', label: 'Individual Customer' },
        ]} value={form.targetType} onChange={(e) => { set('targetType', e.target.value); set('targetValue', ''); }} />

        {form.targetType === 'segment' ? (
          <Select label="Segment" placeholder="Select a segment..."
            options={SEGMENT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={form.targetValue} onChange={(e) => set('targetValue', e.target.value)} />
        ) : (
          <Select label="Customer" placeholder="Select a customer..."
            options={customerOptions} value={form.targetValue}
            onChange={(e) => set('targetValue', e.target.value)} />
        )}

        <div className="border border-surface-700 rounded-lg p-4">
          <p className="text-xs text-surface-500 mb-3">
            Leave blank to inherit from universal price. Only fill in values you want to override.
          </p>
          {hasTieredPricing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Retail Price</p>
                <Input label="First Unit" type="number" step="0.01" min="0" placeholder="inherit"
                  value={form.firstUnitPrice} onChange={(e) => set('firstUnitPrice', e.target.value)} />
                <Input label="Each Additional" type="number" step="0.01" min="0" placeholder="inherit"
                  value={form.additionalUnitPrice} onChange={(e) => set('additionalUnitPrice', e.target.value)} />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">COGS Override</p>
                <Input label="First Unit COGS" type="number" step="0.01" min="0" placeholder="inherit"
                  value={form.cogsFirstUnit} onChange={(e) => set('cogsFirstUnit', e.target.value)} />
                <Input label="Each Additional COGS" type="number" step="0.01" min="0" placeholder="inherit"
                  value={form.cogsAdditionalUnit} onChange={(e) => set('cogsAdditionalUnit', e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Retail Price Override" type="number" step="0.01" min="0" placeholder="inherit"
                value={form.retailPrice} onChange={(e) => set('retailPrice', e.target.value)}
                leftIcon={<DollarSign className="h-4 w-4" />} />
              <Input label="COGS Override" type="number" step="0.01" min="0" placeholder="inherit"
                value={form.cogs} onChange={(e) => set('cogs', e.target.value)}
                leftIcon={<DollarSign className="h-4 w-4" />} />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-800">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} loading={saving} disabled={!form.targetValue}
          leftIcon={<Plus className="h-4 w-4" />}>Add Override</Button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Action Row                                                                */
/* -------------------------------------------------------------------------- */
function ActionRow({
  action, onEdit, onDelete, onToggle, onAddOverride, onDeleteOverride,
}: {
  action: ActionPrice;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
  onAddOverride: () => void; onDeleteOverride: (overrideId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = categoryIcons[action.category] || Layers;
  const hasOverrides = action.overrides.length > 0;

  return (
    <div className="border border-surface-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <button className="flex-shrink-0 text-surface-500">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0 w-8">
          <Icon className="h-4 w-4 text-surface-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-surface-200">{action.name}</span>
            {!action.is_active && <Badge variant="muted" dot={false}>Inactive</Badge>}
            {hasOverrides && (
              <Badge variant="info" dot={false}>
                {action.overrides.length} override{action.overrides.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-xs text-surface-500 truncate mt-0.5">
            {action.key} &middot; {action.unit_label}
            {action.description && ` \u00b7 ${action.description}`}
          </p>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0 text-right">
          <div className="w-24">
            <p className="text-xs text-surface-500">Retail</p>
            {action.has_tiered_pricing ? (
              <p className="text-sm font-semibold text-surface-100">
                {fmt(action.first_unit_price)} / {fmt(action.additional_unit_price)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-surface-100">{fmt(action.retail_price)}</p>
            )}
          </div>
          <div className="w-24">
            <p className="text-xs text-surface-500">COGS</p>
            {action.has_tiered_pricing ? (
              <p className="text-sm font-medium text-surface-300">
                {fmt(action.cogs_first_unit)} / {fmt(action.cogs_additional_unit)}
              </p>
            ) : (
              <p className="text-sm font-medium text-surface-300">{fmt(action.cogs)}</p>
            )}
          </div>
          <div className="w-16">
            <p className="text-xs text-surface-500">Margin</p>
            <p className="text-sm font-medium text-emerald-400">
              {action.has_tiered_pricing
                ? margin(action.first_unit_price ?? 0, action.cogs_first_unit ?? 0)
                : margin(action.retail_price, action.cogs)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" iconOnly onClick={onToggle}
            title={action.is_active ? 'Deactivate' : 'Activate'}>
            {action.is_active
              ? <ToggleRight className="h-4 w-4 text-emerald-400" />
              : <ToggleLeft className="h-4 w-4 text-surface-500" />}
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={onEdit} title="Edit">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" iconOnly onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-surface-800 bg-surface-900/50 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Price Overrides</h4>
            <Button variant="ghost" size="sm" onClick={onAddOverride} leftIcon={<Plus className="h-3 w-3" />}>
              Add Override
            </Button>
          </div>
          {action.overrides.length === 0 ? (
            <p className="text-sm text-surface-500 py-2">
              No overrides &mdash; universal price applies to all segments and customers.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-3 text-xs text-surface-500 font-medium px-3 py-1">
                <div className="col-span-1">Type</div>
                <div className="col-span-3">Target</div>
                <div className="col-span-3 text-right">Retail Override</div>
                <div className="col-span-3 text-right">COGS Override</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {action.overrides.map((ov) => (
                <div key={ov.id}
                  className="grid grid-cols-12 gap-3 items-center px-3 py-2 rounded-lg bg-surface-800/40 text-sm">
                  <div className="col-span-1">
                    {ov.target_type === 'segment'
                      ? <Building2 className="h-4 w-4 text-amber-400" />
                      : <User className="h-4 w-4 text-blue-400" />}
                  </div>
                  <div className="col-span-3 text-surface-200 truncate">{ov.target_label || ov.target_value}</div>
                  <div className="col-span-3 text-right text-surface-200">
                    {action.has_tiered_pricing
                      ? `${fmt(ov.first_unit_price)} / ${fmt(ov.additional_unit_price)}`
                      : fmt(ov.retail_price)}
                  </div>
                  <div className="col-span-3 text-right text-surface-300">
                    {action.has_tiered_pricing
                      ? `${fmt(ov.cogs_first_unit)} / ${fmt(ov.cogs_additional_unit)}`
                      : fmt(ov.cogs)}
                  </div>
                  <div className="col-span-2 text-right">
                    <Button variant="ghost" size="sm" iconOnly onClick={() => onDeleteOverride(ov.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */
export default function ActionPricingPage() {
  const { localUser } = useTenant();
  const [prices, setPrices] = useState<ActionPrice[]>([]);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<{
    open: boolean; mode: 'create' | 'edit'; initial: ActionFormData; editId?: string;
  }>({ open: false, mode: 'create', initial: emptyForm });

  const [overrideModal, setOverrideModal] = useState<{
    open: boolean; actionId: string; actionName: string; hasTiered: boolean;
  }>({ open: false, actionId: '', actionName: '', hasTiered: false });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean; id: string; name: string;
  }>({ open: false, id: '', name: '' });

  // Guard: admin or superadmin only
  if (localUser && localUser.role !== 'admin' && localUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-surface-300">Access Restricted</h2>
          <p className="text-sm text-surface-500 mt-1">Action Pricing is available to administrators only.</p>
        </div>
      </div>
    );
  }

  /* eslint-disable react-hooks/rules-of-hooks */

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/action-pricing');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setPrices(data.prices || []);
      setCustomers(data.customers || []);
    } catch { setError('Failed to load pricing data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = { all: prices.length };
    for (const p of prices) { counts[p.category] = (counts[p.category] || 0) + 1; }
    return [
      { id: 'all', label: 'All Actions', count: counts.all },
      ...ACTION_CATEGORIES.filter((c) => counts[c.value]).map((c) => ({
        id: c.value, label: c.label, count: counts[c.value],
      })),
    ];
  }, [prices]);

  const filtered = useMemo(() => {
    let list = prices;
    if (activeTab !== 'all') list = list.filter((p) => p.category === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)));
    }
    return list;
  }, [prices, activeTab, search]);

  const stats = useMemo(() => {
    const active = prices.filter((p) => p.is_active);
    const totalOverrides = prices.reduce((s, p) => s + p.overrides.length, 0);
    const avgMargin = active.length > 0
      ? active.reduce((s, p) => {
          const price = p.has_tiered_pricing ? (p.first_unit_price ?? 0) : p.retail_price;
          const cost = p.has_tiered_pricing ? (p.cogs_first_unit ?? 0) : p.cogs;
          return s + (price > 0 ? ((price - cost) / price) * 100 : 0);
        }, 0) / active.length
      : 0;
    return { total: prices.length, active: active.length, overrides: totalOverrides, avgMargin };
  }, [prices]);

  const handleCreateAction = async (formData: ActionFormData) => {
    setSaving(true); setError(null);
    try {
      const body = {
        key: formData.key.trim().toLowerCase().replace(/\s+/g, '-'),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        unitLabel: formData.unitLabel,
        hasTieredPricing: formData.hasTieredPricing,
        retailPrice: parseFloat(formData.retailPrice) || 0,
        firstUnitPrice: formData.firstUnitPrice ? parseFloat(formData.firstUnitPrice) : undefined,
        additionalUnitPrice: formData.additionalUnitPrice ? parseFloat(formData.additionalUnitPrice) : undefined,
        cogs: parseFloat(formData.cogs) || 0,
        cogsFirstUnit: formData.cogsFirstUnit ? parseFloat(formData.cogsFirstUnit) : undefined,
        cogsAdditionalUnit: formData.cogsAdditionalUnit ? parseFloat(formData.cogsAdditionalUnit) : undefined,
      };
      const res = await fetch('/api/admin/action-pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create'); }
      setActionModal({ open: false, mode: 'create', initial: emptyForm });
      await fetchPrices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create action');
    } finally { setSaving(false); }
  };

  const handleEditAction = async (formData: ActionFormData) => {
    if (!actionModal.editId) return;
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = { id: actionModal.editId };
      body.name = formData.name.trim();
      body.description = formData.description.trim() || null;
      body.category = formData.category;
      body.unitLabel = formData.unitLabel;
      body.hasTieredPricing = formData.hasTieredPricing;
      body.retailPrice = parseFloat(formData.retailPrice) || 0;
      body.firstUnitPrice = formData.firstUnitPrice ? parseFloat(formData.firstUnitPrice) : null;
      body.additionalUnitPrice = formData.additionalUnitPrice ? parseFloat(formData.additionalUnitPrice) : null;
      body.cogs = parseFloat(formData.cogs) || 0;
      body.cogsFirstUnit = formData.cogsFirstUnit ? parseFloat(formData.cogsFirstUnit) : null;
      body.cogsAdditionalUnit = formData.cogsAdditionalUnit ? parseFloat(formData.cogsAdditionalUnit) : null;

      const res = await fetch('/api/admin/action-pricing', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update');
      setActionModal({ open: false, mode: 'create', initial: emptyForm });
      await fetchPrices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update action');
    } finally { setSaving(false); }
  };

  const handleDeleteAction = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/action-pricing', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });
      setDeleteConfirm({ open: false, id: '', name: '' });
      await fetchPrices();
    } catch { setError('Failed to delete action'); } finally { setSaving(false); }
  };

  const handleToggleActive = async (action: ActionPrice) => {
    try {
      await fetch('/api/admin/action-pricing', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: action.id, isActive: !action.is_active }),
      });
      await fetchPrices();
    } catch { setError('Failed to toggle action'); }
  };

  const handleAddOverride = async (formData: OverrideFormData) => {
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        actionPriceId: overrideModal.actionId,
        targetType: formData.targetType,
        targetValue: formData.targetValue,
        targetLabel: formData.targetLabel || undefined,
      };
      if (formData.retailPrice) body.retailPrice = parseFloat(formData.retailPrice);
      if (formData.firstUnitPrice) body.firstUnitPrice = parseFloat(formData.firstUnitPrice);
      if (formData.additionalUnitPrice) body.additionalUnitPrice = parseFloat(formData.additionalUnitPrice);
      if (formData.cogs) body.cogs = parseFloat(formData.cogs);
      if (formData.cogsFirstUnit) body.cogsFirstUnit = parseFloat(formData.cogsFirstUnit);
      if (formData.cogsAdditionalUnit) body.cogsAdditionalUnit = parseFloat(formData.cogsAdditionalUnit);

      const res = await fetch('/api/admin/action-pricing/overrides', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to add override');
      setOverrideModal({ open: false, actionId: '', actionName: '', hasTiered: false });
      await fetchPrices();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add override');
    } finally { setSaving(false); }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await fetch('/api/admin/action-pricing/overrides', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: overrideId }),
      });
      await fetchPrices();
    } catch { setError('Failed to delete override'); }
  };

  /* eslint-enable react-hooks/rules-of-hooks */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <DollarSign className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-100">Action Pricing</h1>
              <p className="text-sm text-surface-500">
                Set prices and COGS for every action. Override by segment or individual customer.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setActionModal({ open: true, mode: 'create', initial: emptyForm })}
          leftIcon={<Plus className="h-4 w-4" />}>New Action</Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100">{stats.total}</p>
              <p className="text-xs text-surface-400">Total Actions</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100">{stats.active}</p>
              <p className="text-xs text-surface-400">Active Actions</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100">{stats.overrides}</p>
              <p className="text-xs text-surface-400">Price Overrides</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-100">{stats.avgMargin.toFixed(1)}%</p>
              <p className="text-xs text-surface-400">Avg. Margin</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-4">
        <div className="w-72">
          <SearchInput placeholder="Search actions..." value={search} onSearch={setSearch} />
        </div>
        <div className="flex-1">
          <Tabs tabs={categoryTabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* Action list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-800/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-surface-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-300">
              {prices.length === 0 ? 'No actions yet' : 'No matching actions'}
            </h3>
            <p className="text-sm text-surface-500 mt-1">
              {prices.length === 0
                ? 'Create your first action to start setting prices and COGS.'
                : 'Try a different search or category filter.'}
            </p>
            {prices.length === 0 && (
              <Button className="mt-4"
                onClick={() => setActionModal({ open: true, mode: 'create', initial: emptyForm })}
                leftIcon={<Plus className="h-4 w-4" />}>Create First Action</Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((action) => (
            <ActionRow key={action.id} action={action}
              onEdit={() => setActionModal({
                open: true, mode: 'edit', editId: action.id,
                initial: {
                  key: action.key, name: action.name, description: action.description || '',
                  category: action.category, retailPrice: String(action.retail_price),
                  unitLabel: action.unit_label, hasTieredPricing: action.has_tiered_pricing,
                  firstUnitPrice: action.first_unit_price != null ? String(action.first_unit_price) : '',
                  additionalUnitPrice: action.additional_unit_price != null ? String(action.additional_unit_price) : '',
                  cogs: String(action.cogs), cogsFirstUnit: action.cogs_first_unit != null ? String(action.cogs_first_unit) : '',
                  cogsAdditionalUnit: action.cogs_additional_unit != null ? String(action.cogs_additional_unit) : '',
                },
              })}
              onDelete={() => setDeleteConfirm({ open: true, id: action.id, name: action.name })}
              onToggle={() => handleToggleActive(action)}
              onAddOverride={() => setOverrideModal({
                open: true, actionId: action.id, actionName: action.name, hasTiered: action.has_tiered_pricing,
              })}
              onDeleteOverride={handleDeleteOverride} />
          ))}
        </div>
      )}

      {/* Pricing hierarchy info */}
      <Card>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-surface-200">Pricing Hierarchy</h4>
            <p className="text-xs text-surface-500 mt-1">
              Prices cascade from most specific to least specific:{' '}
              <strong className="text-surface-300">Individual Customer</strong> &rarr;{' '}
              <strong className="text-surface-300">Segment</strong> (store, iPostal, Anytime, PostScan) &rarr;{' '}
              <strong className="text-surface-300">Universal</strong>. COGS are typically universal since costs are the same
              across all customers, but can be overridden per segment if needed.
            </p>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <ActionModal open={actionModal.open}
        onClose={() => setActionModal({ open: false, mode: 'create', initial: emptyForm })}
        onSave={actionModal.mode === 'create' ? handleCreateAction : handleEditAction}
        saving={saving} initial={actionModal.initial} mode={actionModal.mode} />

      <OverrideModal open={overrideModal.open}
        onClose={() => setOverrideModal({ open: false, actionId: '', actionName: '', hasTiered: false })}
        onSave={handleAddOverride} saving={saving} actionName={overrideModal.actionName}
        hasTieredPricing={overrideModal.hasTiered} customers={customers} />

      {deleteConfirm.open && (
        <Modal open={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, id: '', name: '' })} title="Delete Action">
          <p className="text-sm text-surface-300">
            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will also remove all price
            overrides for this action. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setDeleteConfirm({ open: false, id: '', name: '' })}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteAction} loading={saving}>Delete Action</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
