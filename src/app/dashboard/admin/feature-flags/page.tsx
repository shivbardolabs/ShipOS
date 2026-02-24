'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { CATEGORY_META } from '@/lib/feature-flag-definitions';
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Building2,
  User,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  Package,
  Truck,
  Shield,
  BarChart3,
  Settings,
  AlertCircle,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface FlagOverride {
  id: string;
  flagId: string;
  targetType: 'user' | 'tenant';
  targetId: string;
  enabled: boolean;
  createdAt: string;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  defaultEnabled: boolean;
  overrides: FlagOverride[];
  createdAt: string;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: { id: string; name: string } | null;
}

/* -------------------------------------------------------------------------- */
/*  Category icons                                                            */
/* -------------------------------------------------------------------------- */
const categoryIcons: Record<string, React.ElementType> = {
  ai: Sparkles,
  packages: Package,
  operations: Truck,
  compliance: Shield,
  business: BarChart3,
  platform: Settings,
};

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */
export default function FeatureFlagsPage() {
  const { localUser } = useTenant();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [addOverrideFlag, setAddOverrideFlag] = useState<FeatureFlag | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // ── Guard: superadmin only ──
  if (localUser && localUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-surface-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-surface-300">Access Denied</h2>
          <p className="text-surface-500 mt-1">Superadmin access required.</p>
        </div>
      </div>
    );
  }

  /* eslint-disable react-hooks/rules-of-hooks */

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feature-flags');
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags);
        setTenants(data.tenants);
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch feature flags', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Expand all categories by default after load ──
  useEffect(() => {
    if (flags.length > 0 && expandedCategories.size === 0) {
      const cats = new Set(flags.map((f) => f.category));
      setExpandedCategories(cats);
    }
  }, [flags, expandedCategories.size]);

  // ── Grouped & filtered flags ──
  const groupedFlags = useMemo(() => {
    const filtered = search
      ? flags.filter(
          (f) =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.key.toLowerCase().includes(search.toLowerCase()) ||
            (f.description?.toLowerCase().includes(search.toLowerCase()) ?? false),
        )
      : flags;

    const grouped: Record<string, FeatureFlag[]> = {};
    for (const f of filtered) {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    }

    return Object.entries(grouped).sort(
      ([a], [b]) => (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99),
    );
  }, [flags, search]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = flags.length;
    const enabledByDefault = flags.filter((f) => f.defaultEnabled).length;
    const totalOverrides = flags.reduce((sum, f) => sum + f.overrides.length, 0);
    const tenantOverrides = flags.reduce(
      (sum, f) => sum + f.overrides.filter((o) => o.targetType === 'tenant').length,
      0,
    );
    const userOverrides = flags.reduce(
      (sum, f) => sum + f.overrides.filter((o) => o.targetType === 'user').length,
      0,
    );
    return { total, enabledByDefault, totalOverrides, tenantOverrides, userOverrides };
  }, [flags]);

  // ── Toggle default ──
  const toggleDefault = async (flag: FeatureFlag) => {
    setSaving(flag.id);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId: flag.id, defaultEnabled: !flag.defaultEnabled }),
      });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) =>
            f.id === flag.id ? { ...f, defaultEnabled: !f.defaultEnabled } : f,
          ),
        );
      }
    } catch (e) {
      console.error('Failed to toggle default', e);
    } finally {
      setSaving(null);
    }
  };

  // ── Delete override ──
  const deleteOverride = async (overrideId: string, flagId: string) => {
    setSaving(overrideId);
    try {
      const res = await fetch('/api/admin/feature-flags/overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideId }),
      });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) =>
            f.id === flagId
              ? { ...f, overrides: f.overrides.filter((o) => o.id !== overrideId) }
              : f,
          ),
        );
      }
    } catch (e) {
      console.error('Failed to delete override', e);
    } finally {
      setSaving(null);
    }
  };

  // ── Helpers ──
  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleFlagExpand = (flagId: string) => {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  };

  const getTargetName = (override: FlagOverride): string => {
    if (override.targetType === 'tenant') {
      return tenants.find((t) => t.id === override.targetId)?.name ?? 'Unknown Tenant';
    }
    const u = users.find((u) => u.id === override.targetId);
    return u ? `${u.name} (${u.email})` : 'Unknown User';
  };

  /* eslint-enable react-hooks/rules-of-hooks */

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-surface-500 mx-auto mb-3 animate-spin" />
          <p className="text-surface-500">Loading feature flags…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15"
          >
            <Flag className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Feature Flags</h1>
            <p className="text-sm text-surface-500">
              Control feature visibility per tenant and per user
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Flags" value={stats.total} icon={Flag} />
        <StatCard label="Enabled by Default" value={stats.enabledByDefault} icon={ToggleRight} accentClass="text-emerald-500" />
        <StatCard label="Tenant Overrides" value={stats.tenantOverrides} icon={Building2} accentClass="text-violet-500" />
        <StatCard label="User Overrides" value={stats.userOverrides} icon={User} accentClass="text-amber-500" />
      </div>

      {/* ── Search ── */}
      <SearchInput
        placeholder="Search flags by name, key, or description…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── Flag categories ── */}
      <div className="space-y-4">
        {groupedFlags.map(([category, catFlags]) => {
          const meta = CATEGORY_META[category] ?? { label: category, description: '', order: 99 };
          const CatIcon = categoryIcons[category] ?? Flag;
          const isExpanded = expandedCategories.has(category);

          return (
            <div
              key={category}
              className="rounded-xl border border-surface-800 overflow-hidden bg-surface-900/50"
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-800/50 transition-colors"
              >
                <CatIcon className="h-5 w-5 text-surface-400 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold text-surface-200">{meta.label}</span>
                  <span className="ml-2 text-xs text-surface-600">({catFlags.length})</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-surface-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-surface-500" />
                )}
              </button>

              {/* Flag rows */}
              {isExpanded && (
                <div className="border-t border-surface-800">
                  {catFlags.map((flag) => {
                    const isExpFlag = expandedFlags.has(flag.id);
                    const tenantCount = flag.overrides.filter((o) => o.targetType === 'tenant').length;
                    const userCount = flag.overrides.filter((o) => o.targetType === 'user').length;

                    return (
                      <div key={flag.id} className="border-b border-surface-800/50 last:border-b-0">
                        {/* Flag row */}
                        <div className="flex items-center gap-3 px-5 py-3">
                          {/* Expand toggle */}
                          <button
                            onClick={() => toggleFlagExpand(flag.id)}
                            className="text-surface-500 hover:text-surface-300 transition-colors"
                          >
                            {isExpFlag ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          {/* Flag info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-surface-200">
                                {flag.name}
                              </span>
                              <code className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-500 font-mono">
                                {flag.key}
                              </code>
                            </div>
                            {flag.description && (
                              <p className="text-xs text-surface-500 mt-0.5 truncate">
                                {flag.description}
                              </p>
                            )}
                          </div>

                          {/* Override badges */}
                          {(tenantCount > 0 || userCount > 0) && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {tenantCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                                  <Building2 className="h-3 w-3" />
                                  {tenantCount}
                                </span>
                              )}
                              {userCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                  <User className="h-3 w-3" />
                                  {userCount}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Default toggle */}
                          <button
                            onClick={() => toggleDefault(flag)}
                            disabled={saving === flag.id}
                            className={`flex items-center gap-2 flex-shrink-0 transition-opacity ${saving === flag.id ? 'opacity-50' : ''}`}
                            title={flag.defaultEnabled ? 'Default: ON — Click to disable' : 'Default: OFF — Click to enable'}
                          >
                            {flag.defaultEnabled ? (
                              <ToggleRight className="h-7 w-7 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-7 w-7 text-surface-600" />
                            )}
                          </button>
                        </div>

                        {/* Expanded overrides */}
                        {isExpFlag && (
                          <div className="px-5 pb-4 ml-7">
                            <div className="rounded-lg border border-surface-800 overflow-hidden">
                              {/* Default row */}
                              <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-900/50">
                                <ShieldCheck className="h-4 w-4 text-surface-500 flex-shrink-0" />
                                <span className="text-xs text-surface-400 flex-1">
                                  Default for all tenants &amp; users
                                </span>
                                <span
                                  className={`text-xs font-semibold ${flag.defaultEnabled ? 'text-emerald-500' : 'text-red-500'}`}
                                >
                                  {flag.defaultEnabled ? 'ON' : 'OFF'}
                                </span>
                              </div>

                              {/* Override rows */}
                              {flag.overrides.map((override) => (
                                <div
                                  key={override.id}
                                  className="flex items-center gap-3 px-4 py-2 border-t border-surface-800/50"
                                >
                                  {override.targetType === 'tenant' ? (
                                    <Building2 className="h-4 w-4 text-violet-400 flex-shrink-0" />
                                  ) : (
                                    <User className="h-4 w-4 text-amber-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs text-surface-300 flex-1 truncate">
                                    {getTargetName(override)}
                                  </span>
                                  <span
                                    className={`text-xs font-semibold ${override.enabled ? 'text-emerald-500' : 'text-red-500'}`}
                                  >
                                    {override.enabled ? 'ON' : 'OFF'}
                                  </span>
                                  <button
                                    onClick={() => deleteOverride(override.id, flag.id)}
                                    disabled={saving === override.id}
                                    className="text-surface-600 hover:text-red-400 transition-colors"
                                    title="Remove override"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}

                              {/* Add override button */}
                              <div className="border-t border-surface-800/50 px-4 py-2">
                                <button
                                  onClick={() => setAddOverrideFlag(flag)}
                                  className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Override
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {groupedFlags.length === 0 && !loading && (
        <div className="text-center py-12 text-surface-500">
          {search ? 'No flags match your search.' : 'No feature flags found.'}
        </div>
      )}

      {/* ── Add Override Modal ── */}
      {addOverrideFlag && (
        <AddOverrideModal
          flag={addOverrideFlag}
          tenants={tenants}
          users={users}
          onClose={() => setAddOverrideFlag(null)}
          onSaved={() => {
            setAddOverrideFlag(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                 */
/* -------------------------------------------------------------------------- */
function StatCard({
  label,
  value,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accentClass?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-800 px-4 py-3 bg-surface-900/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${accentClass ?? 'text-rose-500'}`} />
        <span className="text-[11px] text-surface-500 font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-surface-100">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add Override Modal                                                        */
/* -------------------------------------------------------------------------- */
function AddOverrideModal({
  flag,
  tenants,
  users,
  onClose,
  onSaved,
}: {
  flag: FeatureFlag;
  tenants: TenantInfo[];
  users: UserInfo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [targetType, setTargetType] = useState<'tenant' | 'user'>('tenant');
  const [targetId, setTargetId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filter out targets that already have overrides
  const existingTargetIds = new Set(
    flag.overrides
      .filter((o) => o.targetType === targetType)
      .map((o) => o.targetId),
  );

  const availableTargets =
    targetType === 'tenant'
      ? tenants.filter((t) => !existingTargetIds.has(t.id))
      : users.filter((u) => !existingTargetIds.has(u.id));

  const handleSave = async () => {
    if (!targetId) {
      setError('Please select a target');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/feature-flags/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId: flag.id, targetType, targetId, enabled }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Add Override — ${flag.name}`}>
      <div className="space-y-5">
        {/* Target type tabs */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2">Override For</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setTargetType('tenant'); setTargetId(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                targetType === 'tenant'
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                  : 'text-surface-400 hover:text-surface-200 border border-surface-700'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Tenant
            </button>
            <button
              onClick={() => { setTargetType('user'); setTargetId(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                targetType === 'user'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-surface-400 hover:text-surface-200 border border-surface-700'
              }`}
            >
              <User className="h-4 w-4" />
              User
            </button>
          </div>
        </div>

        {/* Target selector */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2">
            Select {targetType === 'tenant' ? 'Tenant' : 'User'}
          </label>
          {availableTargets.length === 0 ? (
            <p className="text-xs text-surface-500 italic">
              All {targetType === 'tenant' ? 'tenants' : 'users'} already have overrides for this flag.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-700 divide-y divide-surface-800">
              {availableTargets.map((t) => {
                const id = t.id;
                const isSelected = targetId === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTargetId(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-primary-500/10' : 'hover:bg-surface-800/50'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-4 w-4 text-primary-400 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded border border-surface-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 truncate">
                        {'name' in t ? t.name : ''}
                      </p>
                      {'email' in t && (
                        <p className="text-[11px] text-surface-500 truncate">
                          {(t as UserInfo).email}
                          {(t as UserInfo).tenant && ` · ${(t as UserInfo).tenant!.name}`}
                        </p>
                      )}
                      {'slug' in t && (
                        <p className="text-[11px] text-surface-500">{(t as TenantInfo).slug}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Enable/disable toggle */}
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-2">State</label>
          <div className="flex gap-2">
            <button
              onClick={() => setEnabled(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                enabled
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-surface-400 hover:text-surface-200 border border-surface-700'
              }`}
            >
              <Check className="h-4 w-4" />
              Enabled
            </button>
            <button
              onClick={() => setEnabled(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !enabled
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'text-surface-400 hover:text-surface-200 border border-surface-700'
              }`}
            >
              <X className="h-4 w-4" />
              Disabled
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !targetId}>
            {saving ? 'Saving…' : 'Add Override'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
