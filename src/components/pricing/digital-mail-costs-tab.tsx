'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Mail,
  Plus,
  Edit2,
  ExternalLink,
  BarChart3,
  DollarSign,
  ArrowUpDown,
  TrendingUp,
  Building2,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  BAR-303 — Digital Mail Platform Cost Integration                          */
/*  Pricing Dashboard tab for tracking partner digital mail platform costs    */
/* -------------------------------------------------------------------------- */

/* ── Types ──────────────────────────────────────────────────────────────── */

interface PlatformCostEntry {
  id: string;
  platformId: string;
  category: CostCategory;
  description: string;
  amount: number;
  frequency: 'monthly' | 'per_transaction' | 'one_time' | 'annual';
  month: string; // e.g. '2026-02'
  notes?: string;
}

type CostCategory =
  | 'platform_fee'
  | 'per_transaction'
  | 'revenue_share'
  | 'setup_fee'
  | 'api_fee';

const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  platform_fee: 'Monthly Platform Fee',
  per_transaction: 'Per-Transaction Fee',
  revenue_share: 'Revenue Share / Commission',
  setup_fee: 'Setup / Onboarding Fee',
  api_fee: 'API Usage Fee',
};

const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  platform_fee: 'text-blue-400 bg-blue-500/10',
  per_transaction: 'text-amber-400 bg-amber-500/10',
  revenue_share: 'text-violet-400 bg-violet-500/10',
  setup_fee: 'text-emerald-400 bg-emerald-500/10',
  api_fee: 'text-cyan-400 bg-cyan-500/10',
};

/* ── Platform definitions ───────────────────────────────────────────────── */

interface DigitalMailPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
  url?: string;
}

const PLATFORMS: DigitalMailPlatform[] = [
  { id: 'anytime', name: 'Anytime Mailbox', logo: '📬', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { id: 'ipostal', name: 'iPostal1', logo: '📮', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' },
  { id: 'postscan', name: 'PostScan Mail', logo: '📧', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { id: 'boxfo', name: 'Boxfo', logo: '📦', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  { id: 'other', name: 'Other Platform', logo: '📋', color: 'bg-surface-700/30 text-surface-400 border-surface-700/30' },
];

/* ── Reference pricing data (Req 14) ───────────────────────────────────── */

interface ReferencePlan {
  platform: string;
  plan: string;
  priceRange: string;
  items: string;
  features: string;
}

const REFERENCE_PRICING: ReferencePlan[] = [
  { platform: 'iPostal1', plan: 'Green', priceRange: '$9.99/mo', items: '30 items', features: '30-day storage' },
  { platform: 'iPostal1', plan: 'Blue', priceRange: '$14.99/mo', items: '60 items', features: '30-day storage, consolidation' },
  { platform: 'iPostal1', plan: 'Silver', priceRange: '$24.99/mo', items: '120 items', features: '30-day storage, consolidation' },
  { platform: 'iPostal1', plan: 'Gold', priceRange: '$39.99/mo', items: '240 items', features: '30-day storage, consolidation' },
  { platform: 'Boxfo', plan: 'PAY GO', priceRange: '$0/mo', items: '30 items', features: 'Pay per use, free shredding' },
  { platform: 'Boxfo', plan: 'Basic', priceRange: '$15/mo', items: '60 items', features: 'Free shredding' },
  { platform: 'Boxfo', plan: 'Standard', priceRange: '$30/mo', items: '90 items', features: 'Free shredding' },
  { platform: 'Boxfo', plan: 'Premium', priceRange: '$45/mo', items: '120 items', features: 'Free shredding, priority support' },
  { platform: 'Anytime Mailbox', plan: 'Bronze', priceRange: '$18.99/mo', items: '30 items', features: '$1.00/page scan' },
  { platform: 'Anytime Mailbox', plan: 'Silver', priceRange: '$24.99/mo', items: '60 items', features: '$1.00/page scan' },
  { platform: 'Anytime Mailbox', plan: 'Bronze+', priceRange: '$29.99/mo', items: '120 items', features: '$1.00/page scan' },
  { platform: 'Anytime Mailbox', plan: 'Gold', priceRange: '$39.99/mo', items: '240 items', features: '$1.00/page scan' },
  { platform: 'PostScan Mail', plan: 'Starter', priceRange: '$10/mo', items: '30 items', features: '30-day mail storage free' },
  { platform: 'PostScan Mail', plan: 'Standard', priceRange: '$20/mo', items: '60 items', features: '30-day mail storage free' },
  { platform: 'PostScan Mail', plan: 'Premium', priceRange: '$30/mo', items: '120 items', features: '30-day mail storage free' },
];

/* ── Mock cost entries ──────────────────────────────────────────────────── */

const MOCK_COSTS: PlatformCostEntry[] = [
  { id: 'c1', platformId: 'anytime', category: 'platform_fee', description: 'Anytime Mailbox partner fee', amount: 149.99, frequency: 'monthly', month: '2026-02' },
  { id: 'c2', platformId: 'anytime', category: 'per_transaction', description: 'Receiving fees (87 items)', amount: 43.50, frequency: 'per_transaction', month: '2026-02' },
  { id: 'c3', platformId: 'anytime', category: 'revenue_share', description: 'Revenue share — 15% of plan fees', amount: 67.20, frequency: 'monthly', month: '2026-02' },
  { id: 'c4', platformId: 'ipostal', category: 'platform_fee', description: 'iPostal1 partner fee', amount: 199.99, frequency: 'monthly', month: '2026-02' },
  { id: 'c5', platformId: 'ipostal', category: 'per_transaction', description: 'Scan fees (142 pages)', amount: 71.00, frequency: 'per_transaction', month: '2026-02' },
  { id: 'c6', platformId: 'ipostal', category: 'api_fee', description: 'API usage overage', amount: 12.50, frequency: 'monthly', month: '2026-02' },
  { id: 'c7', platformId: 'postscan', category: 'platform_fee', description: 'PostScan Mail monthly', amount: 89.99, frequency: 'monthly', month: '2026-02' },
  { id: 'c8', platformId: 'postscan', category: 'per_transaction', description: 'Forwarding charges (23 items)', amount: 34.50, frequency: 'per_transaction', month: '2026-02' },
  { id: 'c9', platformId: 'boxfo', category: 'setup_fee', description: 'Boxfo onboarding fee', amount: 250.00, frequency: 'one_time', month: '2026-01' },
  { id: 'c10', platformId: 'boxfo', category: 'platform_fee', description: 'Boxfo partner fee', amount: 59.99, frequency: 'monthly', month: '2026-02' },
];

/* ── Main Component ─────────────────────────────────────────────────────── */

export function DigitalMailCostsTab() {
  const [costs] = useState<PlatformCostEntry[]>(MOCK_COSTS);
  const [selectedMonth] = useState('2026-02');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'summary' | 'comparison'>('summary');
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  /* ── Computed data ── */
  const monthCosts = useMemo(
    () => costs.filter((c) => c.month === selectedMonth),
    [costs, selectedMonth]
  );

  const platformSummaries = useMemo(() => {
    return PLATFORMS.map((platform) => {
      const platformCosts = monthCosts.filter((c) => c.platformId === platform.id);
      const total = platformCosts.reduce((sum, c) => sum + c.amount, 0);
      const byCategory = Object.entries(COST_CATEGORY_LABELS).map(([cat, label]) => ({
        category: cat as CostCategory,
        label,
        amount: platformCosts.filter((c) => c.category === cat).reduce((s, c) => s + c.amount, 0),
      })).filter((c) => c.amount > 0);
      return { ...platform, costs: platformCosts, total, byCategory };
    }).filter((p) => p.total > 0 || p.id !== 'other');
  }, [monthCosts]);

  const grandTotal = useMemo(
    () => monthCosts.reduce((sum, c) => sum + c.amount, 0),
    [monthCosts]
  );

  const filteredRef = useMemo(() => {
    if (!searchQuery) return REFERENCE_PRICING;
    const q = searchQuery.toLowerCase();
    return REFERENCE_PRICING.filter(
      (r) => r.platform.toLowerCase().includes(q) || r.plan.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
            <Mail className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-surface-100">Digital Mail Platform Costs</h2>
            <p className="text-xs text-surface-500">
              Track and compare costs from partner digital mail platforms · Feb 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-surface-700 overflow-hidden">
            <button
              onClick={() => setView('summary')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'summary'
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              Cost Summary
            </button>
            <button
              onClick={() => setView('comparison')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'comparison'
                  ? 'bg-primary-600 text-white'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              Reference Pricing
            </button>
          </div>
          <Button
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => { /* TODO: add cost modal */ }}
          >
            Add Cost
          </Button>
        </div>
      </div>

      {/* Summary metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <DollarSign className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Total This Month</p>
              <p className="text-lg font-bold text-surface-100">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Active Platforms</p>
              <p className="text-lg font-bold text-surface-100">{platformSummaries.filter((p) => p.total > 0).length}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <BarChart3 className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Cost Entries</p>
              <p className="text-lg font-bold text-surface-100">{monthCosts.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-surface-500">Avg per Platform</p>
              <p className="text-lg font-bold text-surface-100">
                {formatCurrency(grandTotal / Math.max(1, platformSummaries.filter((p) => p.total > 0).length))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cost Summary View */}
      {view === 'summary' && (
        <div className="space-y-4">
          {platformSummaries.map((platform) => {
            const isExpanded = expandedPlatform === platform.id;
            if (platform.total === 0 && platform.id === 'other') return null;

            return (
              <Card key={platform.id} padding="none" className="overflow-hidden">
                <button
                  onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-surface-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border text-lg', platform.color)}>
                      {platform.logo}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-surface-200">{platform.name}</p>
                      <p className="text-xs text-surface-500">
                        {platform.costs.length} cost entries · {platform.byCategory.length} categories
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold text-surface-100">
                        {platform.total > 0 ? formatCurrency(platform.total) : '—'}
                      </p>
                      <p className="text-[10px] text-surface-500">this month</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-surface-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-surface-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-surface-700/30 px-5 py-4 space-y-3">
                    {/* Category breakdown */}
                    {platform.byCategory.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2 h-2 rounded-full', COST_CATEGORY_COLORS[cat.category].split(' ')[1])} />
                          <span className="text-sm text-surface-300">{cat.label}</span>
                        </div>
                        <span className="text-sm font-medium text-surface-200">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}

                    {/* Individual entries */}
                    <div className="mt-3 pt-3 border-t border-surface-700/20 space-y-2">
                      {platform.costs.map((cost) => (
                        <div
                          key={cost.id}
                          className="flex items-center justify-between rounded-lg bg-surface-800/20 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="default"
                              dot={false}
                              className={cn('text-[10px]', COST_CATEGORY_COLORS[cost.category])}
                            >
                              {cost.frequency}
                            </Badge>
                            <span className="text-xs text-surface-300">{cost.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-surface-200">{formatCurrency(cost.amount)}</span>
                            <button className="p-1 text-surface-500 hover:text-surface-300 transition-colors">
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reference Pricing View */}
      {view === 'comparison' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search platforms or plans..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-surface-500">
              <Info className="h-3.5 w-3.5" />
              Reference data — actual costs may vary
            </div>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700/30 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Platform</th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">Price <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Items Included</th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Key Features</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/20">
                  {filteredRef.map((ref, i) => (
                    <tr key={i} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-surface-200">{ref.platform}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" dot={false}>{ref.plan}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-surface-100">{ref.priceRange}</td>
                      <td className="px-4 py-3 text-sm text-surface-400">{ref.items}</td>
                      <td className="px-4 py-3 text-xs text-surface-500">{ref.features}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Phase 2 notice */}
          <Card padding="md" className="border-dashed">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10">
                <ExternalLink className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-200">Automated Cost Import (Phase 2)</p>
                <p className="text-xs text-surface-500 mt-1">
                  API integrations with partner platforms for automated cost data pull, scheduled sync, and
                  automated reconciliation are planned for a future release.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
