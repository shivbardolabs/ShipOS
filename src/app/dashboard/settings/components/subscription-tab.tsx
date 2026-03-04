'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Building2, Check, Crown, Package, Star, X, Zap } from 'lucide-react';

export interface SubscriptionTabProps {
  currentPlan: 'starter' | 'pro' | 'enterprise';
  setCurrentPlan: (v: 'starter' | 'pro' | 'enterprise') => void;
  billingCycle: 'monthly' | 'annual';
  setBillingCycle: (v: 'monthly' | 'annual') => void;
  showChangePlanConfirm: boolean;
  setShowChangePlanConfirm: (v: boolean) => void;
  pendingPlan: 'starter' | 'pro' | 'enterprise' | null;
  setPendingPlan: (v: 'starter' | 'pro' | 'enterprise' | null) => void;
}

export function SubscriptionTab({ currentPlan, setCurrentPlan, billingCycle, setBillingCycle, showChangePlanConfirm, setShowChangePlanConfirm, pendingPlan, setPendingPlan }: SubscriptionTabProps) {
  return (
    <>
  <div className="space-y-6">
    {/* Current Plan Summary */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary-600" />
          Your Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary-500/30 bg-primary-50">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
            <Star className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-surface-100">
                {currentPlan === 'starter' ? 'Starter' : currentPlan === 'pro' ? 'Pro' : 'Enterprise'} Plan
              </h3>
              <Badge variant="success" dot={false} className="text-xs">Active</Badge>
            </div>
            <p className="text-sm text-surface-400 mt-0.5">
              {billingCycle === 'monthly'
                ? `$${currentPlan === 'starter' ? '99' : currentPlan === 'pro' ? '179' : '299'}/month`
                : `$${currentPlan === 'starter' ? '79' : currentPlan === 'pro' ? '143' : '239'}/month (billed annually)`}
              {' · '}Next billing date: <span className="text-surface-200">Mar 1, 2026</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-surface-100">
              ${billingCycle === 'monthly'
                ? (currentPlan === 'starter' ? '99' : currentPlan === 'pro' ? '179' : '299')
                : (currentPlan === 'starter' ? '79' : currentPlan === 'pro' ? '143' : '239')}
            </p>
            <p className="text-xs text-surface-500">per month</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Billing Cycle Toggle */}
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => setBillingCycle('monthly')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          billingCycle === 'monthly'
            ? 'bg-primary-600 text-white'
            : 'bg-surface-800 text-surface-400 hover:text-surface-200'
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => setBillingCycle('annual')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
          billingCycle === 'annual'
            ? 'bg-primary-600 text-white'
            : 'bg-surface-800 text-surface-400 hover:text-surface-200'
        }`}
      >
        Annual
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
          Save 20%
        </span>
      </button>
    </div>

    {/* Plan Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Starter Plan */}
      <div className={`relative rounded-2xl border-2 p-6 transition-all ${
        currentPlan === 'starter'
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
          : 'border-surface-700 bg-surface-900 hover:border-surface-600'
      }`}>
        {currentPlan === 'starter' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-semibold">
              Current Plan
            </span>
          </div>
        )}
        <div className="text-center mb-6">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-surface-800 text-surface-300 mb-3">
            <Package className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-bold text-surface-100">Starter</h4>
          <div className="mt-2">
            <span className="text-3xl font-bold text-surface-100">
              ${billingCycle === 'monthly' ? '99' : '79'}
            </span>
            <span className="text-surface-500 text-sm">/mo</span>
          </div>
          {billingCycle === 'annual' && (
            <p className="text-xs text-surface-500 mt-1">$948/year (save $240)</p>
          )}
        </div>
        <ul className="space-y-2.5 mb-6">
          {[
            'AI Smart Intake (photo → check-in)',
            'Package receiving & tracking',
            '4×6 label printing',
            'Auto carrier detection',
            'Email notifications',
            'Mailbox management',
            'Basic reporting',
            '100 AI scans/mo',
          ].map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        {currentPlan === 'starter' ? (
          <Button variant="ghost" className="w-full" disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => { setPendingPlan('starter'); setShowChangePlanConfirm(true); }}
          >
            Downgrade
          </Button>
        )}
      </div>

      {/* Pro Plan */}
      <div className={`relative rounded-2xl border-2 p-6 transition-all ${
        currentPlan === 'pro'
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
          : 'border-surface-700 bg-surface-900 hover:border-surface-600'
      }`}>
        {currentPlan === 'pro' ? (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-semibold">
              Current Plan
            </span>
          </div>
        ) : (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold">
              Most Popular
            </span>
          </div>
        )}
        <div className="text-center mb-6">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary-100 text-primary-600 mb-3">
            <Star className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-bold text-surface-100">Pro</h4>
          <div className="mt-2">
            <span className="text-3xl font-bold text-surface-100">
              ${billingCycle === 'monthly' ? '179' : '143'}
            </span>
            <span className="text-surface-500 text-sm">/mo</span>
          </div>
          {billingCycle === 'annual' && (
            <p className="text-xs text-surface-500 mt-1">$1,716/year (save $432)</p>
          )}
        </div>
        <ul className="space-y-2.5 mb-6">
          {[
            'Everything in Starter, plus:',
            'AI Morning Briefing',
            'AI Carrier Bill Auditor',
            'AI ID Scan Onboarding',
            'AI Mail Sorting (Snap & Route)',
            'Voice AI (Hey ShipOS)',
            'Loyalty rewards program',
            'SMS & email notifications',
            '2,000 AI scans/mo',
          ].map((f, i) => (
            <li key={i} className={`flex items-start gap-2 text-sm ${i === 0 ? 'text-primary-400 font-medium' : 'text-surface-300'}`}>
              {i === 0 ? <Zap className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" /> : <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
              {f}
            </li>
          ))}
        </ul>
        {currentPlan === 'pro' ? (
          <Button className="w-full" disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => { setPendingPlan('pro'); setShowChangePlanConfirm(true); }}
          >
            {currentPlan === 'enterprise' ? 'Downgrade' : 'Upgrade'} to Pro
          </Button>
        )}
      </div>

      {/* Enterprise Plan */}
      <div className={`relative rounded-2xl border-2 p-6 transition-all ${
        currentPlan === 'enterprise'
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
          : 'border-surface-700 bg-surface-900 hover:border-surface-600'
      }`}>
        {currentPlan === 'enterprise' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-semibold">
              Current Plan
            </span>
          </div>
        )}
        <div className="text-center mb-6">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-bold text-surface-100">Enterprise</h4>
          <div className="mt-2">
            <span className="text-3xl font-bold text-surface-100">
              ${billingCycle === 'monthly' ? '299' : '239'}
            </span>
            <span className="text-surface-500 text-sm">/mo</span>
          </div>
          {billingCycle === 'annual' && (
            <p className="text-xs text-surface-500 mt-1">$2,868/year (save $720)</p>
          )}
        </div>
        <ul className="space-y-2.5 mb-6">
          {[
            'Everything in Pro, plus:',
            'Custom AI model training',
            'Unlimited AI scans',
            'Multi-location dashboard',
            'API access & webhooks',
            'Custom integrations',
            'White-label options',
            'Dedicated account mgr',
          ].map((f, i) => (
            <li key={i} className={`flex items-start gap-2 text-sm ${i === 0 ? 'text-amber-400 font-medium' : 'text-surface-300'}`}>
              {i === 0 ? <Zap className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" /> : <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
              {f}
            </li>
          ))}
        </ul>
        {currentPlan === 'enterprise' ? (
          <Button variant="ghost" className="w-full" disabled>
            Current Plan
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => { setPendingPlan('enterprise'); setShowChangePlanConfirm(true); }}
          >
            Upgrade to Enterprise
          </Button>
        )}
      </div>
    </div>

    {/* Plan comparison features */}
    <Card>
      <CardHeader>
        <CardTitle>Plan Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-surface-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Feature</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Starter</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Pro</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wider">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {[
                { feature: 'AI Smart Intake', starter: true, pro: true, enterprise: true },
                { feature: 'AI ID Scan Onboarding', starter: false, pro: true, enterprise: true },
                { feature: 'AI Morning Briefing', starter: false, pro: true, enterprise: true },
                { feature: 'AI Carrier Bill Auditor', starter: false, pro: true, enterprise: true },
                { feature: 'AI Mail Sorting', starter: false, pro: true, enterprise: true },
                { feature: 'Voice AI Assistant', starter: false, pro: true, enterprise: true },
                { feature: 'AI Scans/Month', starter: '100', pro: '2,000', enterprise: 'Unlimited' },
                { feature: 'Monthly Packages', starter: '500', pro: 'Unlimited', enterprise: 'Unlimited' },
                { feature: 'SMS Notifications', starter: false, pro: true, enterprise: true },
                { feature: 'Loyalty Program', starter: false, pro: true, enterprise: true },
                { feature: 'API Access', starter: false, pro: false, enterprise: true },
                { feature: 'Multi-Location', starter: false, pro: false, enterprise: true },
                { feature: 'Support', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-surface-800/30 transition-colors">
                  <td className="px-4 py-3 text-surface-300 font-medium">{row.feature}</td>
                  {['starter', 'pro', 'enterprise'].map((plan) => {
                    const val = row[plan as keyof typeof row];
                    return (
                      <td key={plan} className={`px-4 py-3 text-center ${plan === currentPlan ? 'bg-primary-500/5' : ''}`}>
                        {val === true ? (
                          <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : val === false ? (
                          <X className="h-4 w-4 text-surface-600 mx-auto" />
                        ) : (
                          <span className="text-surface-300">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Change Plan Confirmation Modal */}
  {showChangePlanConfirm && pendingPlan && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-surface-100">
              {['starter'].includes(pendingPlan) && currentPlan !== 'starter' ? 'Downgrade' : 'Upgrade'} Plan
            </h3>
            <p className="text-sm text-surface-400">
              Switch to the {pendingPlan.charAt(0).toUpperCase() + pendingPlan.slice(1)} plan
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-surface-800/50 p-4 border border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-300">
                <span className="line-through text-surface-500">
                  {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                </span>
                {' → '}
                <span className="font-semibold text-surface-100">
                  {pendingPlan.charAt(0).toUpperCase() + pendingPlan.slice(1)}
                </span>
              </p>
              <p className="text-xs text-surface-500 mt-1">
                Changes take effect at the start of your next billing cycle
              </p>
            </div>
            <p className="text-lg font-bold text-surface-100">
              ${billingCycle === 'monthly'
                ? (pendingPlan === 'starter' ? '99' : pendingPlan === 'pro' ? '179' : '299')
                : (pendingPlan === 'starter' ? '79' : pendingPlan === 'pro' ? '143' : '239')}/mo
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => { setShowChangePlanConfirm(false); setPendingPlan(null); }}>
            Cancel
          </Button>
          <Button onClick={() => {
            setCurrentPlan(pendingPlan);
            setShowChangePlanConfirm(false);
            setPendingPlan(null);
          }}>
            Confirm Change
          </Button>
        </div>
      </div>
    </div>
  )}
    </>
  );
}
