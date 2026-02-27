'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import {
  Award,
  TrendingUp,
  Gift,
  Users,
  Crown,
  Gem,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';


/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function tierIcon(tierName: string) {
  if (tierName === 'Gold') return <Crown className="h-4 w-4" />;
  if (tierName === 'Silver') return <Gem className="h-4 w-4" />;
  return <Award className="h-4 w-4" />;
}

function tierBadge(tierName: string, color: string, size: 'sm' | 'md' = 'sm') {
  const cls = size === 'md' ? 'px-3 py-1.5 text-sm gap-2' : 'px-2 py-0.5 text-xs gap-1';
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${cls}`}
      style={{ background: `${color}20`, color }}
    >
      {tierIcon(tierName)}
      {tierName}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function LoyaltyDashboardPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [loyaltyProgram, setLoyaltyProgram] = useState<any>(null);
  const [loyaltyTiers, setLoyaltyTiers] = useState<any[]>([]);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<any[]>([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState<any[]>([]);
  const [loyaltyDashboardStats, setLoyaltyDashboardStats] = useState<any>({ totalMembers: 0, activeMembers: 0, totalPointsInCirculation: 0, lifetimePointsEarned: 0, tierDistribution: [], pointsIssuedThisMonth: 0, redemptionsThisMonth: 0, topCustomers: [], recentActivity: [] });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  useEffect(() => {
    fetch('/api/loyalty')
      .then((r) => r.json())
      .then((d) => {
        setLoyaltyProgram(d.program ?? { name: 'ShipOS Rewards', isActive: false, pointsPerDollar: 1 });
        setLoyaltyTiers(d.tiers || []);
        setLoyaltyAccounts(d.accounts || []);
        setLoyaltyRewards(d.rewards || []);
        setLoyaltyDashboardStats(d.stats ?? loyaltyDashboardStats);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const stats = loyaltyDashboardStats;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Calculate additional stats
  const totalLifetimePoints = loyaltyAccounts.reduce((s, a) => s + a.lifetimePoints, 0);
  const avgPointsPerMember = loyaltyAccounts.length > 0 ? Math.round(totalLifetimePoints / loyaltyAccounts.length) : 0;
  const goldMembers = loyaltyAccounts.filter(a => a.currentTier?.name === 'Gold').length;
  const silverMembers = loyaltyAccounts.filter(a => a.currentTier?.name === 'Silver').length;
  const bronzeMembers = loyaltyAccounts.filter(a => a.currentTier?.name === 'Bronze').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Program"
        description={
          loyaltyProgram?.isActive
            ? `${loyaltyProgram.name} — ${stats.totalMembers} active members`
            : 'Program is currently inactive'
        }
      />

      {/* ── Status banner ─────────────────────────────────────────────── */}
      {loyaltyProgram?.isActive && (
        <div className="relative overflow-hidden rounded-xl border layout-border bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20">
                <Sparkles className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-100">{loyaltyProgram?.name}</h3>
                <p className="text-xs text-surface-400">
                  {loyaltyProgram?.pointsPerDollar ?? 1} pt per $1 · {loyaltyTiers.length} tiers · {loyaltyRewards.length} rewards
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: formatNumber(stats.totalMembers), icon: Users, color: 'text-primary-500', bg: 'bg-primary-500/10' },
          { label: 'Points Issued (Month)', value: formatNumber(stats.pointsIssuedThisMonth), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Redemptions (Month)', value: formatNumber(stats.redemptionsThisMonth), icon: Gift, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Avg Points / Member', value: formatNumber(avgPointsPerMember), icon: Star, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border layout-border layout-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-surface-500 uppercase tracking-wide">{card.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-surface-100">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tier Breakdown + Tier Cards row ───────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {loyaltyTiers.map((tier) => {
          const count = tier.name === 'Gold' ? goldMembers : tier.name === 'Silver' ? silverMembers : bronzeMembers;
          const pct = stats.totalMembers > 0 ? Math.round((count / stats.totalMembers) * 100) : 0;
          // Parse benefits from JSON string if needed
          const benefits: string[] = Array.isArray(tier.benefits)
            ? tier.benefits
            : typeof tier.benefits === 'string'
              ? (() => { try { return JSON.parse(tier.benefits); } catch { return []; } })()
              : [];
          tier = { ...tier, benefits };
          return (
            <div key={tier.id} className="rounded-xl border layout-border layout-card p-5">
              <div className="flex items-center justify-between mb-4">
                {tierBadge(tier.name, tier.color, 'md')}
                <span className="text-2xl font-bold text-surface-100">{count}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-surface-400">
                  <span>{pct}% of members</span>
                  <span>{formatNumber(tier.minPoints)}{tier.maxPoints ? `–${formatNumber(tier.maxPoints)}` : '+'} pts</span>
                </div>
                <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: tier.color }}
                  />
                </div>
                <div className="mt-3 space-y-1">
                  {tier.benefits.slice(0, 3).map((b: string, i: number) => (
                    <p key={i} className="text-xs text-surface-400 flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                      {b}
                    </p>
                  ))}
                  {tier.benefits.length > 3 && (
                    <p className="text-xs text-surface-500">+{tier.benefits.length - 3} more</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Top Customers + Recent Activity ────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Customers */}
        <div className="rounded-xl border layout-border layout-card">
          <div className="px-5 py-4 border-b layout-border">
            <h3 className="text-sm font-bold text-surface-100">Top Members</h3>
            <p className="text-xs text-surface-500 mt-0.5">By lifetime points</p>
          </div>
          <div className="divide-y divide-surface-800/50">
            {stats.topCustomers.map((cust, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-800 text-xs font-bold text-surface-300">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-surface-200">{cust.name}</p>
                    <p className="text-xs text-surface-500">{formatNumber(cust.points)} lifetime pts</p>
                  </div>
                </div>
                {tierBadge(cust.tier, loyaltyTiers.find(t => t.name === cust.tier)?.color || '#888')}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border layout-border layout-card">
          <div className="px-5 py-4 border-b layout-border">
            <h3 className="text-sm font-bold text-surface-100">Recent Activity</h3>
            <p className="text-xs text-surface-500 mt-0.5">Latest point transactions</p>
          </div>
          <div className="divide-y divide-surface-800/50 max-h-[480px] overflow-y-auto">
            {stats.recentActivity.map((txn, i) => {
              const isEarn = txn.points > 0;
              return (
                <div key={txn.id || i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isEarn ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      {isEarn ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">
                        {txn.description || txn.type}
                      </p>
                      <p className="text-xs text-surface-500">{formatDate(txn.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${isEarn ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isEarn ? '+' : ''}{formatNumber(txn.points)} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Rewards Catalog ────────────────────────────────────────────── */}
      <div className="rounded-xl border layout-border layout-card">
        <div className="px-5 py-4 border-b layout-border">
          <h3 className="text-sm font-bold text-surface-100">Rewards Catalog</h3>
          <p className="text-xs text-surface-500 mt-0.5">{loyaltyRewards.length} rewards available for redemption</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {loyaltyRewards.map((reward) => (
            <div
              key={reward.id}
              className="rounded-lg border layout-border bg-surface-900/50 p-4 hover:border-primary-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Gift className="h-5 w-5 text-primary-500" />
                <span className="text-xs font-bold text-primary-400">{formatNumber(reward.pointsCost)} pts</span>
              </div>
              <h4 className="text-sm font-semibold text-surface-200 mb-1">{reward.name}</h4>
              <p className="text-xs text-surface-500 leading-relaxed">{reward.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-surface-500">${reward.value.toFixed(2)} value</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reward.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-700 text-surface-400'}`}>
                  {reward.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── All Members Table ──────────────────────────────────────────── */}
      <div className="rounded-xl border layout-border layout-card">
        <div className="px-5 py-4 border-b layout-border">
          <h3 className="text-sm font-bold text-surface-100">All Members</h3>
          <p className="text-xs text-surface-500 mt-0.5">Enrolled loyalty program members</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">PMB</th>
                <th className="px-5 py-3">Tier</th>
                <th className="px-5 py-3 text-right">Current Points</th>
                <th className="px-5 py-3 text-right">Lifetime Points</th>
                <th className="px-5 py-3">Referral Code</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {loyaltyAccounts.slice(0, 20).map((acct) => (
                <tr key={acct.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {acct.customer?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={acct.customer.photoUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300">
                          {acct.customer?.firstName?.[0]}{acct.customer?.lastName?.[0]}
                        </div>
                      )}
                      <span className="font-medium text-surface-200">
                        {acct.customer?.firstName} {acct.customer?.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-surface-400 text-xs font-mono">{acct.customer?.pmbNumber}</td>
                  <td className="px-5 py-3">{acct.currentTier && tierBadge(acct.currentTier.name, acct.currentTier.color)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-surface-200">{formatNumber(acct.currentPoints)}</td>
                  <td className="px-5 py-3 text-right text-surface-400">{formatNumber(acct.lifetimePoints)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => copyCode(acct.referralCode)}
                      className="flex items-center gap-1.5 text-xs font-mono text-surface-400 hover:text-primary-400 transition-colors"
                    >
                      {acct.referralCode}
                      {copiedCode === acct.referralCode ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-xs text-surface-500">{formatDate(acct.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
