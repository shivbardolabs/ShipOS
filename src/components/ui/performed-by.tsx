'use client';

import { useMemo } from 'react';
import { User, Clock } from 'lucide-react';
import type { ActivityLogEntry } from '@/lib/activity-log';

/* -------------------------------------------------------------------------- */
/*  Time formatting                                                           */
/* -------------------------------------------------------------------------- */
function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* -------------------------------------------------------------------------- */
/*  PerformedBy — compact "by Sarah Chen · 2h ago" badge                      */
/* -------------------------------------------------------------------------- */

interface PerformedByProps {
  entry: ActivityLogEntry | null;
  /** If true, show the action label too (e.g. "Checked in by Sarah Chen") */
  showAction?: boolean;
  className?: string;
}

export function PerformedBy({ entry, showAction, className = '' }: PerformedByProps) {
  if (!entry) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] text-surface-500 ${className}`}
      title={`${entry.description} — ${new Date(entry.timestamp).toLocaleString()}`}
    >
      <User className="h-3 w-3 shrink-0 text-surface-500" />
      <span className="truncate">
        {showAction && (
          <span className="text-surface-500">{entry.action.split('.')[1].replace('_', ' ')} by </span>
        )}
        <span className="font-medium text-surface-400">{entry.userName}</span>
      </span>
      <span className="text-surface-600">·</span>
      <span className="shrink-0 text-surface-500">{timeAgo(entry.timestamp)}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  LastUpdatedBy — card-level "Last updated by X" indicator                  */
/* -------------------------------------------------------------------------- */

interface LastUpdatedByProps {
  entry: ActivityLogEntry | null;
  label?: string;
  className?: string;
}

export function LastUpdatedBy({ entry, label, className = '' }: LastUpdatedByProps) {
  if (!entry) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/40 border border-surface-700/40 ${className}`}
      title={`${entry.description}\n${new Date(entry.timestamp).toLocaleString()}`}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-700/60">
        <User className="h-3 w-3 text-surface-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-surface-500 leading-none">
          {label || 'Last updated'}
        </p>
        <p className="text-xs font-medium text-surface-300 leading-snug mt-0.5 truncate">
          {entry.userName}
          <span className="text-surface-500 font-normal"> · {timeAgo(entry.timestamp)}</span>
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ActivityTimeline — mini activity timeline for entity detail pages         */
/* -------------------------------------------------------------------------- */

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  maxItems?: number;
  className?: string;
}

export function ActivityTimeline({ entries, maxItems = 5, className = '' }: ActivityTimelineProps) {
  const items = useMemo(() => entries.slice(0, maxItems), [entries, maxItems]);

  if (items.length === 0) {
    return (
      <div className={`text-xs text-surface-500 py-3 text-center ${className}`}>
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {items.map((entry, i) => (
        <div
          key={entry.id}
          className="flex items-start gap-3 py-2 px-1"
        >
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center pt-1">
            <div className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
            {i < items.length - 1 && (
              <div className="w-px flex-1 bg-surface-700/60 mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 -mt-0.5">
            <p className="text-xs text-surface-200 leading-snug">
              {entry.description}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="h-3 w-3 text-surface-500" />
              <span className="text-[11px] font-medium text-surface-400">
                {entry.userName}
              </span>
              <Clock className="h-3 w-3 text-surface-600" />
              <span className="text-[11px] text-surface-500">
                {timeAgo(entry.timestamp)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
