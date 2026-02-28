'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/input';
import { useActivityLog } from '@/components/activity-log-provider';
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  type ActionCategory,
} from '@/lib/activity-log';
import {
  Activity,
  ChevronDown,
  User,
  Clock,
  Package,
  Users,
  Mail,
  Truck,
  Bell,
  Settings,
  Shield,
  FileText,
  BarChart3,
  Award,
  UserPlus,
  TrendingUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Category icon map                                                         */
/* -------------------------------------------------------------------------- */
const categoryIcons: Record<ActionCategory, { icon: React.ElementType; color: string; bg: string }> = {
  package: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  customer: { icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/15' },
  mail: { icon: Mail, color: 'text-cyan-600', bg: 'bg-cyan-500/15' },
  shipment: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  notification: { icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
  settings: { icon: Settings, color: 'text-surface-400', bg: 'bg-surface-700/30' },
  user: { icon: UserPlus, color: 'text-violet-400', bg: 'bg-violet-500/15' },
  loyalty: { icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  compliance: { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  invoice: { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  report: { icon: BarChart3, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  auth: { icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/15' },
};

/* -------------------------------------------------------------------------- */
/*  Time formatting                                                           */
/* -------------------------------------------------------------------------- */
function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/* -------------------------------------------------------------------------- */
/*  Role badge colors                                                         */
/* -------------------------------------------------------------------------- */
const roleBadgeStyle: Record<string, string> = {
  admin: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  manager: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  employee: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Activity Entry Row — Expandable with metadata/diff view                   */
/* -------------------------------------------------------------------------- */
function ActivityEntryRow({ entry }: { entry: import('@/lib/activity-log').ActivityLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const catCfg = categoryIcons[entry.category] || categoryIcons.package;
  const CatIcon = catCfg.icon;
  const roleStyle = roleBadgeStyle[entry.userRole] || roleBadgeStyle.employee;
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;
  const oldData = entry.metadata?.oldData as Record<string, unknown> | undefined;
  const newData = entry.metadata?.newData as Record<string, unknown> | undefined;
  const hasDiff = oldData && newData;

  return (
    <div className="rounded-lg hover:bg-surface-800/50 transition-colors">
      <button
        onClick={() => hasMetadata && setExpanded(!expanded)}
        className={`w-full group flex items-start gap-3 px-3 py-2.5 text-left ${hasMetadata ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Category icon */}
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${catCfg.bg}`}>
          <CatIcon className={`h-4 w-4 ${catCfg.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-surface-200 leading-snug">{entry.description}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px]">
              <User className="h-3 w-3 text-surface-500" />
              <span className="font-medium text-surface-400">{entry.userName}</span>
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${roleStyle}`}>
              {entry.userRole}
            </span>
            {entry.entityLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] text-surface-500">
                <span className="text-surface-600">·</span>
                <span className="font-mono">{entry.entityLabel}</span>
              </span>
            )}
            <span className="hidden group-hover:inline-flex items-center gap-1 text-[10px] text-surface-500 bg-surface-800/60 px-1.5 py-0.5 rounded">
              {ACTION_LABELS[entry.action] || entry.action}
            </span>
            {hasMetadata && (
              <ChevronDown className={`h-3 w-3 text-surface-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1 text-xs text-surface-500">
            <Clock className="h-3 w-3" />
            {timeAgo(entry.timestamp)}
          </div>
          <p className="text-[10px] text-surface-600 mt-0.5 hidden group-hover:block">
            {formatTimestamp(entry.timestamp)}
          </p>
        </div>
      </button>

      {/* Expandable metadata / diff view */}
      {expanded && hasMetadata && (
        <div className="ml-14 mr-3 mb-3 p-3 rounded-lg bg-surface-900/80 border border-surface-800 text-xs">
          {hasDiff ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Changes</p>
              {Object.keys({ ...oldData, ...newData }).map((key) => {
                const oldVal = oldData[key];
                const newVal = newData[key];
                if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className="font-mono text-surface-500 min-w-[100px]">{key}:</span>
                    <div className="flex flex-col gap-0.5">
                      {oldVal !== undefined && (
                        <span className="text-red-400/70 line-through">{String(oldVal)}</span>
                      )}
                      {newVal !== undefined && (
                        <span className="text-emerald-400">{String(newVal)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">Details</p>
              {Object.entries(entry.metadata!).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="font-mono text-surface-500 min-w-[100px]">{key}:</span>
                  <span className="text-surface-300">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActivityLogPage() {
  const { entries, loading, refresh } = useActivityLog();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  // Unique users from log
  const users = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    entries.forEach((e) => {
      if (!map.has(e.userId)) {
        map.set(e.userId, { id: e.userId, name: e.userName, role: e.userRole });
      }
    });
    return Array.from(map.values());
  }, [entries]);

  // Stats
  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayActions = entries.filter(
      (e) => new Date(e.timestamp).getTime() >= todayStart.getTime()
    );

    // Most active user today
    const userCounts = new Map<string, number>();
    todayActions.forEach((e) => {
      userCounts.set(e.userName, (userCounts.get(e.userName) ?? 0) + 1);
    });
    const topUser = [...userCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    // Most common category
    const catCounts = new Map<string, number>();
    todayActions.forEach((e) => {
      catCounts.set(e.category, (catCounts.get(e.category) ?? 0) + 1);
    });
    const topCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      totalToday: todayActions.length,
      totalAll: entries.length,
      topUser: topUser ? { name: topUser[0], count: topUser[1] } : null,
      topCategory: topCategory
        ? { name: CATEGORY_LABELS[topCategory[0] as ActionCategory] || topCategory[0], count: topCategory[1] }
        : null,
      uniqueUsers: users.length,
    };
  }, [entries, users]);

  // Filtered entries
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (userFilter !== 'all' && e.userId !== userFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          e.userName.toLowerCase().includes(q) ||
          e.entityLabel?.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, categoryFilter, userFilter, search]);

  const categories = Object.keys(CATEGORY_LABELS) as ActionCategory[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Activity Log"
          description="Track every action in one place."
          icon={<Activity className="h-5 w-5" />}
        />
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="h-5 w-5 text-primary-600" />}
          title="Actions Today"
          value={stats.totalToday}
          className="[&>div>div]:bg-primary-50 [&>div>div]:text-primary-600"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          title="Total Actions"
          value={stats.totalAll}
          className="[&>div>div]:bg-emerald-50 [&>div>div]:text-emerald-600"
        />
        <StatCard
          icon={<User className="h-5 w-5 text-violet-400" />}
          title="Most Active"
          value={stats.topUser?.name?.split(' ')[0] || '—'}
          className="[&>div>div]:bg-violet-500/15 [&>div>div]:text-violet-400"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-amber-500" />}
          title="Top Category"
          value={stats.topCategory?.name || '—'}
          className="[&>div>div]:bg-amber-50 [&>div>div]:text-amber-600"
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <Card padding="none">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <SearchInput
                placeholder="Search actions, users, entities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Quick filters */}
            <div className="flex items-center gap-2">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...categories.map((cat) => ({
                    value: cat,
                    label: CATEGORY_LABELS[cat],
                  })),
                ]}
              />

              <Select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Users' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: u.name,
                  })),
                ]}
              />
            </div>

            {/* Result count */}
            <span className="text-xs text-surface-500">
              {filtered.length} action{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Activity List ─────────────────────────────────────────────── */}
      <Card padding="none">
        <CardHeader className="px-5 pt-5 pb-0">
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>

        <div className="px-5 pb-5 pt-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-surface-500">
              <Loader2 className="h-10 w-10 mb-3 text-surface-600 animate-spin" />
              <p className="text-sm font-medium">Loading activity…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-surface-500">
              <Activity className="h-10 w-10 mb-3 text-surface-600" />
              <p className="text-sm font-medium">No activity found</p>
              <p className="text-xs mt-1">{entries.length === 0 ? 'Activity will appear here as actions are performed in the system' : 'Try adjusting your filters'}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((entry) => (
                  <ActivityEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
