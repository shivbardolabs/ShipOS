'use client';

import { useMemo } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Card } from '@/components/ui/card';
import { TRACKED_EVENTS, type TrackedEventDefinition } from '@/lib/analytics';
import {
  BarChart3,
  ExternalLink,
  AlertCircle,
  Activity,
  Eye,
  MousePointerClick,
  UserCheck,
  Settings,
  Users,
  Package,
  Truck,
  CalendarClock,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Category metadata                                                         */
/* -------------------------------------------------------------------------- */

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  navigation: Eye,
  auth: UserCheck,
  packages: Package,
  customers: Users,
  operations: Truck,
  admin: Settings,
};

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  auth: 'Authentication',
  packages: 'Packages',
  customers: 'Customers',
  operations: 'Operations',
  admin: 'Administration',
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function AnalyticsAdminPage() {
  const { localUser } = useTenant();

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  // Group tracked events by category (must be called before any early return)
  const grouped = useMemo(() => {
    const map: Record<string, TrackedEventDefinition[]> = {};
    for (const ev of TRACKED_EVENTS) {
      (map[ev.category] ??= []).push(ev);
    }
    return map;
  }, []);

  // ── Guard: superadmin only ──
  if (localUser && localUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-surface-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-surface-300">Access Denied</h2>
          <p className="text-surface-500 mt-1">Superadmin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-400" />
            Analytics
          </h1>
          <p className="text-surface-400 mt-1">
            PostHog integration, tracked events, and weekly reports
          </p>
        </div>
      </div>

      {/* ── PostHog Connection Status ───────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              PostHog Integration
            </h2>
            <p className="text-surface-400 text-sm mt-1">
              Product analytics, session replay, and feature flags
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              posthogKey
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${posthogKey ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {posthogKey ? 'Connected' : 'Not configured'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide">Project Key</p>
            <p className="text-sm text-surface-300 mt-1 font-mono truncate">
              {posthogKey ? `${posthogKey.slice(0, 12)}…` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide">API Host</p>
            <p className="text-sm text-surface-300 mt-1 font-mono truncate">{posthogHost}</p>
          </div>
          <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide">Features</p>
            <p className="text-sm text-surface-300 mt-1">
              Pageviews · Session Replay · Autocapture · Feature Flags
            </p>
          </div>
        </div>

        {posthogKey && (
          <div className="mt-4">
            <a
              href={`${posthogHost.replace('/i.', '/app.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Open PostHog Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </Card>

      {/* ── Tracked Events Catalogue ───────────────────────────────────── */}
      <Card>
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
          <MousePointerClick className="h-5 w-5 text-indigo-400" />
          Tracked Events
        </h2>
        <p className="text-surface-400 text-sm mt-1 mb-4">
          Events captured by the ShipOS analytics wrapper
        </p>

        <div className="space-y-4">
          {Object.entries(grouped).map(([category, events]) => {
            const Icon = CATEGORY_ICONS[category] ?? Activity;
            return (
              <div key={category}>
                <h3 className="text-sm font-medium text-surface-400 flex items-center gap-1.5 mb-2">
                  <Icon className="h-4 w-4" />
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <div className="space-y-1">
                  {events.map((ev) => (
                    <div
                      key={ev.name}
                      className="flex items-center justify-between rounded-lg bg-surface-900/50 border border-surface-800 px-4 py-2.5"
                    >
                      <div>
                        <code className="text-sm text-indigo-300 font-mono">{ev.name}</code>
                        <p className="text-xs text-surface-500 mt-0.5">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Weekly Report ──────────────────────────────────────────────── */}
      <Card>
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-indigo-400" />
          Weekly Analytics Report
        </h2>
        <p className="text-surface-400 text-sm mt-1 mb-4">
          Automated weekly digest generated every Monday via <code className="text-xs bg-surface-800 px-1.5 py-0.5 rounded">/api/cron/analytics-report</code>
        </p>

        <div className="rounded-lg bg-surface-900/50 border border-surface-800 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500 w-28 shrink-0">Schedule</span>
            <span className="text-sm text-surface-300">Every Monday at 8:00 AM UTC</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500 w-28 shrink-0">Report Period</span>
            <span className="text-sm text-surface-300">Previous Monday → Sunday</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500 w-28 shrink-0">Includes</span>
            <span className="text-sm text-surface-300">Page views, logins, actions by page & category</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500 w-28 shrink-0">Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 text-xs font-medium">
              Placeholder — wire PostHog API for real data
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
