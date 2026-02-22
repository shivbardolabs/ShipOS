'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/ui/card';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PackagePlus,
  Package,
  PackageCheck,
  Users,
  AlertTriangle,
  Truck,
  DollarSign,
  Bell,
  PackageOpen,
  Search,
  Send,
  CalendarCheck,
  Clock,
  Mail,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Printer,
  Navigation,
  MessageSquare,
} from 'lucide-react';
import {
  dashboardStats,
  recentActivity,
} from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Activity icon mapping                                                     */
/* -------------------------------------------------------------------------- */
const activityIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  package_checkin: { icon: PackagePlus, color: 'text-blue-600 bg-blue-50' },
  package_release: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  notification: { icon: Bell, color: 'text-amber-600 bg-amber-50' },
  shipment: { icon: Truck, color: 'text-indigo-600 bg-indigo-50' },
  mail: { icon: Mail, color: 'text-cyan-600 bg-cyan-500/15' },
  customer: { icon: UserPlus, color: 'text-teal-400 bg-teal-500/15' },
  alert: { icon: ShieldAlert, color: 'text-rose-400 bg-rose-500/15' },
};

/* -------------------------------------------------------------------------- */
/*  Favorites Grid config (12 tiles — the core POS pattern)                   */
/* -------------------------------------------------------------------------- */
interface FavoriteTile {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  badge?: string;
  subtitle?: string;
}

const favoriteTiles: FavoriteTile[] = [
  {
    label: 'Check In Package',
    icon: PackagePlus,
    href: '/dashboard/packages/check-in',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-500/25',
  },
  {
    label: 'Check Out Package',
    icon: PackageOpen,
    href: '/dashboard/packages/check-out',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-500/25',
    badge: `${dashboardStats.packagesHeld} held`,
  },
  {
    label: 'Customer Lookup',
    icon: Search,
    href: '/dashboard/customers',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15 hover:bg-teal-500/25',
  },
  {
    label: 'Send SMS',
    icon: Send,
    href: '/dashboard/notifications',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-500/25',
    subtitle: '98% open rate',
  },
  {
    label: 'New Shipment',
    icon: Truck,
    href: '/dashboard/shipping',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-500/25',
  },
  {
    label: 'Mail Scan',
    icon: Mail,
    href: '/dashboard/mail',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/15 hover:bg-cyan-500/25',
  },
  {
    label: 'End of Day',
    icon: CalendarCheck,
    href: '/dashboard/end-of-day',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15 hover:bg-rose-500/25',
  },
  {
    label: 'Daily Report',
    icon: BarChart3,
    href: '/dashboard/reports',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-500/25',
  },
  {
    label: 'ID Expiring',
    icon: AlertTriangle,
    href: '/dashboard/compliance',
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-500/25',
    badge: `${dashboardStats.idExpiringSoon}`,
  },
  {
    label: 'Create Invoice',
    icon: FileText,
    href: '/dashboard/invoicing',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15 hover:bg-orange-500/25',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/15 hover:bg-gray-500/25',
  },
  {
    label: 'Package Mgmt',
    icon: Package,
    href: '/dashboard/packages',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-500/25',
  },
];

/* -------------------------------------------------------------------------- */
/*  Onboarding steps                                                          */
/* -------------------------------------------------------------------------- */
const onboardingSteps = [
  {
    label: 'Add customers',
    description: 'Import or create your customer list',
    href: '/dashboard/customers',
    icon: Users,
  },
  {
    label: 'Configure printers',
    description: 'Set up label and receipt printers',
    href: '/dashboard/settings',
    icon: Printer,
  },
  {
    label: 'Set carrier rates',
    description: 'Configure shipping margins',
    href: '/dashboard/settings',
    icon: Navigation,
  },
  {
    label: 'Send test notification',
    description: 'Verify SMS & email delivery',
    href: '/dashboard/notifications',
    icon: MessageSquare,
  },
];

/* -------------------------------------------------------------------------- */
/*  Package volume chart data (last 7 days)                                   */
/* -------------------------------------------------------------------------- */
function buildVolumeData() {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date('2026-02-21');
  const data: { day: string; date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dayIndex = d.getDay();
    const base = [6, 14, 18, 12, 20, 16, 8];
    const count = base[dayIndex] + Math.floor(Math.abs(Math.sin(i * 2.7)) * 5);
    data.push({
      day: dayNames[dayIndex],
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    });
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/*  Time formatting                                                           */
/* -------------------------------------------------------------------------- */
function timeAgo(isoString: string): string {
  const now = new Date('2026-02-21T15:00:00');
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Page                                                            */
/* -------------------------------------------------------------------------- */
export default function DashboardPage() {
  const volumeData = useMemo(() => buildVolumeData(), []);
  const maxVolume = Math.max(...volumeData.map((v) => v.count));
  const s = dashboardStats;

  const [showAllStats, setShowAllStats] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const { user } = useUser();

  // Hydrate time on client only (avoids SSR/client mismatch)
  useEffect(() => {
    setNow(new Date());
  }, []);

  const greeting = (() => {
    if (!now) return 'Welcome';
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const dateString = now
    ? now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  /* Secondary stats for the "Quick Stats" sidebar */
  const secondaryStats = [
    { label: 'Active Customers', value: s.activeCustomers, icon: Users, color: 'text-primary-600', bgColor: 'bg-primary-50' },
    { label: 'ID Expiring Soon', value: s.idExpiringSoon, icon: AlertTriangle, color: 'text-rose-400', bgColor: 'bg-rose-500/15' },
    { label: 'Shipments Today', value: s.shipmentsToday, icon: Truck, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { label: 'Notifications Sent', value: s.notificationsSent, icon: Bell, color: 'text-primary-600', bgColor: 'bg-primary-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description={`${greeting}, ${firstName}${dateString ? ` — ${dateString}` : ''}`}
      />

      {/* ------------------------------------------------------------------ */}
      {/*  Quick Setup Onboarding Banner                                      */}
      {/* ------------------------------------------------------------------ */}
      {showOnboarding && (
        <div className="glass-card p-5 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 via-transparent to-primary-600/5 pointer-events-none" />

          <div className="relative">
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                  <Sparkles className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-100">
                    Get started with ShipOS
                  </h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Complete these steps to unlock the full experience
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboarding(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-surface-400">Progress</span>
                <span className="text-xs font-semibold text-surface-300">0 / 4 complete</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500"
                  style={{ width: '0%' }}
                />
              </div>
            </div>

            {/* Step cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {onboardingSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.label}
                    href={step.href}
                    className="group flex items-start gap-3 rounded-xl border border-surface-700/60 bg-surface-900/40 p-3.5 hover:border-primary-200 hover:bg-surface-800/50 transition-all duration-150"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-800/80 group-hover:bg-primary-50 transition-colors">
                      <Icon className="h-4 w-4 text-surface-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-200 leading-snug">
                        {step.label}
                      </p>
                      <p className="text-xs text-surface-500 mt-0.5 leading-snug">
                        {step.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Operational Pulse — Primary 4 stat cards + expandable 8            */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500">
            Operational Pulse
          </h2>
          <button
            onClick={() => setShowAllStats(!showAllStats)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {showAllStats ? 'Show Less' : 'Show All'}
            {showAllStats ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Primary 4 — always visible */}
          <StatCard
            icon={<Package className="h-5 w-5 text-amber-600" />}
            title="Packages Held"
            value={s.packagesHeld}
            change={-3}
            className="[&>div>div]:bg-amber-50 [&>div>div]:text-amber-600"
          />
          <StatCard
            icon={<PackagePlus className="h-5 w-5 text-teal-400" />}
            title="Checked In Today"
            value={s.packagesCheckedInToday}
            change={12}
            className="[&>div>div]:bg-teal-500/15 [&>div>div]:text-teal-400"
          />
          <StatCard
            icon={<PackageCheck className="h-5 w-5 text-emerald-600" />}
            title="Released Today"
            value={s.packagesReleasedToday}
            change={8}
            className="[&>div>div]:bg-emerald-50 [&>div>div]:text-emerald-600"
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-green-400" />}
            title="Revenue Today"
            value={formatCurrency(s.revenueToday)}
            change={6}
            className="[&>div>div]:bg-green-500/15 [&>div>div]:text-green-400"
          />

          {/* Secondary 4 — progressive disclosure */}
          {showAllStats && (
            <>
              <StatCard
                icon={<Users className="h-5 w-5 text-primary-600" />}
                title="Active Customers"
                value={s.activeCustomers}
                change={2}
                className="[&>div>div]:bg-primary-50 [&>div>div]:text-primary-600"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
                title="ID Expiring Soon"
                value={s.idExpiringSoon}
                className="[&>div>div]:bg-rose-500/15 [&>div>div]:text-rose-400"
              />
              <StatCard
                icon={<Truck className="h-5 w-5 text-indigo-600" />}
                title="Shipments Today"
                value={s.shipmentsToday}
                change={15}
                className="[&>div>div]:bg-indigo-50 [&>div>div]:text-indigo-600"
              />
              <StatCard
                icon={<Bell className="h-5 w-5 text-primary-600" />}
                title="Notifications Sent"
                value={s.notificationsSent}
                className="[&>div>div]:bg-primary-50 [&>div>div]:text-primary-600"
              />
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Favorites Grid — the key POS pattern                              */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-surface-500 mb-3">
          Favorites
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3">
          {favoriteTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.label}
                href={tile.href}
                className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-700/60 p-4 min-h-[88px] text-center transition-all duration-150 hover:border-surface-700/50 hover:scale-[1.02] active:scale-[0.98] ${tile.bgColor}`}
              >
                {/* Badge */}
                {tile.badge && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-surface-100 shadow-lg shadow-red-500/25">
                    {tile.badge}
                  </span>
                )}

                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-surface-900/60 group-hover:bg-surface-900/80 transition-colors ${tile.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-surface-300 leading-tight">
                  {tile.label}
                </span>

                {/* Subtitle */}
                {tile.subtitle && (
                  <span className="text-[10px] text-surface-500 -mt-1 leading-tight">
                    {tile.subtitle}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Activity Feed + Quick Stats                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity — 2/3 */}
        <Card className="lg:col-span-2" padding="none">
          <CardHeader className="px-6 pt-5 pb-0">
            <CardTitle>Recent Activity</CardTitle>
            <span className="text-xs text-surface-500">Last 24 hours</span>
          </CardHeader>
          <div className="px-6 pb-5 pt-3">
            <div className="space-y-0.5">
              {recentActivity.map((item) => {
                const cfg = activityIconMap[item.type] || activityIconMap.notification;
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-surface-800/50 transition-colors"
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 leading-snug">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-xs text-surface-500">
                      <Clock className="h-3 w-3" />
                      {timeAgo(item.time)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Quick Stats — 1/3 compact sidebar */}
        <Card padding="none">
          <CardHeader className="px-6 pt-5 pb-0">
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5 pt-3 space-y-2">
            {secondaryStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-xl bg-surface-800/30 px-4 py-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-500 leading-snug">
                      {stat.label}
                    </p>
                    <p className="text-lg font-bold text-surface-100 leading-snug">
                      {stat.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Package Volume Chart                                              */}
      {/* ------------------------------------------------------------------ */}
      <Card padding="none">
        <CardHeader className="px-6 pt-5 pb-0">
          <CardTitle>Package Volume</CardTitle>
          <span className="text-xs text-surface-500">Last 7 days</span>
        </CardHeader>
        <div className="px-6 pb-6 pt-4">
          <div className="flex items-end gap-3 h-48">
            {volumeData.map((item) => {
              const heightPct = maxVolume > 0 ? (item.count / maxVolume) * 100 : 0;
              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-semibold text-surface-300">
                    {item.count}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500 hover:from-primary-500 hover:to-primary-300"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-surface-400">
                      {item.day}
                    </p>
                    <p className="text-[10px] text-surface-600">{item.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
