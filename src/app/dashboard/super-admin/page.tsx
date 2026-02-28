'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import {
  LayoutDashboard,
  Building2,
  Store,
  DollarSign,
  AlertTriangle,
  Users,
  BarChart3,
  Activity,
  ArrowRight,
  Clock,
  Shield,
  Flag,
  ScrollText,
  CreditCard,
  Tag,
  Send,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Mock summary data                                                         */
/* -------------------------------------------------------------------------- */
const summaryMetrics = {
  totalClients: 24,
  activeClients: 18,
  inactiveClients: 6,
  totalStores: 67,
  activeStores: 52,
  inactiveStores: 15,
  totalMRR: 6500.0,
  overduePayments: 3,
  pendingPayments: 2,
  totalSuperAdmins: 4,
  activeSuperAdmins: 3,
};

const recentActivity = [
  { id: '1', action: 'Client activated', target: 'Pack & Ship Plus', time: '2 hours ago', type: 'success' as const },
  { id: '2', action: 'Store added', target: 'MailBox Express – Downtown', time: '4 hours ago', type: 'info' as const },
  { id: '3', action: 'Payment overdue', target: 'Quick Mail Center', time: '1 day ago', type: 'danger' as const },
  { id: '4', action: 'New client provisioned', target: 'Metro Mail Hub', time: '2 days ago', type: 'success' as const },
  { id: '5', action: 'Super admin created', target: 'dave@bardolabs.ai', time: '3 days ago', type: 'info' as const },
  { id: '6', action: 'Subscription updated', target: 'Ship N Go', time: '3 days ago', type: 'warning' as const },
];

const topClients = [
  { name: 'Pack & Ship Plus', stores: 8, mrr: 1000.0, status: 'active' },
  { name: 'MailBox Express', stores: 6, mrr: 750.0, status: 'active' },
  { name: 'Metro Mail Hub', stores: 5, mrr: 625.0, status: 'active' },
  { name: 'Quick Mail Center', stores: 4, mrr: 500.0, status: 'active' },
  { name: 'Ship N Go', stores: 3, mrr: 375.0, status: 'active' },
];

/* -------------------------------------------------------------------------- */
/*  Console modules — the 9 sections accessible from the dashboard            */
/* -------------------------------------------------------------------------- */
const consoleModules = [
  {
    label: 'Client Provisioning',
    href: '/dashboard/super-admin/clients',
    icon: Building2,
    description: 'Manage clients, stores, and onboarding',
    color: '#3b82f6',
  },
  {
    label: 'Admin Users',
    href: '/dashboard/super-admin/users',
    icon: Users,
    description: 'Manage super admin user accounts',
    color: '#8b5cf6',
  },
  {
    label: 'Billing & Reports',
    href: '/dashboard/super-admin/billing',
    icon: CreditCard,
    description: 'Revenue, invoices, and financial reports',
    color: '#10b981',
  },
  {
    label: 'Master Admin',
    href: '/dashboard/super-admin/master-admin',
    icon: Shield,
    description: 'Cross-tenant user directory and sessions',
    color: '#f59e0b',
  },
  {
    label: 'Feature Flags',
    href: '/dashboard/super-admin/feature-flags',
    icon: Flag,
    description: 'Toggle features per tenant or user',
    color: '#e11d48',
  },
  {
    label: 'Legal Documents',
    href: '/dashboard/super-admin/legal',
    icon: ScrollText,
    description: 'Terms, privacy policy, and compliance docs',
    color: '#6366f1',
  },
  {
    label: 'Analytics',
    href: '/dashboard/super-admin/analytics',
    icon: BarChart3,
    description: 'Platform-wide analytics and insights',
    color: '#06b6d4',
  },
  {
    label: 'Tag Manager',
    href: '/dashboard/super-admin/tag-manager',
    icon: Tag,
    description: 'Manage tracking tags and scripts',
    color: '#d946ef',
  },
  {
    label: 'Deliverability',
    href: '/dashboard/super-admin/deliverability',
    icon: Send,
    description: 'Email and SMS deliverability monitoring',
    color: '#f97316',
  },
];

/* -------------------------------------------------------------------------- */
/*  Dashboard Page (BAR-237)                                                  */
/* -------------------------------------------------------------------------- */
export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Console"
        description="Platform overview — clients, stores, revenue, and system health"
        icon={<LayoutDashboard className="h-6 w-6" />}
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/dashboard/super-admin/clients">
          <StatCard
            icon={<Building2 className="h-5 w-5" />}
            title="Total Clients"
            value={summaryMetrics.totalClients}
            change={8.3}
            className="card-hover cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/super-admin/clients">
          <StatCard
            icon={<Store className="h-5 w-5" />}
            title="Active Stores"
            value={`${summaryMetrics.activeStores} / ${summaryMetrics.totalStores}`}
            change={4.2}
            className="card-hover cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/super-admin/billing">
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            title="Monthly Recurring Revenue"
            value={`$${summaryMetrics.totalMRR.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            change={12.5}
            className="card-hover cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/super-admin/billing">
          <div className="glass-card p-5 card-hover cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              {summaryMetrics.overduePayments > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                  Action needed
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-surface-100">{summaryMetrics.overduePayments}</p>
            <p className="mt-1 text-xs text-surface-400">Overdue Payments</p>
          </div>
        </Link>
      </div>

      {/* ── Console Modules Grid ── */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Console Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {consoleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href}>
                <div className="glass-card p-4 card-hover cursor-pointer group transition-all duration-200 hover:border-surface-600">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${mod.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: mod.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-surface-100 group-hover:text-white truncate">
                          {mod.label}
                        </p>
                        <ArrowRight className="h-4 w-4 text-surface-600 group-hover:text-surface-400 transition-colors flex-shrink-0" />
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Recent Activity + Top Clients */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-surface-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 h-2 w-2 rounded-full flex-shrink-0',
                      item.type === 'success' && 'bg-emerald-400',
                      item.type === 'info' && 'bg-blue-400',
                      item.type === 'danger' && 'bg-red-400',
                      item.type === 'warning' && 'bg-yellow-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200">
                      {item.action} — <span className="font-medium text-surface-100">{item.target}</span>
                    </p>
                    <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by MRR</CardTitle>
            <Link href="/dashboard/super-admin/billing" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.map((client, i) => (
                <div key={client.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-800 text-xs font-bold text-surface-400">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-200 truncate">{client.name}</p>
                    <p className="text-xs text-surface-500">{client.stores} stores</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-surface-100">
                      ${client.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-surface-500">/month</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
