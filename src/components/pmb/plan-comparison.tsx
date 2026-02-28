'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { calculateAnnualSavings } from '@/lib/pmb-billing/plan-tiers';
import {
  Crown,
  CheckCircle2,
  Calendar,
  Loader2,
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
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function PlanComparison({ onSelect }: { onSelect?: (tierId: string, billingCycle: 'monthly' | 'annual') => void }) {
  const [tiers, setTiers] = useState<PlanTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/pmb/plan-tiers');
        if (res.ok) {
          const data = await res.json();
          setTiers(data.tiers ?? []);
        }
      } catch (err) {
        console.error('Failed to load tiers:', err);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200'}`}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === 'annual' ? 'bg-brand-600 text-white' : 'bg-surface-800 text-surface-400 hover:text-surface-200'}`}
          onClick={() => setBillingCycle('annual')}
        >
          Annual
          <Badge variant="success">Save up to {Math.max(...tiers.map((t) => t.annualDiscountPct), 0)}%</Badge>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tiers.map((tier) => {
          const savings = calculateAnnualSavings(tier.priceMonthly, tier.priceAnnual);
          const price = billingCycle === 'annual' ? tier.priceAnnual / 12 : tier.priceMonthly;

          return (
            <Card key={tier.id} className="relative">
              {tier.slug === 'gold' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="warning">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <Crown className="h-8 w-8 mx-auto text-surface-400 mb-2" />
                  <h3 className="text-lg font-bold text-surface-100">{tier.name}</h3>
                  {tier.description && <p className="text-xs text-surface-400 mt-1">{tier.description}</p>}
                </div>

                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-surface-100">{formatCurrency(price)}</span>
                    <span className="text-surface-400">/mo</span>
                  </div>
                  {billingCycle === 'annual' && savings.savingsPct > 0 && (
                    <div className="mt-1 text-sm text-emerald-400 flex items-center justify-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Save {formatCurrency(savings.savings)}/year ({savings.savingsPct.toFixed(0)}% off)
                    </div>
                  )}
                  {billingCycle === 'monthly' && savings.savingsPct > 0 && (
                    <p className="mt-1 text-xs text-surface-500">
                      Switch to annual and save {formatCurrency(savings.savings)}/year
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <Feature label={`${tier.includedMailItems === 0 ? 'Unlimited' : tier.includedMailItems} mail items/mo`} />
                  <Feature label={`${tier.includedScans} scan pages/mo`} />
                  <Feature label={`${tier.freeStorageDays} days free storage`} />
                  <Feature label={`${tier.includedForwarding} forwarding/mo`} />
                  <Feature label={`${tier.maxRecipients} recipient${tier.maxRecipients > 1 ? 's' : ''}`} />
                  {tier.includedShredding > 0 && <Feature label={`${tier.includedShredding} free shredding/mo`} />}
                  {tier.maxPackagesPerMonth > 0 && <Feature label={`${tier.maxPackagesPerMonth} packages/mo`} />}
                </div>

                {onSelect && (
                  <Button className="w-full" onClick={() => onSelect(tier.id, billingCycle)}>
                    Select {tier.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-surface-300">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}
