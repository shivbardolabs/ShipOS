'use client';
/* eslint-disable */

import { useState, useEffect } from 'react';
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
  ArrowRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  totalMRR: number;
  overduePayments: number;
  pendingPayments: number;
  totalSuperAdmins: number;
  activeSuperAdmins: number;
}

interface TopClient {
  clientName: string;
  totalStores: number;
  monthlyRevenue: number;
  accountStatus: string;
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Page (BAR-237)                                                  */
/* -------------------------------------------------------------------------- */
export default function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/super-admin/dashboard').then((r) => r.json()),
      fetch('/api/super-admin/billing?period=current').then((r) => r.json()),
    ])
      .then(([dashData, billingData]) => {
        setMetrics(dashData);
        // Sort clients by revenue descending, take top 5
        const sorted = (billingData.clients || [])
          .sort((a: TopClient, b: TopClient) => b.monthlyRevenue - a.monthlyRevenue)
          .slice(0, 5);
        setTopClients(sorted);
      })
      .catch((err) => console.error('Failed to load super admin dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Super Admin Dashboard"
          description="Platform overview — clients, stores, revenue, and system health"
          icon={<LayoutDashboard className="h-6 w-6" />}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-surface-800" />
              <div className="mt-3 h-7 w-20 rounded bg-surface-800" />
              <div className="mt-1 h-4 w-24 rounded bg-surface-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
            value={metrics.totalClients}
            className="card-hover cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/super-admin/clients">
          <StatCard
            icon={<Store className="h-5 w-5" />}
            title="Active Stores"
            value={`${metrics.activeStores} / ${metrics.totalStores}`}
            className="card-hover cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/super-admin/billing">
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            title="Monthly Recurring Revenue"
            value={`$${metrics.totalMRR.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            className="card-hover cursor-pointer"
          />
        </Link>
        <Link href="/dashboard/super-admin/billing">
          <div className="glass-card p-5 card-hover cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              {metrics.overduePayments > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                  Action needed
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-surface-100">{metrics.overduePayments}</p>
            <p className="mt-1 text-xs text-surface-400">Overdue Payments</p>
          </div>
        </Link>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Client Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Active</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${metrics.totalClients > 0 ? (metrics.activeClients / metrics.totalClients) * 120 : 0}px` }} />
                  <span className="text-sm font-semibold text-emerald-400">{metrics.activeClients}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Inactive</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-surface-600" style={{ width: `${metrics.totalClients > 0 ? (metrics.inactiveClients / metrics.totalClients) * 120 : 0}px` }} />
                  <span className="text-sm font-semibold text-surface-400">{metrics.inactiveClients}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Store Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Active</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${metrics.totalStores > 0 ? (metrics.activeStores / metrics.totalStores) * 120 : 0}px` }} />
                  <span className="text-sm font-semibold text-blue-400">{metrics.activeStores}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Inactive</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-surface-600" style={{ width: `${metrics.totalStores > 0 ? (metrics.inactiveStores / metrics.totalStores) * 120 : 0}px` }} />
                  <span className="text-sm font-semibold text-surface-400">{metrics.inactiveStores}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Paid</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {metrics.totalClients - metrics.overduePayments - metrics.pendingPayments}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Pending</span>
                <span className="text-sm font-semibold text-yellow-400">{metrics.pendingPayments}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-400">Overdue</span>
                <span className="text-sm font-semibold text-red-400">{metrics.overduePayments}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients by Revenue */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by MRR</CardTitle>
            <Link href="/dashboard/super-admin/billing" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-4">No client data available yet.</p>
              ) : (
                topClients.map((client, i) => (
                  <div key={client.clientName} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-800 text-xs font-bold text-surface-400">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-200 truncate">{client.clientName}</p>
                      <p className="text-xs text-surface-500">{client.totalStores} stores</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-surface-100">
                        ${client.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-surface-500">/month</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/super-admin/clients">
                <Button variant="secondary" size="sm" leftIcon={<Building2 className="h-4 w-4" />}>
                  Provision New Client
                </Button>
              </Link>
              <Link href="/dashboard/super-admin/users">
                <Button variant="secondary" size="sm" leftIcon={<Users className="h-4 w-4" />}>
                  Add Super Admin
                </Button>
              </Link>
              <Link href="/dashboard/super-admin/billing">
                <Button variant="secondary" size="sm" leftIcon={<BarChart3 className="h-4 w-4" />}>
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
