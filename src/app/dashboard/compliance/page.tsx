'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { customers } from '@/lib/mock-data';
import { formatDate, cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Users,
  Clock,
  FileText,
  Send,
  Bell,
  ExternalLink,
  XCircle,
  MoreVertical,
  Edit,
  Link2,
  Mail,
  Smartphone,
} from 'lucide-react';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/input';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getDaysUntilExpiration(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const exp = new Date(dateStr);
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
}

type ComplianceRow = Customer & { daysRemaining: number | null } & Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function CompliancePage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'expired' | 'critical' | 'warning' | 'ok'>('all');
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [renewalLinkModalOpen, setRenewalLinkModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ComplianceRow | null>(null);

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.status === 'active'),
    []
  );

  // Compute compliance data
  const complianceData = useMemo<ComplianceRow[]>(() => {
    return activeCustomers
      .map((c) => ({
        ...c,
        daysRemaining: getDaysUntilExpiration(c.idExpiration),
      }))
      .sort((a, b) => {
        // Expired first (null days = no ID, push to end)
        const da = a.daysRemaining ?? 9999;
        const db = b.daysRemaining ?? 9999;
        return da - db;
      }) as ComplianceRow[];
  }, [activeCustomers]);

  // Stats
  const stats = useMemo(() => {
    const expired = complianceData.filter((c) => c.daysRemaining !== null && c.daysRemaining < 0);
    const expiring30 = complianceData.filter((c) => c.daysRemaining !== null && c.daysRemaining >= 0 && c.daysRemaining <= 30);
    const expiring90 = complianceData.filter((c) => c.daysRemaining !== null && c.daysRemaining > 30 && c.daysRemaining <= 90);
    const form1583Pending = activeCustomers.filter((c) => c.form1583Status === 'pending' || c.form1583Status === 'submitted');
    const allCompliant = complianceData.filter(
      (c) =>
        (c.daysRemaining === null || c.daysRemaining > 90) &&
        c.form1583Status === 'approved'
    );

    return {
      total: activeCustomers.length,
      expired: expired.length,
      expiring30: expiring30.length,
      expiring90: expiring90.length,
      form1583Pending: form1583Pending.length,
      allCompliant: allCompliant.length,
    };
  }, [complianceData, activeCustomers]);

  // Form 1583 counts
  const form1583Groups = useMemo(() => {
    const approved = activeCustomers.filter((c) => c.form1583Status === 'approved');
    const submitted = activeCustomers.filter((c) => c.form1583Status === 'submitted');
    const pending = activeCustomers.filter((c) => c.form1583Status === 'pending');
    const expired = activeCustomers.filter((c) => c.form1583Status === 'expired');
    return { approved, submitted, pending, expired };
  }, [activeCustomers]);

  // Filter compliance data
  const filteredData = useMemo(() => {
    switch (filter) {
      case 'expired':
        return complianceData.filter((c) => c.daysRemaining !== null && c.daysRemaining < 0);
      case 'critical':
        return complianceData.filter((c) => c.daysRemaining !== null && c.daysRemaining >= 0 && c.daysRemaining <= 30);
      case 'warning':
        return complianceData.filter((c) => c.daysRemaining !== null && c.daysRemaining > 30 && c.daysRemaining <= 90);
      case 'ok':
        return complianceData.filter((c) => c.daysRemaining === null || c.daysRemaining > 90);
      default:
        return complianceData;
    }
  }, [complianceData, filter]);

  // Alert conditions
  const hasExpired = stats.expired > 0;
  const hasExpiringSoon = stats.expiring30 > 0;

  // Table columns
  const columns: Column<ComplianceRow>[] = [
    {
      key: 'name',
      label: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-surface-200">
            {row.firstName} {row.lastName}
          </span>
          <span className="ml-2 text-[10px] text-surface-500">{row.pmbNumber}</span>
        </div>
      ),
    },
    {
      key: 'idType',
      label: 'ID Type',
      render: (row) => (
        <span className="text-xs capitalize text-surface-300">
          {row.idType ? row.idType.replace('_', ' ') : '—'}
        </span>
      ),
    },
    {
      key: 'idExpiration',
      label: 'Expiration',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-surface-400">
          {row.idExpiration ? formatDate(row.idExpiration) : '—'}
        </span>
      ),
    },
    {
      key: 'daysRemaining',
      label: 'Status',
      sortable: true,
      render: (row) => {
        if (row.daysRemaining === null) return <span className="text-xs text-surface-500">—</span>;
        if (row.daysRemaining < 0) {
          return (
            <Badge variant="danger" className="text-xs font-bold">
              EXPIRED
            </Badge>
          );
        }
        if (row.daysRemaining <= 30) {
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="danger" className="text-xs font-bold animate-pulse">
                PENDING
              </Badge>
              <span className="text-[10px] text-red-500">{row.daysRemaining}d</span>
            </div>
          );
        }
        if (row.daysRemaining <= 90) {
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant="warning" className="text-xs">
                PENDING
              </Badge>
              <span className="text-[10px] text-amber-500">{row.daysRemaining}d</span>
            </div>
          );
        }
        return (
          <Badge variant="success" className="text-xs">
            {row.daysRemaining} days
          </Badge>
        );
      },
    },
    {
      key: 'form1583Status',
      label: 'Form 1583',
      render: (row) =>
        row.form1583Status ? (
          <Badge status={row.form1583Status} className="text-xs">
            {row.form1583Status}
          </Badge>
        ) : (
          <span className="text-xs text-surface-500">—</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 'w-12',
      render: (row) => (
        <DropdownMenu
          trigger={
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </div>
          }
          items={[
            {
              id: 'edit',
              label: 'Edit ID Details',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => router.push(`/dashboard/customers/${row.id}`),
            },
            {
              id: 'notify',
              label: 'Notify Customer',
              icon: <Bell className="h-4 w-4" />,
              onClick: () => {
                setSelectedCustomer(row);
                setNotifyModalOpen(true);
              },
            },
            'separator',
            {
              id: 'send_renewal',
              label: 'Send Link for Renewal',
              icon: <Link2 className="h-4 w-4" />,
              onClick: () => {
                setSelectedCustomer(row);
                setRenewalLinkModalOpen(true);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="CMRA Compliance"
        description="Monitor customer ID expirations, Form 1583 status, and send renewal links"
        actions={
          <Button leftIcon={<Bell className="h-4 w-4" />}>
            Send Bulk Reminders
          </Button>
        }
      />

      {/* Alert Banner */}
      {(hasExpired || hasExpiringSoon) && (
        <div className="space-y-2">
          {hasExpired && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">
                  {stats.expired} customer{stats.expired !== 1 ? 's have' : ' has'} expired IDs
                </p>
                <p className="text-xs text-red-600/70 mt-0.5">
                  Expired IDs require immediate attention for CMRA compliance.
                </p>
              </div>
              <Button variant="danger" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
                Send Reminders
              </Button>
            </div>
          )}
          {hasExpiringSoon && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300">
                  {stats.expiring30} customer{stats.expiring30 !== 1 ? 's have' : ' has'} IDs expiring within 30 days
                </p>
                <p className="text-xs text-amber-600/70 mt-0.5">
                  Send reminders to ensure timely renewal.
                </p>
              </div>
              <Button variant="outline" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
                Send Reminders
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          title="Active Customers"
          value={stats.total}
        />
        <div className="glass-card p-5 border-red-500/20">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/15 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-red-600">{stats.expired + stats.expiring30}</p>
          <p className="mt-1 text-xs text-surface-400">IDs Expiring (&lt; 30d)</p>
        </div>
        <div className="glass-card p-5 border-amber-500/20">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/15 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-600">{stats.expiring90}</p>
          <p className="mt-1 text-xs text-surface-400">IDs Expiring (30-90d)</p>
        </div>
        <div className="glass-card p-5 border-yellow-500/20">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-600/15 text-yellow-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-yellow-400">{stats.form1583Pending}</p>
          <p className="mt-1 text-xs text-surface-400">Form 1583 Pending</p>
        </div>
        <div className="glass-card p-5 border-emerald-500/20">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600">{stats.allCompliant}</p>
          <p className="mt-1 text-xs text-surface-400">All Compliant</p>
        </div>
      </div>

      {/* ID Expiration Tracking */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            ID Expiration Tracking
          </h2>
          <div className="flex items-center gap-1">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'expired' as const, label: 'Expired', color: 'text-red-600' },
              { id: 'critical' as const, label: '< 30 days', color: 'text-red-600' },
              { id: 'warning' as const, label: '30-90 days', color: 'text-amber-600' },
              { id: 'ok' as const, label: '> 90 days', color: 'text-emerald-600' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === f.id
                    ? 'bg-surface-700 text-surface-200 border border-surface-600'
                    : 'text-surface-500 hover:bg-surface-800 hover:text-surface-300 border border-transparent'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          keyAccessor={(row) => row.id}
          searchable={true}
          searchPlaceholder="Search customers..."
          pageSize={10}
          emptyMessage="No compliance issues found"
          onRowClick={(row) => router.push(`/dashboard/customers/${row.id}`)}
        />
      </div>

      {/* Form 1583 Status Overview */}
      <div>
        <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary-600" />
          Form 1583 Status Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Approved */}
          <Card className="border-emerald-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Approved
              </CardTitle>
              <span className="text-lg font-bold text-emerald-600">{form1583Groups.approved.length}</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {form1583Groups.approved.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-surface-300">{c.firstName} {c.lastName}</span>
                    <span className="text-surface-500">{c.pmbNumber}</span>
                  </div>
                ))}
                {form1583Groups.approved.length > 6 && (
                  <p className="text-[10px] text-surface-500 pt-1">
                    +{form1583Groups.approved.length - 6} more
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submitted */}
          <Card className="border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Submitted
              </CardTitle>
              <span className="text-lg font-bold text-blue-600">{form1583Groups.submitted.length}</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {form1583Groups.submitted.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-surface-300">{c.firstName} {c.lastName}</span>
                    <span className="text-surface-500">{c.pmbNumber}</span>
                  </div>
                ))}
                {form1583Groups.submitted.length === 0 && (
                  <p className="text-xs text-surface-500 italic">None</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                Pending
              </CardTitle>
              <span className="text-lg font-bold text-yellow-400">{form1583Groups.pending.length}</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {form1583Groups.pending.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-surface-300">{c.firstName} {c.lastName}</span>
                    <span className="text-surface-500">{c.pmbNumber}</span>
                  </div>
                ))}
                {form1583Groups.pending.length === 0 && (
                  <p className="text-xs text-surface-500 italic">None</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expired */}
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Expired
              </CardTitle>
              <span className="text-lg font-bold text-red-600">{form1583Groups.expired.length}</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {form1583Groups.expired.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-surface-300">{c.firstName} {c.lastName}</span>
                    <span className="text-surface-500">{c.pmbNumber}</span>
                  </div>
                ))}
                {form1583Groups.expired.length === 0 && (
                  <p className="text-xs text-surface-500 italic">None</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Notify Customer Modal                                              */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={notifyModalOpen}
        onClose={() => { setNotifyModalOpen(false); setSelectedCustomer(null); }}
        title="Notify Customer — ID Expiring"
        description={
          selectedCustomer
            ? `Send a notification to ${selectedCustomer.firstName} ${selectedCustomer.lastName} (${selectedCustomer.pmbNumber})`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotifyModalOpen(false)}>Cancel</Button>
            <Button leftIcon={<Send className="h-4 w-4" />}>Send Notification</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Notification Channel"
            placeholder="How to notify..."
            options={[
              { value: 'email', label: '📧  Email — Send expiration notice via email' },
              { value: 'sms', label: '📱  SMS — Send secure link via text message' },
              { value: 'both', label: '📧📱  Email & SMS' },
            ]}
          />

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-semibold text-blue-400">Secure Upload Link</p>
            </div>
            <p className="text-xs text-surface-400">
              When sent via SMS, the customer receives a secure link to photograph and upload their renewed ID directly from their phone.
              The uploaded document is stored and available for entry into the USPS Gateway.
            </p>
          </div>

          <Textarea
            label="Additional Message (optional)"
            placeholder="Add a personal note to the notification..."
            rows={3}
          />
        </div>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/*  Send Renewal Link Modal                                            */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={renewalLinkModalOpen}
        onClose={() => { setRenewalLinkModalOpen(false); setSelectedCustomer(null); }}
        title="Send ID Renewal Link"
        description={
          selectedCustomer
            ? `Send a secure upload link to ${selectedCustomer.firstName} ${selectedCustomer.lastName}`
            : undefined
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewalLinkModalOpen(false)}>Cancel</Button>
            <Button leftIcon={<Send className="h-4 w-4" />}>Send Renewal Link</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Delivery Method"
            placeholder="Choose how to send the link..."
            options={[
              { value: 'email', label: '📧  Email — Send secure link via email' },
              { value: 'sms', label: '📱  SMS — Send secure link via text message' },
              { value: 'both', label: '📧📱  Both — Email & SMS' },
            ]}
          />

          <div className="rounded-lg border border-surface-700 bg-surface-800/30 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wide">How It Works</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600/20 text-[10px] font-bold text-primary-400 flex-shrink-0 mt-0.5">1</div>
                <p className="text-xs text-surface-400">Customer receives a secure link via email or SMS</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600/20 text-[10px] font-bold text-primary-400 flex-shrink-0 mt-0.5">2</div>
                <p className="text-xs text-surface-400">Customer photographs and uploads their renewed ID from their phone</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600/20 text-[10px] font-bold text-primary-400 flex-shrink-0 mt-0.5">3</div>
                <p className="text-xs text-surface-400">Uploaded ID is stored securely and available for USPS Gateway entry</p>
              </div>
            </div>
          </div>

          {selectedCustomer && (
            <div className="rounded-lg border border-surface-700 bg-surface-800/30 p-3">
              <p className="text-xs text-surface-500 mb-1">Customer Contact</p>
              <div className="flex items-center gap-3">
                {selectedCustomer.email && (
                  <span className="flex items-center gap-1 text-xs text-surface-300">
                    <Mail className="h-3 w-3 text-surface-500" />
                    {selectedCustomer.email}
                  </span>
                )}
                {selectedCustomer.phone && (
                  <span className="flex items-center gap-1 text-xs text-surface-300">
                    <Smartphone className="h-3 w-3 text-surface-500" />
                    {selectedCustomer.phone}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
