'use client';

/**
 * BAR-13: Package Inventory Dashboard — Summary Cards
 *
 * Displays count summaries for packages in inventory:
 * - Total packages, by carrier, by age bracket
 * - Aging indicators: green (<7d), yellow (7-14d), red (>14d)
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  Package,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InventoryPackage, PackageProgramType } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface InventorySummaryProps {
  packages: InventoryPackage[];
  className?: string;
}

interface AgeBracket {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  count: number;
  icon: React.ReactNode;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function daysHeld(checkedInAt: string): number {
  const now = new Date();
  const checkedIn = new Date(checkedInAt);
  return Math.max(0, Math.floor((now.getTime() - checkedIn.getTime()) / 86400000));
}

const programLabels: Record<PackageProgramType, string> = {
  pmb: 'PMB',
  ups_ap: 'UPS AP',
  fedex_hal: 'FedEx HAL',
  kinek: 'Kinek',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function InventorySummary({ packages, className }: InventorySummaryProps) {
  const inInventory = packages.filter((p) => p.status !== 'released' && p.status !== 'returned');

  // Age brackets
  const fresh = inInventory.filter((p) => daysHeld(p.checkedInAt) < 7);
  const aging = inInventory.filter((p) => {
    const d = daysHeld(p.checkedInAt);
    return d >= 7 && d < 14;
  });
  const overdue = inInventory.filter((p) => daysHeld(p.checkedInAt) >= 14);
  const critical = inInventory.filter((p) => daysHeld(p.checkedInAt) >= 30);

  // By carrier
  const byCarrier: Record<string, number> = {};
  inInventory.forEach((p) => {
    const key = p.carrier.toLowerCase();
    byCarrier[key] = (byCarrier[key] || 0) + 1;
  });

  // By program type
  const byProgram: Record<string, number> = {};
  inInventory.forEach((p) => {
    const key = p.programType || 'pmb';
    byProgram[key] = (byProgram[key] || 0) + 1;
  });

  const ageBrackets: AgeBracket[] = [
    {
      label: 'Fresh (< 7 days)',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      count: fresh.length,
      icon: <Package className="h-5 w-5 text-emerald-500" />,
    },
    {
      label: 'Aging (7-14 days)',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      count: aging.length,
      icon: <Clock className="h-5 w-5 text-amber-500" />,
    },
    {
      label: 'Overdue (14+ days)',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      count: overdue.length,
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    },
  ];

  const topCarriers = Object.entries(byCarrier)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className={cn('space-y-4', className)}>
      {/* ── Top Row: Total + Age Brackets ── */}
      <div className="grid grid-cols-4 gap-3">
        {/* Total */}
        <Card padding="sm" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-500 font-medium">Total In Inventory</p>
              <p className="text-2xl font-bold text-surface-100 mt-1">{inInventory.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-500" />
            </div>
          </div>
          {critical.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-red-400 font-medium">
                {critical.length} held 30+ days
              </span>
            </div>
          )}
        </Card>

        {/* Age brackets */}
        {ageBrackets.map((bracket) => (
          <Card
            key={bracket.label}
            padding="sm"
            className={cn('border', bracket.borderColor)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={cn('text-xs font-medium', bracket.color)}>
                  {bracket.label}
                </p>
                <p className="text-2xl font-bold text-surface-100 mt-1">
                  {bracket.count}
                </p>
              </div>
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', bracket.bgColor)}>
                {bracket.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Bottom Row: By Carrier + By Program ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* By Carrier */}
        <Card padding="sm">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider mb-3">
            By Carrier
          </p>
          <div className="space-y-2">
            {topCarriers.map(([carrier, count]) => (
              <div key={carrier} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CarrierLogo carrier={carrier} size={16} />
                  <span className="text-sm text-surface-300 capitalize">{carrier}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${Math.min(100, (count / inInventory.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-surface-200 w-6 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* By Program Type */}
        <Card padding="sm">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider mb-3">
            <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
            By Package Type
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byProgram).map(([program, count]) => (
              <div
                key={program}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700"
              >
                <Badge
                  variant={
                    program === 'pmb'
                      ? 'default'
                      : program === 'ups_ap'
                        ? 'warning'
                        : program === 'fedex_hal'
                          ? 'info'
                          : 'muted'
                  }
                  className="text-[10px]"
                >
                  {programLabels[program as PackageProgramType] || program}
                </Badge>
                <span className="text-lg font-bold text-surface-200">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
