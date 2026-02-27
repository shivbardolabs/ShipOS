'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AlertCard, ALERT_TOKENS } from './alert-badge';
import type { AlertPriority } from './alert-badge';
import { Button } from './button';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Eye,
  SkipForward,
  Clock,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  BAR-262 — Dashboard Alert Summary Panel                                   */
/*  BAR-263 — Alert Acknowledgement (Skip / Remind Later Flow)                */
/* -------------------------------------------------------------------------- */

interface AlertData {
  id: string;
  type: string;
  priority: AlertPriority;
  isTimeSensitive: boolean;
  title: string;
  message: string;
  actionUrl: string | null;
  createdAt: string;
  snoozedUntil: string | null;
  resolvedAt: string | null;
}

interface AlertSummaryPanelProps {
  tenantId: string;
  className?: string;
}

const SNOOZE_OPTIONS = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: 'Tomorrow morning', minutes: -1 },  // special: next 9 AM
] as const;

export function AlertSummaryPanel({ tenantId, className }: AlertSummaryPanelProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [snoozeDropdownId, setSnoozeDropdownId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/alerts?tenantId=${tenantId}`);
      if (!res.ok) return;
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      // Silently fail — dashboard should still render
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAlerts();
    // Refresh every 60 seconds
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = useCallback(async (alertId: string, action: 'skip' | 'snooze' | 'dismiss', snoozedUntil?: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, snoozedUntil }),
      });
      // Remove from local state immediately
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setSnoozeDropdownId(null);
    } catch {
      // Fail silently
    }
  }, []);

  // Auto-dismiss completed alerts after 30 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (const alert of alerts) {
      if (alert.priority === 'completed') {
        const timer = setTimeout(() => {
          handleAcknowledge(alert.id, 'dismiss');
        }, 30_000);
        timers.push(timer);
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [alerts, handleAcknowledge]);

  const handleSnooze = (alertId: string, minutes: number) => {
    let until: Date;
    if (minutes === -1) {
      // Tomorrow morning at 9 AM
      until = new Date();
      until.setDate(until.getDate() + 1);
      until.setHours(9, 0, 0, 0);
    } else {
      until = new Date(Date.now() + minutes * 60 * 1000);
    }
    handleAcknowledge(alertId, 'snooze', until.toISOString());
  };

  const handleViewAlert = (alert: AlertData) => {
    if (alert.actionUrl) {
      router.push(alert.actionUrl);
    }
  };

  // Count by priority for header
  const urgentCount = alerts.filter((a) => a.priority === 'urgent_important').length;
  const hasTimeSensitive = alerts.some((a) => a.isTimeSensitive);
  const totalCount = alerts.length;

  /* BAR-264: Sort time-sensitive alerts above non-time-sensitive of same priority */
  const sortedAlerts = useMemo(() => {
    const priorityOrder: Record<string, number> = { urgent_important: 0, urgent: 1, important: 2, completed: 3 };
    return [...alerts].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 9;
      const pb = priorityOrder[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      // Same priority: time-sensitive first
      if (a.isTimeSensitive !== b.isTimeSensitive) return a.isTimeSensitive ? -1 : 1;
      // Same priority & sensitivity: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts]);

  if (loading) return null;
  if (totalCount === 0) {
    return (
      <div className={cn('glass-card p-4', className)}>
        <div className="flex items-center gap-2 text-emerald-500">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">All clear — no alerts at this time ✅</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-3 hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn('relative', hasTimeSensitive && 'bell-pulse')}>
            <Bell className="h-5 w-5 text-surface-300" />
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {totalCount}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-surface-200">
            Alerts
          </span>
          <span className="text-xs text-surface-500">
            ({totalCount} active{urgentCount > 0 ? `, ${urgentCount} urgent` : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/dashboard/notifications');
            }}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            View All
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-surface-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-surface-500" />
          )}
        </div>
      </button>

      {/* Alert list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {sortedAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              priority={alert.priority}
              title={alert.title}
              message={alert.message}
              timestamp={alert.createdAt}
              timeSensitive={alert.isTimeSensitive}
              actions={
                <AlertActions
                  alert={alert}
                  snoozeOpen={snoozeDropdownId === alert.id}
                  onToggleSnooze={() =>
                    setSnoozeDropdownId(snoozeDropdownId === alert.id ? null : alert.id)
                  }
                  onView={() => handleViewAlert(alert)}
                  onSkip={() => handleAcknowledge(alert.id, 'skip')}
                  onDismiss={() => handleAcknowledge(alert.id, 'dismiss')}
                  onSnooze={(mins) => handleSnooze(alert.id, mins)}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── AlertActions (BAR-263: Acknowledgement Flow) ────────────────────────── */

interface AlertActionsProps {
  alert: AlertData;
  snoozeOpen: boolean;
  onToggleSnooze: () => void;
  onView: () => void;
  onSkip: () => void;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

function AlertActions({
  alert,
  snoozeOpen,
  onToggleSnooze,
  onView,
  onSkip,
  onDismiss,
  onSnooze,
}: AlertActionsProps) {
  const token = ALERT_TOKENS[alert.priority];
  const isUrgentImportant = alert.priority === 'urgent_important';

  // Urgent & Important: View / Skip / Remind Later
  // Other: View / Dismiss
  return (
    <div className="flex items-center gap-1.5 relative">
      {alert.actionUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className={cn('h-7 px-2.5 text-xs', token.text)}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      )}

      {isUrgentImportant ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="h-7 px-2.5 text-xs text-surface-400 hover:text-surface-200"
          >
            <SkipForward className="h-3 w-3 mr-1" />
            Skip
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSnooze();
              }}
              className="h-7 px-2.5 text-xs text-surface-400 hover:text-surface-200"
            >
              <Clock className="h-3 w-3 mr-1" />
              Remind Later
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>

            {snoozeOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 rounded-lg border border-surface-700 bg-surface-900 shadow-lg z-50">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnooze(opt.minutes);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="h-7 px-2.5 text-xs text-surface-400 hover:text-surface-200"
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
      )}
    </div>
  );
}

/* ── Sidebar Badge (exported for nav) ────────────────────────────────────── */

interface AlertCountBadgeProps {
  tenantId: string;
}

export function AlertCountBadge({ tenantId }: AlertCountBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/alerts?tenantId=${tenantId}&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.total ?? 0);
      } catch {
        // Silently fail
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [tenantId]);

  if (count === 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
