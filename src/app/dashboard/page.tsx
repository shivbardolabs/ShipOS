'use client';

import { useMemo } from 'react';
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
  CheckCircle2 } from 'lucide-react';
import {
  dashboardStats,
  recentActivity,
  currentUser } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Activity icon mapping                                                     */
/* -------------------------------------------------------------------------- */
const activityIconMap: Record<string, { icon: React.ElementType; color: string }> = {
  package_checkin: { icon: PackagePlus, color: 'text-blue-400 bg-blue-500/15' },
  package_release: { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/15' },
  notification: { icon: Bell, color: 'text-amber-400 bg-amber-500/15' },
  shipment: { icon: Truck, color: 'text-violet-400 bg-violet-500/15' },
  mail: { icon: Mail, color: 'text-cyan-400 bg-cyan-500/15' },
  customer: { icon: UserPlus, color: 'text-teal-400 bg-teal-500/15' },
  alert: { icon: ShieldAlert, color: 'text-rose-400 bg-rose-500/15' } };

/* -------------------------------------------------------------------------- */
/*  Quick action config                                                       */
/* -------------------------------------------------------------------------- */
const quickActions = [
  { label: 'Check In Package', icon: PackagePlus, href: '/dashboard/packages/check-in', color: 'text-blue-400 bg-blue-500/15 hover:bg-blue-500/25' },
  { label: 'Check Out Package', icon: PackageOpen, href: '/dashboard/packages/check-out', color: 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25' },
  { label: 'Look Up Customer', icon: Search, href: '/dashboard/customers', color: 'text-teal-400 bg-teal-500/15 hover:bg-teal-500/25' },
  { label: 'New Shipment', icon: Truck, href: '/dashboard/shipments', color: 'text-violet-400 bg-violet-500/15 hover:bg-violet-500/25' },
  { label: 'Send Notification', icon: Send, href: '/dashboard/notifications', color: 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25' },
  { label: 'End of Day', icon: CalendarCheck, href: '/dashboard/reports', color: 'text-rose-400 bg-rose-500/15 hover:bg-rose-500/25' },
];

/* -------------------------------------------------------------------------- */
/*  Package volume data (last 7 days)                                         */
/* -------------------------------------------------------------------------- */
function buildVolumeData() {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date('2026-02-21');
  const data: { day: string; date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const dayIndex = d.getDay();
    // Simulated realistic volume
    const base = [6, 14, 18, 12, 20, 16, 8]; // Sun-Sat pattern
    const count = base[dayIndex] + Math.floor(Math.abs(Math.sin(i * 2.7)) * 5);
    data.push({
      day: dayNames[dayIndex],
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count });
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

  const greeting = (() => {
    const h = 10; // morning context
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description={`${greeting}, ${currentUser.name.split(' ')[0]} — Saturday, February 21, 2026`}
      />

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<PackagePlus className="h-5 w-5 text-teal-400" />}
          title="Packages Checked In Today"
          value={s.packagesCheckedInToday}
          change={12}
          className="[&>div>div]:bg-teal-500/15 [&>div>div]:text-teal-400"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-amber-400" />}
          title="Packages Held"
          value={s.packagesHeld}
          change={-3}
          className="[&>div>div]:bg-amber-500/15 [&>div>div]:text-amber-400"
        />
        <StatCard
          icon={<PackageCheck className="h-5 w-5 text-emerald-400" />}
          title="Released Today"
          value={s.packagesReleasedToday}
          change={8}
          className="[&>div>div]:bg-emerald-500/15 [&>div>div]:text-emerald-400"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-primary-400" />}
          title="Active Customers"
          value={s.activeCustomers}
          change={2}
          className="[&>div>div]:bg-primary-600/15 [&>div>div]:text-primary-400"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-rose-400" />}
          title="ID Expiring Soon"
          value={s.idExpiringSoon}
          className="[&>div>div]:bg-rose-500/15 [&>div>div]:text-rose-400"
        />
        <StatCard
          icon={<Truck className="h-5 w-5 text-violet-400" />}
          title="Shipments Today"
          value={s.shipmentsToday}
          change={15}
          className="[&>div>div]:bg-violet-500/15 [&>div>div]:text-violet-400"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
          title="Revenue Today"
          value={formatCurrency(s.revenueToday)}
          change={6}
          className="[&>div>div]:bg-emerald-500/15 [&>div>div]:text-emerald-400"
        />
        <StatCard
          icon={<Bell className="h-5 w-5 text-primary-400" />}
          title="Notifications Sent"
          value={s.notificationsSent}
          className="[&>div>div]:bg-primary-600/15 [&>div>div]:text-primary-400"
        />
      </div>

      {/* Two Column: Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity — wider */}
        <Card className="lg:col-span-2" padding="none">
          <CardHeader className="px-6 pt-5 pb-0">
            <CardTitle>Recent Activity</CardTitle>
            <span className="text-xs text-surface-500">Last 24 hours</span>
          </CardHeader>
          <div className="px-6 pb-5 pt-3">
            <div className="space-y-1">
              {recentActivity.map((item) => {
                const cfg = activityIconMap[item.type] || activityIconMap.notification;
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-800/50 transition-colors"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 leading-snug">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-xs text-surface-500">
                      <Clock className="h-3 w-3" />
                      {timeAgo(item.time)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card padding="none">
          <CardHeader className="px-6 pt-5 pb-0">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5 pt-3">
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <a
                    key={action.label}
                    href={action.href}
                    className={`flex flex-col items-center gap-2.5 rounded-xl p-4 text-center transition-all duration-150 border border-transparent hover:border-surface-700/50 ${action.color}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-800/80">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-surface-300 leading-tight">
                      {action.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Package Volume Chart */}
      <Card padding="none">
        <CardHeader className="px-6 pt-5 pb-0">
          <CardTitle>Package Volume</CardTitle>
          <span className="text-xs text-surface-500">Last 7 days</span>
        </CardHeader>
        <div className="px-6 pb-6 pt-4">
          {/* CSS bar chart — no external lib dependency */}
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
