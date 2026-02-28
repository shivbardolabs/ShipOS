'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  changelog,
  type ChangeType,
  type ChangelogEntry,
} from '@/lib/changelog-data';
import {
  Sparkles,
  Zap,
  Wrench,
  Palette,
  ShieldCheck,
  ArrowLeft,
  Tag,
  Calendar,
  ChevronDown,
  ChevronUp,
  Rocket,
  Star,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Type badge config                                                         */
/* -------------------------------------------------------------------------- */
const typeMeta: Record<
  ChangeType,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  feature: {
    label: 'New',
    icon: Sparkles,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  improvement: {
    label: 'Improved',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  fix: {
    label: 'Fix',
    icon: Wrench,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  design: {
    label: 'Design',
    icon: Palette,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  security: {
    label: 'Security',
    icon: ShieldCheck,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
  },
};

/* -------------------------------------------------------------------------- */
/*  Filter tabs                                                               */
/* -------------------------------------------------------------------------- */
const filterOptions: { label: string; value: ChangeType | 'all' }[] = [
  { label: 'All Updates', value: 'all' },
  { label: 'Features', value: 'feature' },
  { label: 'Improvements', value: 'improvement' },
  { label: 'Design', value: 'design' },
  { label: 'Security', value: 'security' },
];

/* -------------------------------------------------------------------------- */
/*  Format date helper                                                        */
/* -------------------------------------------------------------------------- */
function formatReleaseDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* -------------------------------------------------------------------------- */
/*  Single entry component                                                    */
/* -------------------------------------------------------------------------- */
function ChangelogCard({
  entry,
  filter,
  isLatest,
}: {
  entry: ChangelogEntry;
  filter: ChangeType | 'all';
  isLatest: boolean;
}) {
  const [expanded, setExpanded] = useState(isLatest);

  const filteredChanges =
    filter === 'all'
      ? entry.changes
      : entry.changes.filter((c) => c.type === filter);

  if (filteredChanges.length === 0) return null;

  // Count by type
  const typeCounts: Partial<Record<ChangeType, number>> = {};
  for (const c of entry.changes) {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  }

  return (
    <div className="relative pl-8 md:pl-12">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-0 md:left-2 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-950 transition-colors',
          isLatest
            ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/20'
            : 'bg-surface-800'
        )}
      >
        {isLatest ? (
          <Star className="h-3 w-3 text-white" />
        ) : (
          <Tag className="h-3 w-3 text-surface-500" />
        )}
      </div>

      <Card
        className={cn(
          'transition-all duration-200',
          isLatest && 'ring-1 ring-primary-500/20'
        )}
        padding="none"
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left px-6 py-5 cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Version + date row */}
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-0.5 text-xs font-bold text-primary-700">
                  <Rocket className="h-3 w-3" />
                  v{entry.version}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-surface-500">
                  <Calendar className="h-3 w-3" />
                  {formatReleaseDate(entry.date)}
                </span>
                {isLatest && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Latest
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-surface-100 mb-1">
                {entry.title}
              </h3>

              {/* Summary */}
              <p className="text-sm text-surface-400 leading-relaxed line-clamp-2">
                {entry.summary}
              </p>
            </div>

            {/* Expand/collapse indicator */}
            <div className="flex items-center gap-2 shrink-0 sm:mt-1">
              {/* Type counts */}
              <div className="hidden sm:flex items-center gap-1.5">
                {Object.entries(typeCounts).map(([type, count]) => {
                  const meta = typeMeta[type as ChangeType];
                  const Icon = meta.icon;
                  return (
                    <span
                      key={type}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                        meta.bgColor,
                        meta.color
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {count}
                    </span>
                  );
                })}
              </div>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-surface-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-surface-500" />
              )}
            </div>
          </div>

          {/* Highlight badges */}
          {entry.highlights && entry.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {entry.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 rounded-lg bg-surface-800/60 px-2.5 py-1 text-xs font-medium text-surface-300"
                >
                  <Zap className="h-3 w-3 text-primary-500" />
                  {h}
                </span>
              ))}
            </div>
          )}
        </button>

        {/* Expanded change list */}
        {expanded && (
          <div className="border-t border-surface-700/60 px-6 py-4">
            <div className="space-y-2">
              {filteredChanges.map((change, i) => {
                const meta = typeMeta[change.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-surface-800/30 transition-colors"
                  >
                    <span
                      className={cn(
                        'mt-0.5 inline-flex items-center gap-1 shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                        meta.bgColor,
                        meta.color
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {meta.label}
                    </span>
                    <p className="text-sm text-surface-300 leading-relaxed">
                      {change.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Changelog Page                                                            */
/* -------------------------------------------------------------------------- */
export default function ChangelogPage() {
  const [filter, setFilter] = useState<ChangeType | 'all'>('all');

  // Count total changes
  const totalChanges = changelog.reduce(
    (sum, entry) => sum + entry.changes.length,
    0
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link + Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>

        <PageHeader
          title="Changelog"
          description="See what we shipped."
        />
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2 rounded-lg bg-surface-800/40 px-3.5 py-2">
          <Rocket className="h-4 w-4 text-primary-500" />
          <span className="font-semibold text-surface-200">
            {changelog.length}
          </span>
          <span className="text-surface-500">releases</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface-800/40 px-3.5 py-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span className="font-semibold text-surface-200">
            {totalChanges}
          </span>
          <span className="text-surface-500">updates shipped</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-surface-800/40 px-3.5 py-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="text-surface-500">Since</span>
          <span className="font-semibold text-surface-200">
            {formatReleaseDate(changelog[changelog.length - 1].date)}
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150 cursor-pointer',
              filter === opt.value
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                : 'bg-surface-800/40 text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3 md:left-5 top-6 bottom-0 w-px bg-surface-700/60" />

        <div className="space-y-6">
          {changelog.map((entry, i) => (
            <ChangelogCard
              key={entry.version}
              entry={entry}
              filter={filter}
              isLatest={i === 0}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-800/40 px-5 py-2.5 text-sm text-surface-500">
          <Rocket className="h-4 w-4 text-primary-500" />
          You&apos;re all caught up — more updates coming soon!
        </div>
      </div>
    </div>
  );
}
