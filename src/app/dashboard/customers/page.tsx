'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/input';
import { customers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import {
  UserPlus,
  Package,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  AlertTriangle } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

function hashColor(name: string): string {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-violet-500 to-violet-700',
    'from-emerald-500 to-emerald-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700',
    'from-cyan-500 to-cyan-700',
    'from-pink-500 to-pink-700',
    'from-teal-500 to-teal-700',
    'from-indigo-500 to-indigo-700',
    'from-orange-500 to-orange-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const platformBadge: Record<string, { label: string; classes: string }> = {
  physical: { label: 'Physical', classes: 'bg-surface-600/30 text-surface-300 border-surface-600/40' },
  iPostal: { label: 'iPostal', classes: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  anytime: { label: 'Anytime', classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  postscan: { label: 'PostScan', classes: 'bg-violet-500/20 text-violet-400 border-violet-500/30' } };

const statusDot: Record<string, string> = {
  active: 'bg-emerald-400',
  suspended: 'bg-yellow-400',
  closed: 'bg-surface-500' };

function getIdExpirationStatus(customer: Customer): { label: string; color: string } | null {
  if (!customer.idExpiration) return null;
  const now = new Date();
  const exp = new Date(customer.idExpiration);
  const days = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { label: 'EXPIRED', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (days <= 30) return { label: `${days}d left`, color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (days <= 90) return { label: `${days}d left`, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: `${days}d left`, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
}

/* -------------------------------------------------------------------------- */
/*  Filters                                                                   */
/* -------------------------------------------------------------------------- */

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'closed', label: 'Closed' },
] as const;

const PLATFORM_FILTERS = [
  { id: 'all', label: 'All Platforms' },
  { id: 'physical', label: 'Physical' },
  { id: 'iPostal', label: 'iPostal' },
  { id: 'anytime', label: 'Anytime' },
  { id: 'postscan', label: 'PostScan' },
] as const;

const PAGE_SIZE = 12;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => {
    let result = customers;

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (platformFilter !== 'all') {
      result = result.filter((c) => c.platform === platformFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.pmbNumber.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.businessName && c.businessName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [search, statusFilter, platformFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const activeCount = customers.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Customers"
        description={`${customers.length} total · ${activeCount} active`}
        actions={
          <Button leftIcon={<UserPlus className="h-4 w-4" />}>
            Add Customer
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="Search by name, PMB, email, phone..."
            value={search}
            onSearch={(v) => { setSearch(v); setPage(0); }}
            className="flex-1 min-w-[280px]"
          />
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              iconOnly
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Status */}
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setStatusFilter(f.id); setPage(0); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === f.id
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200 border border-transparent'
                )}
              >
                {f.label}
                {f.id !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {customers.filter((c) => c.status === f.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Platform */}
          <div className="flex items-center gap-1">
            {PLATFORM_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setPlatformFilter(f.id); setPage(0); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  platformFilter === f.id
                    ? 'bg-surface-700 text-surface-200 border border-surface-600'
                    : 'text-surface-500 hover:bg-surface-800 hover:text-surface-300 border border-transparent'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-surface-500">
        {filtered.length} customer{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((customer) => {
            const idStatus = getIdExpirationStatus(customer);
            const plat = platformBadge[customer.platform];

            return (
              <div
                key={customer.id}
                onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                className="glass-card p-5 card-hover cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-lg',
                      hashColor(`${customer.firstName} ${customer.lastName}`)
                    )}
                  >
                    {getInitials(customer.firstName, customer.lastName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', statusDot[customer.status])} />
                    </div>
                    {customer.businessName && (
                      <p className="text-xs text-surface-400 truncate mt-0.5">
                        {customer.businessName}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge dot={false} className="text-[10px]">
                        {customer.pmbNumber}
                      </Badge>
                      <span className={cn('status-badge text-[10px]', plat.classes)}>
                        {plat.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 pt-3 border-t border-surface-800 space-y-2">
                  {customer.email && (
                    <p className="text-xs text-surface-400 truncate">
                      <Mail className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                      {customer.email}
                    </p>
                  )}
                  {customer.phone && (
                    <p className="text-xs text-surface-400">
                      <Phone className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                      {customer.phone}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-surface-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {customer.packageCount ?? 0}
                    </span>
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {customer.mailCount ?? 0}
                    </span>
                  </div>
                  {idStatus && (
                    <span className={cn('status-badge text-[10px]', idStatus.color)}>
                      {idStatus.label === 'EXPIRED' && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {idStatus.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {paged.map((customer) => {
            const idStatus = getIdExpirationStatus(customer);
            const plat = platformBadge[customer.platform];

            return (
              <div
                key={customer.id}
                onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                className="glass-card p-4 card-hover cursor-pointer group flex items-center gap-4"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
                    hashColor(`${customer.firstName} ${customer.lastName}`)
                  )}
                >
                  {getInitials(customer.firstName, customer.lastName)}
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-4 flex-wrap">
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white group-hover:text-primary-400 transition-colors">
                        {customer.firstName} {customer.lastName}
                      </span>
                      <span className={cn('h-2 w-2 rounded-full', statusDot[customer.status])} />
                    </div>
                    {customer.businessName && (
                      <p className="text-xs text-surface-400 truncate">{customer.businessName}</p>
                    )}
                  </div>

                  <Badge dot={false} className="text-[10px]">
                    {customer.pmbNumber}
                  </Badge>

                  <span className={cn('status-badge text-[10px]', plat.classes)}>
                    {plat.label}
                  </span>

                  <span className="text-xs text-surface-400 hidden md:inline">{customer.email}</span>

                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Package className="h-3 w-3" /> {customer.packageCount ?? 0}
                    </span>
                    {idStatus && (
                      <span className={cn('status-badge text-[10px]', idStatus.color)}>
                        {idStatus.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-surface-400 text-sm">No customers match your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-400">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-surface-300">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
