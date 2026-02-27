'use client';

import { cn } from '@/lib/utils';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/*  BAR-261 — Alert Priority Design System                                    */
/*  Color-coded badge & card components for the ShipOS alert system            */
/* -------------------------------------------------------------------------- */

export type AlertPriority =
  | 'urgent_important'
  | 'urgent'
  | 'important'
  | 'completed';

/* ── Design Tokens ───────────────────────────────────────────────────────── */

export const ALERT_TOKENS: Record<
  AlertPriority,
  {
    color: string;       // primary hex
    bg: string;          // tailwind bg class
    bgLight: string;     // light tint bg
    text: string;        // tailwind text class
    border: string;      // tailwind border class
    stripe: string;      // left-stripe bg
    label: string;       // human label
    Icon: React.ElementType;
  }
> = {
  urgent_important: {
    color: '#EF4444',
    bg: 'bg-red-500',
    bgLight: 'bg-red-500/10',
    text: 'text-red-500',
    border: 'border-red-500/30',
    stripe: 'bg-red-500',
    label: 'Urgent & Important',
    Icon: AlertOctagon,
  },
  urgent: {
    color: '#F97316',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-500/10',
    text: 'text-orange-500',
    border: 'border-orange-500/30',
    stripe: 'bg-orange-500',
    label: 'Urgent',
    Icon: AlertTriangle,
  },
  important: {
    color: '#EAB308',
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    border: 'border-yellow-500/30',
    stripe: 'bg-yellow-500',
    label: 'Important',
    Icon: AlertCircle,
  },
  completed: {
    color: '#22C55E',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    stripe: 'bg-emerald-500',
    label: 'Completed',
    Icon: CheckCircle2,
  },
};

/* ── AlertBadge ──────────────────────────────────────────────────────────── */

interface AlertBadgeProps {
  priority: AlertPriority;
  /** Show the flashing animation for time-sensitive alerts */
  timeSensitive?: boolean;
  className?: string;
}

export function AlertBadge({
  priority,
  timeSensitive = false,
  className,
}: AlertBadgeProps) {
  const token = ALERT_TOKENS[priority];
  const Icon = token.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
        token.bgLight,
        token.text,
        token.border,
        timeSensitive && 'alert-time-sensitive',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {token.label}
      {timeSensitive && <Zap className="h-3 w-3 flex-shrink-0" />}
    </span>
  );
}

/* ── AlertCard ───────────────────────────────────────────────────────────── */

interface AlertCardProps {
  priority: AlertPriority;
  title: string;
  message: string;
  /** ISO timestamp */
  timestamp?: string;
  timeSensitive?: boolean;
  /** Action buttons rendered in the footer */
  actions?: ReactNode;
  /** Click handler for the card body */
  onClick?: () => void;
  className?: string;
}

export function AlertCard({
  priority,
  title,
  message,
  timestamp,
  timeSensitive = false,
  actions,
  onClick,
  className,
}: AlertCardProps) {
  const token = ALERT_TOKENS[priority];
  const Icon = token.Icon;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'relative overflow-hidden rounded-lg border',
        token.bgLight,
        token.border,
        timeSensitive && 'alert-time-sensitive',
        onClick && 'cursor-pointer hover:brightness-95 transition-all',
        className
      )}
    >
      {/* Priority stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', token.stripe)} />

      <div className="pl-4 pr-4 py-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', token.text)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn('text-sm font-semibold truncate', token.text)}>
                {title}
              </h4>
              {timeSensitive && (
                <Zap className={cn('h-3.5 w-3.5 flex-shrink-0', token.text)} />
              )}
            </div>
            <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{message}</p>
          </div>
          {timestamp && (
            <span className="text-[10px] text-surface-500 whitespace-nowrap flex-shrink-0">
              {formatRelativeTime(timestamp)}
            </span>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 mt-2.5 pl-7">{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
