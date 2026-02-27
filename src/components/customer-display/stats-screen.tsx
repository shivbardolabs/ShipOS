'use client';

/**
 * BAR-290 — Customer-Facing Stats Dashboard
 * Package & Mail Summary after customer identification
 */

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import {
  Package,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ArrowRight,
  Send,
  User,
  CalendarDays,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface CustomerStats {
  customerName: string;
  pmbNumber: string;
  packageCount: number;
  mailCount: number;
  oldestItemDays: number;
  accountStatus: 'active' | 'expiring_soon' | 'past_due';
  lastPickupDate: string | null;
  notifyEmail: boolean;
  notifySms: boolean;
  pendingForwarding: number;
  pendingDisposal: number;
}

interface StatsScreenProps {
  stats: CustomerStats;
  onContinue: () => void;
  onBack: () => void;
  variant?: 'pos' | 'portal';
}

/* -------------------------------------------------------------------------- */
/*  Status Config                                                             */
/* -------------------------------------------------------------------------- */
const statusConfig = {
  active: {
    label: 'Active',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 ring-emerald-500/30',
    icon: CheckCircle2,
  },
  expiring_soon: {
    label: 'Expiring Soon',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/30',
    icon: AlertTriangle,
  },
  past_due: {
    label: 'Past Due',
    color: 'text-red-400',
    bg: 'bg-red-500/10 ring-red-500/30',
    icon: AlertTriangle,
  },
};

/* -------------------------------------------------------------------------- */
/*  Stats Screen                                                              */
/* -------------------------------------------------------------------------- */
export function StatsScreen({
  stats,
  onContinue,
  onBack,
  variant = 'pos',
}: StatsScreenProps) {
  const status = statusConfig[stats.accountStatus];
  const StatusIcon = status.icon;
  const isEmpty = stats.packageCount === 0 && stats.mailCount === 0;

  return (
    <div className={cn(
      'min-h-screen flex flex-col items-center justify-center p-6 md:p-10',
      'bg-gradient-to-b from-surface-950 to-surface-900'
    )}>
      <div className="w-full max-w-xl space-y-6">
        {/* Customer Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 mx-auto">
            <User className="h-7 w-7 text-primary-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {stats.customerName}
          </h1>
          <p className="text-surface-400 text-sm font-mono">{stats.pmbNumber}</p>
        </div>

        {/* Account Status */}
        <div className={cn(
          'flex items-center justify-center gap-2 rounded-xl px-5 py-3 ring-1 mx-auto w-fit',
          status.bg
        )}>
          <StatusIcon className={cn('h-5 w-5', status.color)} />
          <span className={cn('font-semibold text-sm', status.color)}>
            Account: {status.label}
          </span>
        </div>

        {/* Main Stats — Large display for POS */}
        {isEmpty ? (
          <div className="text-center py-10">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-3 opacity-80" />
            <p className="text-xl font-semibold text-emerald-400">
              All clear!
            </p>
            <p className="text-surface-400 text-sm mt-1">
              No packages or mail waiting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Package Count */}
            <div className="rounded-2xl bg-surface-800/60 p-6 text-center ring-1 ring-surface-700">
              <Package className="h-8 w-8 text-primary-500 mx-auto mb-2" />
              <p className="text-4xl md:text-5xl font-bold text-white">
                {stats.packageCount}
              </p>
              <p className="text-sm text-surface-400 mt-1">
                Package{stats.packageCount !== 1 ? 's' : ''} Waiting
              </p>
            </div>

            {/* Mail Count */}
            <div className="rounded-2xl bg-surface-800/60 p-6 text-center ring-1 ring-surface-700">
              <Mail className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <p className="text-4xl md:text-5xl font-bold text-white">
                {stats.mailCount}
              </p>
              <p className="text-sm text-surface-400 mt-1">
                Mail Item{stats.mailCount !== 1 ? 's' : ''} Waiting
              </p>
            </div>
          </div>
        )}

        {/* Detail Cards — shown in portal variant or when there's more info */}
        {(variant === 'portal' || stats.oldestItemDays > 0) && (
          <div className="space-y-2">
            {stats.oldestItemDays > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-surface-800/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Clock className={cn(
                    'h-5 w-5',
                    stats.oldestItemDays > 14 ? 'text-amber-400' : 'text-surface-400'
                  )} />
                  <span className="text-sm text-surface-300">Oldest Item</span>
                </div>
                <span className={cn(
                  'text-sm font-semibold',
                  stats.oldestItemDays > 14 ? 'text-amber-400' : 'text-surface-200'
                )}>
                  {stats.oldestItemDays} day{stats.oldestItemDays !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {stats.lastPickupDate && (
              <div className="flex items-center justify-between rounded-xl bg-surface-800/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-surface-400" />
                  <span className="text-sm text-surface-300">Last Pickup</span>
                </div>
                <span className="text-sm font-semibold text-surface-200">
                  {formatDate(stats.lastPickupDate)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl bg-surface-800/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-surface-400" />
                <span className="text-sm text-surface-300">Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                {stats.notifyEmail && (
                  <span className="rounded-md bg-primary-500/20 px-2 py-0.5 text-[10px] text-primary-300 font-medium">
                    Email
                  </span>
                )}
                {stats.notifySms && (
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-medium">
                    SMS
                  </span>
                )}
              </div>
            </div>

            {(stats.pendingForwarding > 0 || stats.pendingDisposal > 0) && (
              <div className="flex items-center justify-between rounded-xl bg-amber-500/5 px-4 py-3 ring-1 ring-amber-500/20">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-amber-400" />
                  <span className="text-sm text-amber-300">Pending Actions</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  {stats.pendingForwarding > 0 && (
                    <span>{stats.pendingForwarding} forwarding</span>
                  )}
                  {stats.pendingDisposal > 0 && (
                    <span>{stats.pendingDisposal} disposal</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl bg-surface-800 py-4 text-surface-300 font-semibold hover:bg-surface-700 transition-colors text-center min-h-[56px]"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-[2] rounded-xl bg-primary-600 py-4 text-white font-semibold hover:bg-primary-500 transition-colors flex items-center justify-center gap-2 min-h-[56px]"
          >
            Continue to Checkout
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
