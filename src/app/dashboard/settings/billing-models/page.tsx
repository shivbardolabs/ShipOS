'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTenant } from '@/components/tenant-provider';
import { formatCurrency } from '@/lib/utils';
import {
  Settings,
  CreditCard,
  BarChart3,
  Clock,
  Save,
  Plus,
  Trash2,
  Check,
  Loader2,
  Layers,
  Gauge,
  Zap,
  DollarSign,
  Edit3,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface BillingConfig {
  id: string;
  subscriptionEnabled: boolean;
  usageBasedEnabled: boolean;
  timeOfServiceEnabled: boolean;
  defaultBillingCycle: string;
  allowMidCycleChanges: boolean;
  prorateUpgrades: boolean;
  prorateDowngrades: boolean;
  autoRenew: boolean;
  gracePeriodDays: number;
  usageResetCycle: string;
  usageAlertThreshold: number;
  overage: string;
  usageInvoiceCycle: string;
  tosDefaultMode: string;
  tosPaymentWindow: number;
  tosAutoInvoice: boolean;
}

interface RateTier {
  upTo: number | null;
  rate: number;
}

interface UsageMeter {
  id: string;
  name: string;
  slug: string;
  unit: string;
  description: string | null;
  rateTiers: RateTier[];
  includedQuantity: number;
  hardLimit: number;
  isActive: boolean;
  sortOrder: number;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

/* -------------------------------------------------------------------------- */
/*  Toggle Switch                                                             */
/* -------------------------------------------------------------------------- */
function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-surface-700'
        }`}
      >
        <div
          className={`h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {(label || description) && (
        <div>
          {label && <span className="text-sm text-surface-200">{label}</span>}
          {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
        </div>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function BillingModelsPage() {
  const { localUser } = useTenant();
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [meters, setMeters] = useState<UsageMeter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMeterModal, setShowMeterModal] = useState(false);
  const [editingMeter, setEditingMeter] = useState<UsageMeter | null>(null);

  const isAdmin = localUser?.role === 'superadmin' || localUser?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/billing-models');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setMeters(data.meters || []);
      }
    } catch (err) {
      console.error('Failed to load billing config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/billing-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof BillingConfig, value: unknown) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex justify-center items-center py-24">
        <p className="text-surface-500">Failed to load billing configuration</p>
      </div>
    );
  }

  const enabledCount = [
    config.subscriptionEnabled,
    config.usageBasedEnabled,
    config.timeOfServiceEnabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Model Configuration"
        description="Configure which billing models apply to your services and customers."
        icon={<Settings className="h-6 w-6" />}
      />

      {/* ── Model Selection ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-600" />
            Active Billing Models
            <Badge variant={enabledCount > 0 ? 'success' : 'warning'} dot={false} className="text-xs ml-2">
              {enabledCount} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-surface-400 mb-6">
            Enable the billing models you want to use. Models can be combined — for example,
            a customer can have a monthly subscription plus usage-based charges for overages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subscription */}
            <button
              type="button"
              onClick={() => isAdmin && updateConfig('subscriptionEnabled', !config.subscriptionEnabled)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                config.subscriptionEnabled
                  ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500/20'
                  : 'border-surface-700 bg-surface-900 hover:border-surface-600'
              }`}
            >
              {config.subscriptionEnabled && (
                <div className="absolute top-3 right-3">
                  <Check className="h-5 w-5 text-primary-500" />
                </div>
              )}
              <div className={`p-2.5 rounded-lg w-fit mb-3 ${
                config.subscriptionEnabled ? 'bg-primary-500/20' : 'bg-surface-800'
              }`}>
                <CreditCard className={`h-5 w-5 ${
                  config.subscriptionEnabled ? 'text-primary-500' : 'text-surface-400'
                }`} />
              </div>
              <h3 className="font-semibold text-surface-100 mb-1">Subscription</h3>
              <p className="text-xs text-surface-400">
                Monthly or yearly recurring charges. Tier-based plans with auto-renewal
                and prorated upgrades/downgrades.
              </p>
            </button>

            {/* Usage-Based */}
            <button
              type="button"
              onClick={() => isAdmin && updateConfig('usageBasedEnabled', !config.usageBasedEnabled)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                config.usageBasedEnabled
                  ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                  : 'border-surface-700 bg-surface-900 hover:border-surface-600'
              }`}
            >
              {config.usageBasedEnabled && (
                <div className="absolute top-3 right-3">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
              )}
              <div className={`p-2.5 rounded-lg w-fit mb-3 ${
                config.usageBasedEnabled ? 'bg-emerald-500/20' : 'bg-surface-800'
              }`}>
                <BarChart3 className={`h-5 w-5 ${
                  config.usageBasedEnabled ? 'text-emerald-500' : 'text-surface-400'
                }`} />
              </div>
              <h3 className="font-semibold text-surface-100 mb-1">Usage-Based</h3>
              <p className="text-xs text-surface-400">
                Metered billing with real-time tracking. Configure rate tiers, quotas,
                and overage policies per service.
              </p>
            </button>

            {/* Time-of-Service */}
            <button
              type="button"
              onClick={() => isAdmin && updateConfig('timeOfServiceEnabled', !config.timeOfServiceEnabled)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                config.timeOfServiceEnabled
                  ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-surface-700 bg-surface-900 hover:border-surface-600'
              }`}
            >
              {config.timeOfServiceEnabled && (
                <div className="absolute top-3 right-3">
                  <Check className="h-5 w-5 text-amber-500" />
                </div>
              )}
              <div className={`p-2.5 rounded-lg w-fit mb-3 ${
                config.timeOfServiceEnabled ? 'bg-amber-500/20' : 'bg-surface-800'
              }`}>
                <Clock className={`h-5 w-5 ${
                  config.timeOfServiceEnabled ? 'text-amber-500' : 'text-surface-400'
                }`} />
              </div>
              <h3 className="font-semibold text-surface-100 mb-1">Time-of-Service</h3>
              <p className="text-xs text-surface-400">
                Charge immediately at time of service or defer to account balance
                for consolidated invoicing.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Subscription Settings ──────────────────────────────────────── */}
      {config.subscriptionEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary-600" />
              Subscription Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Default Billing Cycle"
                  value={config.defaultBillingCycle}
                  onChange={(e) => updateConfig('defaultBillingCycle', e.target.value)}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                />
                <Input
                  label="Grace Period (Days)"
                  type="number"
                  value={config.gracePeriodDays}
                  onChange={(e) => updateConfig('gracePeriodDays', parseInt(e.target.value) || 0)}
                  helperText="Days after failed payment before account suspension"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSwitch
                  checked={config.autoRenew}
                  onChange={(v) => updateConfig('autoRenew', v)}
                  label="Auto-Renew Subscriptions"
                  description="Automatically renew at end of billing period"
                />
                <ToggleSwitch
                  checked={config.allowMidCycleChanges}
                  onChange={(v) => updateConfig('allowMidCycleChanges', v)}
                  label="Allow Mid-Cycle Plan Changes"
                  description="Let customers upgrade/downgrade before period ends"
                />
                <ToggleSwitch
                  checked={config.prorateUpgrades}
                  onChange={(v) => updateConfig('prorateUpgrades', v)}
                  label="Prorate Upgrades"
                  description="Credit unused time when upgrading mid-cycle"
                />
                <ToggleSwitch
                  checked={config.prorateDowngrades}
                  onChange={(v) => updateConfig('prorateDowngrades', v)}
                  label="Prorate Downgrades"
                  description="Credit unused time when downgrading mid-cycle"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Usage-Based Settings ───────────────────────────────────────── */}
      {config.usageBasedEnabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                Usage-Based Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Select
                    label="Usage Reset Cycle"
                    value={config.usageResetCycle}
                    onChange={(e) => updateConfig('usageResetCycle', e.target.value)}
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                    ]}
                  />
                  <Select
                    label="Overage Policy"
                    value={config.overage}
                    onChange={(e) => updateConfig('overage', e.target.value)}
                    options={[
                      { value: 'charge', label: 'Charge overage rate' },
                      { value: 'block', label: 'Block at limit' },
                      { value: 'alert_only', label: 'Alert only (no block)' },
                    ]}
                  />
                  <Select
                    label="Invoice Cycle"
                    value={config.usageInvoiceCycle}
                    onChange={(e) => updateConfig('usageInvoiceCycle', e.target.value)}
                    options={[
                      { value: 'realtime', label: 'Real-time' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                    ]}
                  />
                </div>
                <Input
                  label="Alert Threshold (%)"
                  type="number"
                  value={config.usageAlertThreshold}
                  onChange={(e) => updateConfig('usageAlertThreshold', parseInt(e.target.value) || 80)}
                  helperText="Send alert when usage reaches this percentage of the quota"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Usage Meters ─────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-emerald-500" />
                  Usage Meters
                  <Badge variant="muted" dot={false} className="text-xs ml-1">
                    {meters.length}
                  </Badge>
                </CardTitle>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditingMeter(null);
                      setShowMeterModal(true);
                    }}
                  >
                    Add Meter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {meters.length === 0 ? (
                <div className="text-center py-8">
                  <Gauge className="h-10 w-10 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400 text-sm">No usage meters configured</p>
                  <p className="text-surface-500 text-xs mt-1">
                    Add meters to track and bill for specific services like package scans, SMS, or storage.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meters.map((meter) => (
                    <div
                      key={meter.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-surface-700 bg-surface-900/50 hover:bg-surface-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <Zap className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-surface-200">{meter.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-surface-500">
                              Unit: {meter.unit}
                            </span>
                            {meter.includedQuantity > 0 && (
                              <span className="text-xs text-surface-500">
                                Included: {meter.includedQuantity.toLocaleString()}
                              </span>
                            )}
                            {meter.hardLimit > 0 && (
                              <span className="text-xs text-surface-500">
                                Limit: {meter.hardLimit.toLocaleString()}
                              </span>
                            )}
                            <span className="text-xs text-surface-500">
                              {meter.rateTiers.length} tier{meter.rateTiers.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMeter(meter);
                              setShowMeterModal(true);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={async () => {
                              await fetch('/api/settings/billing-models', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'delete_meter',
                                  meter: { id: meter.id },
                                }),
                              });
                              loadData();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Time-of-Service Settings ───────────────────────────────────── */}
      {config.timeOfServiceEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Time-of-Service Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Default Charge Mode"
                  value={config.tosDefaultMode}
                  onChange={(e) => updateConfig('tosDefaultMode', e.target.value)}
                  options={[
                    { value: 'immediate', label: 'Immediate — charge at time of service' },
                    { value: 'deferred', label: 'Deferred — add to account balance' },
                  ]}
                />
                <Input
                  label="Payment Window (Days)"
                  type="number"
                  value={config.tosPaymentWindow}
                  onChange={(e) => updateConfig('tosPaymentWindow', parseInt(e.target.value) || 30)}
                  helperText="Days allowed for deferred payment before overdue"
                />
              </div>
              <ToggleSwitch
                checked={config.tosAutoInvoice}
                onChange={(v) => updateConfig('tosAutoInvoice', v)}
                label="Auto-Generate Invoices"
                description="Automatically create an invoice for each time-of-service charge"
              />

              {/* Mode explanation cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`rounded-lg border p-4 ${
                  config.tosDefaultMode === 'immediate'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-surface-700 bg-surface-900'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-surface-200">Immediate Mode</span>
                  </div>
                  <p className="text-xs text-surface-400">
                    Customer pays at the point of service (checkout, shipping label, etc.).
                    Supports cash, card, or digital payment methods. Best for walk-in customers.
                  </p>
                </div>
                <div className={`rounded-lg border p-4 ${
                  config.tosDefaultMode === 'deferred'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-surface-700 bg-surface-900'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-surface-200">Deferred Mode</span>
                  </div>
                  <p className="text-xs text-surface-400">
                    Charges are added to the customer&apos;s account balance and invoiced later.
                    Credit limits prevent unbounded debt. Best for regular PMB holders.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Save ───────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-500">
              <Check className="h-4 w-4" /> Configuration saved
            </span>
          )}
          <Button
            leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      )}

      {/* ── Usage Meter Modal ──────────────────────────────────────────── */}
      {showMeterModal && (
        <MeterModal
          meter={editingMeter}
          onClose={() => {
            setShowMeterModal(false);
            setEditingMeter(null);
          }}
          onSaved={() => {
            setShowMeterModal(false);
            setEditingMeter(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Meter Modal                                                               */
/* -------------------------------------------------------------------------- */
function MeterModal({
  meter,
  onClose,
  onSaved,
}: {
  meter: UsageMeter | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(meter?.name || '');
  const [slug, setSlug] = useState(meter?.slug || '');
  const [unit, setUnit] = useState(meter?.unit || 'unit');
  const [description, setDescription] = useState(meter?.description || '');
  const [includedQuantity, setIncludedQuantity] = useState(meter?.includedQuantity ?? 0);
  const [hardLimit, setHardLimit] = useState(meter?.hardLimit ?? 0);
  const [tiers, setTiers] = useState<RateTier[]>(
    meter?.rateTiers?.length ? meter.rateTiers : [{ upTo: null, rate: 0 }],
  );
  const [saving, setSaving] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!meter) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, ''),
      );
    }
  };

  const addTier = () => {
    // Insert before the last (unlimited) tier
    const newTiers = [...tiers];
    const lastTier = newTiers[newTiers.length - 1];
    if (lastTier && lastTier.upTo === null) {
      newTiers.splice(newTiers.length - 1, 0, { upTo: 100, rate: 0 });
    } else {
      newTiers.push({ upTo: null, rate: 0 });
    }
    setTiers(newTiers);
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: 'upTo' | 'rate', value: number | null) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleSave = async () => {
    if (!name || !slug) return;
    setSaving(true);
    try {
      await fetch('/api/settings/billing-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: meter ? 'update_meter' : 'create_meter',
          meter: {
            id: meter?.id,
            name,
            slug,
            unit,
            description: description || null,
            rateTiers: tiers,
            includedQuantity,
            hardLimit,
          },
        }),
      });
      onSaved();
    } catch (err) {
      console.error('Failed to save meter:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 max-w-lg w-full mx-4 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Gauge className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-100">
                {meter ? 'Edit Usage Meter' : 'New Usage Meter'}
              </h3>
              <p className="text-xs text-surface-400">
                Define how usage is tracked and billed
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Input
            label="Meter Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Package Scans"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Slug (ID)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="package_scans"
              helperText="Used in API calls"
            />
            <Select
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={[
                { value: 'unit', label: 'Unit' },
                { value: 'scan', label: 'Scan' },
                { value: 'message', label: 'Message' },
                { value: 'request', label: 'Request' },
                { value: 'gb', label: 'GB' },
                { value: 'hour', label: 'Hour' },
                { value: 'day', label: 'Day' },
              ]}
            />
          </div>
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this meter tracks..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Included Free Quantity"
              type="number"
              value={includedQuantity}
              onChange={(e) => setIncludedQuantity(parseInt(e.target.value) || 0)}
              helperText="Free units before billing starts"
            />
            <Input
              label="Hard Limit"
              type="number"
              value={hardLimit}
              onChange={(e) => setHardLimit(parseInt(e.target.value) || 0)}
              helperText="0 = unlimited"
            />
          </div>

          {/* Rate Tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-300">Rate Tiers</label>
              <button
                type="button"
                onClick={addTier}
                className="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Tier
              </button>
            </div>
            <div className="space-y-2">
              {tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        placeholder={tier.upTo === null ? '∞ (unlimited)' : 'Up to units'}
                        value={tier.upTo ?? ''}
                        onChange={(e) =>
                          updateTier(i, 'upTo', e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-surface-500 mt-0.5 block">
                        {tier.upTo === null ? 'Unlimited (last tier)' : `Up to ${tier.upTo} units`}
                      </span>
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Rate per unit"
                        value={tier.rate}
                        onChange={(e) =>
                          updateTier(i, 'rate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-surface-500 mt-0.5 block">
                        {formatCurrency(tier.rate)} per {unit}
                      </span>
                    </div>
                  </div>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="text-surface-500 hover:text-red-400 mt-[-8px]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name || !slug}
            leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          >
            {saving ? 'Saving…' : meter ? 'Update Meter' : 'Create Meter'}
          </Button>
        </div>
      </div>
    </div>
  );
}
