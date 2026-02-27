'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import type { LoyaltyTier, LoyaltyReward } from '@/lib/types';
import {
  Save,
  Award,
  Crown,
  Gem,
  Star,
  Plus,
  Trash2,
  Gift,
  Users,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import Link from 'next/link';

/* ── Helpers ─────────────────────────────────────────────────── */

function tierIcon(name: string) {
  if (name === 'Gold') return <Crown className="h-5 w-5" />;
  if (name === 'Silver') return <Gem className="h-5 w-5" />;
  return <Award className="h-5 w-5" />;
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function LoyaltySettingsPage() {
  const [programName, setProgramName] = useState('ShipOS Rewards');
  const [isActive, setIsActive] = useState(false);
  const [pointsPerDollar, setPointsPerDollar] = useState(1);
  const [redemptionRate, setRedemptionRate] = useState(5);
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [referrerBonus, setReferrerBonus] = useState(200);
  const [refereeBonus, setRefereeBonus] = useState(100);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);

  useEffect(() => {
    fetch('/api/loyalty')
      .then((r) => r.json())
      .then((d) => {
        if (d.program) {
          setProgramName(d.program.name);
          setIsActive(d.program.isActive);
          setPointsPerDollar(d.program.pointsPerDollar);
          setRedemptionRate(d.program.redemptionRate * 100);
          setReferralEnabled(d.program.referralEnabled);
          setReferrerBonus(d.program.referrerBonusPoints);
          setRefereeBonus(d.program.refereeBonusPoints);
        }
        if (d.tiers) setTiers(d.tiers.map((t: LoyaltyTier) => ({
          ...t,
          benefits: Array.isArray(t.benefits) ? t.benefits : typeof t.benefits === 'string' ? (() => { try { return JSON.parse(t.benefits as string); } catch { return []; } })() : [],
        })));
        if (d.rewards) setRewards(d.rewards);
      })
      .catch(() => {});
  }, []);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty Settings"
        description="Configure your loyalty program, tiers, rewards, and referral system"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/loyalty"
              className="inline-flex items-center gap-2 rounded-lg bg-surface-800 px-4 py-2 text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors"
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {/* ── Program Basics ─────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-surface-100">Program Basics</h3>
            <p className="text-xs text-surface-500 mt-0.5">Core loyalty program configuration</p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className="flex items-center gap-2 text-sm"
          >
            {isActive ? (
              <>
                <ToggleRight className="h-6 w-6 text-accent-emerald" />
                <span className="font-medium text-accent-emerald">Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-6 w-6 text-surface-500" />
                <span className="font-medium text-surface-500">Inactive</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Program Name</label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Points per $1 Spent</label>
            <input
              type="number"
              value={pointsPerDollar}
              onChange={(e) => setPointsPerDollar(Number(e.target.value))}
              min={0.1}
              step={0.1}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
            />
            <p className="text-[10px] text-surface-500 mt-1">Customers earn this many points for every dollar spent</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">
              Redemption Value (cents per point)
            </label>
            <input
              type="number"
              value={redemptionRate}
              onChange={(e) => setRedemptionRate(Number(e.target.value))}
              min={1}
              step={1}
              className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
            />
            <p className="text-[10px] text-surface-500 mt-1">
              {redemptionRate} ¢/pt → 100 pts = ${(redemptionRate).toFixed(2)} credit
            </p>
          </div>
        </div>
      </Card>

      {/* ── Tier Configuration ──────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-surface-100">Tier Configuration</h3>
            <p className="text-xs text-surface-500 mt-0.5">Define loyalty tiers with escalating benefits</p>
          </div>
        </div>

        <div className="space-y-4">
          {tiers.map((tier, idx) => (
            <div
              key={tier.id}
              className="rounded-lg border border-surface-700 p-5"
              style={{ borderLeftWidth: '4px', borderLeftColor: tier.color }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
                  >
                    {tierIcon(tier.name)}
                  </div>
                  <input
                    value={tier.name}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setTiers(next);
                    }}
                    className="bg-transparent text-base font-semibold text-surface-100 focus:outline-none border-b border-transparent hover:border-surface-600 focus:border-primary-500"
                  />
                </div>
                <input
                  type="color"
                  value={tier.color}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[idx] = { ...next[idx], color: e.target.value };
                    setTiers(next);
                  }}
                  className="h-7 w-7 rounded cursor-pointer bg-transparent border-0"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-surface-500 uppercase mb-1">Min Points</label>
                  <input
                    type="number"
                    value={tier.minPoints}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[idx] = { ...next[idx], minPoints: Number(e.target.value) };
                      setTiers(next);
                    }}
                    className="w-full rounded border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-surface-500 uppercase mb-1">Earning Multiplier</label>
                  <input
                    type="number"
                    value={tier.earningMultiplier}
                    step={0.25}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[idx] = { ...next[idx], earningMultiplier: Number(e.target.value) };
                      setTiers(next);
                    }}
                    className="w-full rounded border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-surface-500 uppercase mb-1">Shipping Discount %</label>
                  <input
                    type="number"
                    value={tier.shippingDiscount}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[idx] = { ...next[idx], shippingDiscount: Number(e.target.value) };
                      setTiers(next);
                    }}
                    className="w-full rounded border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-surface-500 uppercase mb-1">Free Hold Days</label>
                  <input
                    type="number"
                    value={tier.freeHoldDays}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[idx] = { ...next[idx], freeHoldDays: Number(e.target.value) };
                      setTiers(next);
                    }}
                    className="w-full rounded border border-surface-700 bg-surface-900 px-2.5 py-1.5 text-sm text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-medium text-surface-500 uppercase mb-1">Benefits</label>
                <div className="flex flex-wrap gap-1.5">
                  {tier.benefits.map((b: string, j: number) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-800 px-2.5 py-1 text-xs text-surface-300"
                    >
                      <Star className="h-3 w-3 text-surface-500" />
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Rewards Catalog ──────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-surface-100">Rewards Catalog</h3>
            <p className="text-xs text-surface-500 mt-0.5">Manage redeemable rewards for customers</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-300 hover:text-surface-100 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add Reward
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">Reward</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase">Type</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-surface-500 uppercase">Cost (pts)</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-surface-500 uppercase">Value ($)</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-surface-500 uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-surface-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {rewards.map((reward, i) => (
                <tr key={reward.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-accent-amber" />
                      <div>
                        <p className="font-medium text-surface-200">{reward.name}</p>
                        <p className="text-xs text-surface-500">{reward.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="muted">{reward.rewardType}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-surface-200">{reward.pointsCost}</td>
                  <td className="px-3 py-3 text-right text-surface-400">${reward.value.toFixed(2)}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => {
                        const next = [...rewards];
                        next[i] = { ...next[i], isActive: !next[i].isActive };
                        setRewards(next);
                      }}
                    >
                      {reward.isActive ? (
                        <ToggleRight className="h-5 w-5 text-accent-emerald mx-auto" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-surface-500 mx-auto" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button className="text-surface-500 hover:text-accent-rose transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Referral Settings ────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-surface-100">Referral Program</h3>
            <p className="text-xs text-surface-500 mt-0.5">Reward customers for referring new business</p>
          </div>
          <button
            onClick={() => setReferralEnabled(!referralEnabled)}
            className="flex items-center gap-2 text-sm"
          >
            {referralEnabled ? (
              <>
                <ToggleRight className="h-6 w-6 text-accent-emerald" />
                <span className="font-medium text-accent-emerald">Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-6 w-6 text-surface-500" />
                <span className="font-medium text-surface-500">Disabled</span>
              </>
            )}
          </button>
        </div>

        {referralEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">
                Referrer Bonus (points)
              </label>
              <input
                type="number"
                value={referrerBonus}
                onChange={(e) => setReferrerBonus(Number(e.target.value))}
                className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
              />
              <p className="text-[10px] text-surface-500 mt-1">
                Points awarded to the existing customer who refers someone new
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">
                New Customer Welcome Bonus (points)
              </label>
              <input
                type="number"
                value={refereeBonus}
                onChange={(e) => setRefereeBonus(Number(e.target.value))}
                className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50"
              />
              <p className="text-[10px] text-surface-500 mt-1">
                Points awarded to the new customer when they sign up with a referral code
              </p>
            </div>
            <div className="md:col-span-2 rounded-lg bg-surface-900/50 border border-surface-800 p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-surface-200">How Referrals Work</p>
                  <ol className="mt-2 space-y-1 text-xs text-surface-400 list-decimal list-inside">
                    <li>Each enrolled customer receives a unique 8-character referral code</li>
                    <li>When a new customer opens a mailbox and provides the code, both parties earn bonus points</li>
                    <li>Referrer earns <strong className="text-surface-200">{referrerBonus} pts</strong> · new customer earns <strong className="text-surface-200">{refereeBonus} pts</strong></li>
                    <li>All referral transactions are tracked in the loyalty activity log</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
