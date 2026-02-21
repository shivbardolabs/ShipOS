'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { customers, packages, mailPieces, shipments, notifications, auditLog } from '@/lib/mock-data';
import { cn, formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import type { Package as PackageType, MailPiece, Shipment, Notification, AuditLogEntry } from '@/lib/types';
import {
  ArrowLeft,
  Edit,
  Bell,
  UserX,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Shield,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  Send } from 'lucide-react';

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

function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function expirationBadge(days: number | null) {
  if (days === null) return null;
  if (days < 0) return { label: 'EXPIRED', variant: 'danger' as const, color: 'bg-red-500' };
  if (days <= 30) return { label: `${days} days`, variant: 'danger' as const, color: 'bg-red-500' };
  if (days <= 90) return { label: `${days} days`, variant: 'warning' as const, color: 'bg-yellow-500' };
  return { label: `${days} days`, variant: 'success' as const, color: 'bg-emerald-500' };
}

/* -------------------------------------------------------------------------- */
/*  Column definitions                                                        */
/* -------------------------------------------------------------------------- */

const packageCols: Column<PackageType & Record<string, unknown>>[] = [
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge status={row.status} className="text-xs">{row.status.replace('_', ' ')}</Badge> },
  { key: 'trackingNumber', label: 'Tracking', render: (row) => <span className="font-mono text-xs">{row.trackingNumber || '—'}</span> },
  { key: 'carrier', label: 'Carrier', sortable: true, render: (row) => <span className="uppercase text-xs font-medium">{row.carrier}</span> },
  { key: 'packageType', label: 'Type', render: (row) => <span className="capitalize text-xs">{row.packageType}</span> },
  { key: 'checkedInAt', label: 'Checked In', sortable: true, render: (row) => <span className="text-xs text-surface-400">{formatDate(row.checkedInAt)}</span> },
  {
    key: 'actions',
    label: '',
    align: 'right',
    render: () => (
      <Button variant="ghost" size="sm">View</Button>
    ) },
];

const mailCols: Column<MailPiece & Record<string, unknown>>[] = [
  {
    key: 'type',
    label: 'Type',
    render: (row) => <span className="capitalize text-xs font-medium">{row.type}</span> },
  { key: 'sender', label: 'Sender', render: (row) => <span className="text-xs">{row.sender || '—'}</span> },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge status={row.status} className="text-xs">{row.status}</Badge> },
  { key: 'receivedAt', label: 'Received', sortable: true, render: (row) => <span className="text-xs text-surface-400">{formatDate(row.receivedAt)}</span> },
  {
    key: 'actions',
    label: '',
    align: 'right',
    render: () => <Button variant="ghost" size="sm">View</Button> },
];

const shipmentCols: Column<Shipment & Record<string, unknown>>[] = [
  { key: 'carrier', label: 'Carrier', render: (row) => <span className="uppercase text-xs font-medium">{row.carrier}</span> },
  { key: 'trackingNumber', label: 'Tracking', render: (row) => <span className="font-mono text-xs">{row.trackingNumber || '—'}</span> },
  { key: 'destination', label: 'Destination', render: (row) => <span className="text-xs">{row.destination || '—'}</span> },
  { key: 'retailPrice', label: 'Cost', align: 'right', sortable: true, render: (row) => <span className="text-xs font-medium">{formatCurrency(row.retailPrice)}</span> },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge status={row.status} className="text-xs">{row.status.replace('_', ' ')}</Badge> },
  { key: 'createdAt', label: 'Date', sortable: true, render: (row) => <span className="text-xs text-surface-400">{formatDate(row.createdAt)}</span> },
];

const notifCols: Column<Notification & Record<string, unknown>>[] = [
  { key: 'type', label: 'Type', render: (row) => <span className="capitalize text-xs font-medium">{row.type.replace(/_/g, ' ')}</span> },
  {
    key: 'channel',
    label: 'Channel',
    render: (row) => (
      <div className="flex items-center gap-1">
        {(row.channel === 'email' || row.channel === 'both') && (
          <span className="status-badge text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">Email</span>
        )}
        {(row.channel === 'sms' || row.channel === 'both') && (
          <span className="status-badge text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">SMS</span>
        )}
      </div>
    ) },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge status={row.status} className="text-xs">{row.status}</Badge> },
  { key: 'sentAt', label: 'Sent', sortable: true, render: (row) => <span className="text-xs text-surface-400">{row.sentAt ? formatDateTime(row.sentAt) : '—'}</span> },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('packages');

  const customer = customers.find((c) => c.id === params.id);

  const customerPackages = useMemo(
    () => packages.filter((p) => p.customerId === customer?.id) as (PackageType & Record<string, unknown>)[],
    [customer?.id]
  );
  const customerMail = useMemo(
    () => mailPieces.filter((m) => m.customerId === customer?.id) as (MailPiece & Record<string, unknown>)[],
    [customer?.id]
  );
  const customerShipments = useMemo(
    () => shipments.filter((s) => s.customerId === customer?.id) as (Shipment & Record<string, unknown>)[],
    [customer?.id]
  );
  const customerNotifications = useMemo(
    () => notifications.filter((n) => n.customerId === customer?.id) as (Notification & Record<string, unknown>)[],
    [customer?.id]
  );
  const customerActivity = useMemo(
    () => auditLog.slice(0, 10) as (AuditLogEntry & Record<string, unknown>)[],
    []
  );

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/customers')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Customers
        </Button>
        <div className="glass-card p-12 text-center">
          <p className="text-surface-400">Customer not found.</p>
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`;
  const plat = platformBadge[customer.platform];
  const idDays = getDaysUntil(customer.idExpiration);
  const passportDays = getDaysUntil(customer.passportExpiration);
  const idBadge = expirationBadge(idDays);
  const passportBadgeInfo = expirationBadge(passportDays);

  // ID expiration progress bar
  const idProgressPercent = idDays !== null ? Math.max(0, Math.min(100, (idDays / 365) * 100)) : 100;
  const idProgressColor =
    idDays !== null && idDays < 0 ? 'bg-red-500' :
    idDays !== null && idDays <= 30 ? 'bg-red-500' :
    idDays !== null && idDays <= 90 ? 'bg-yellow-500' : 'bg-emerald-500';

  const tabs = [
    { id: 'packages', label: 'Packages', icon: <Package className="h-3.5 w-3.5" />, count: customerPackages.length },
    { id: 'mail', label: 'Mail', icon: <Mail className="h-3.5 w-3.5" />, count: customerMail.length },
    { id: 'shipments', label: 'Shipments', icon: <Truck className="h-3.5 w-3.5" />, count: customerShipments.length },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-3.5 w-3.5" />, count: customerNotifications.length },
    { id: 'activity', label: 'Activity', icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Back to Customers
      </Button>

      {/* Customer Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div
            className={cn(
              'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-lg',
              hashColor(fullName)
            )}
          >
            {getInitials(customer.firstName, customer.lastName)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{fullName}</h1>
              <Badge status={customer.status}>{customer.status}</Badge>
              <span className={cn('status-badge text-xs', plat.classes)}>{plat.label}</span>
            </div>
            {customer.businessName && (
              <p className="text-sm text-surface-400 mt-1">{customer.businessName}</p>
            )}
            <p className="text-sm text-surface-500 mt-1">{customer.pmbNumber}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" leftIcon={<Edit className="h-3.5 w-3.5" />}>
              Edit
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
              Send Notification
            </Button>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" leftIcon={<UserX className="h-3.5 w-3.5" />}>
              Deactivate
            </Button>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Main content area */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Packages tab */}
          <TabPanel active={activeTab === 'packages'}>
            <DataTable
              columns={packageCols}
              data={customerPackages}
              keyAccessor={(row) => row.id}
              searchable={false}
              pageSize={8}
              emptyMessage="No packages found for this customer"
            />
          </TabPanel>

          {/* Mail tab */}
          <TabPanel active={activeTab === 'mail'}>
            <DataTable
              columns={mailCols}
              data={customerMail}
              keyAccessor={(row) => row.id}
              searchable={false}
              pageSize={8}
              emptyMessage="No mail found for this customer"
            />
          </TabPanel>

          {/* Shipments tab */}
          <TabPanel active={activeTab === 'shipments'}>
            <DataTable
              columns={shipmentCols}
              data={customerShipments}
              keyAccessor={(row) => row.id}
              searchable={false}
              pageSize={8}
              emptyMessage="No shipments found for this customer"
            />
          </TabPanel>

          {/* Notifications tab */}
          <TabPanel active={activeTab === 'notifications'}>
            <DataTable
              columns={notifCols}
              data={customerNotifications}
              keyAccessor={(row) => row.id}
              searchable={false}
              pageSize={8}
              emptyMessage="No notifications sent to this customer"
            />
          </TabPanel>

          {/* Activity tab */}
          <TabPanel active={activeTab === 'activity'}>
            <div className="space-y-3">
              {customerActivity.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-start gap-3 py-3',
                    i < customerActivity.length - 1 && 'border-b border-surface-800'
                  )}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800">
                    {entry.entityType === 'package' ? <Package className="h-3.5 w-3.5 text-primary-400" /> :
                     entry.entityType === 'notification' ? <Bell className="h-3.5 w-3.5 text-yellow-400" /> :
                     entry.entityType === 'mail' ? <Mail className="h-3.5 w-3.5 text-blue-400" /> :
                     entry.entityType === 'shipment' ? <Truck className="h-3.5 w-3.5 text-emerald-400" /> :
                     <FileText className="h-3.5 w-3.5 text-surface-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200">{entry.details}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {entry.user?.name} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>
        </div>

        {/* Right - Sidebar */}
        <div className="space-y-4">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow icon={<Shield className="h-3.5 w-3.5" />} label="PMB Number" value={customer.pmbNumber} />
              <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={customer.email || '—'} />
              <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={customer.phone || '—'} />
              <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Date Opened" value={formatDate(customer.dateOpened)} />
              {customer.renewalDate && (
                <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Renewal Date" value={formatDate(customer.renewalDate)} />
              )}
              {customer.billingTerms && (
                <DetailRow icon={<CreditCard className="h-3.5 w-3.5" />} label="Billing Terms" value={customer.billingTerms} />
              )}
              <div className="pt-2 border-t border-surface-800">
                <p className="text-xs text-surface-500 mb-2">Notification Preferences</p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    {customer.notifyEmail ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-surface-600" />
                    )}
                    <span className={customer.notifyEmail ? 'text-surface-300' : 'text-surface-600'}>Email</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    {customer.notifySms ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-surface-600" />
                    )}
                    <span className={customer.notifySms ? 'text-surface-300' : 'text-surface-600'}>SMS</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CMRA Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>CMRA Compliance</CardTitle>
              {customer.form1583Status && (
                <Badge status={customer.form1583Status} className="text-xs">
                  1583 {customer.form1583Status}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ID Expiration */}
              {customer.idType && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-surface-400">
                      {customer.idType === 'drivers_license' ? "Driver's License" :
                       customer.idType === 'passport' ? 'Passport' :
                       "Driver's License + Passport"}
                    </span>
                    {idBadge && (
                      <Badge variant={idBadge.variant} className="text-[10px]">{idBadge.label}</Badge>
                    )}
                  </div>
                  {customer.idExpiration && (
                    <p className="text-xs text-surface-500 mb-2">
                      Expires: {formatDate(customer.idExpiration)}
                    </p>
                  )}
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', idProgressColor)}
                      style={{ width: `${idProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Passport (separate if both) */}
              {customer.idType === 'both' && customer.passportExpiration && (
                <div className="pt-3 border-t border-surface-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-surface-400">Passport</span>
                    {passportBadgeInfo && (
                      <Badge variant={passportBadgeInfo.variant} className="text-[10px]">{passportBadgeInfo.label}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-surface-500">
                    Expires: {formatDate(customer.passportExpiration)}
                  </p>
                </div>
              )}

              {/* Form 1583 */}
              {customer.form1583Date && (
                <div className="pt-3 border-t border-surface-800">
                  <p className="text-xs text-surface-400">Form 1583 Date</p>
                  <p className="text-sm text-surface-200 mt-0.5">{formatDate(customer.form1583Date)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.notes ? (
                <p className="text-sm text-surface-300">{customer.notes}</p>
              ) : (
                <p className="text-sm text-surface-500 italic">No notes for this customer.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Detail Row component                                                      */
/* -------------------------------------------------------------------------- */

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-surface-500 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-surface-500">{label}</p>
        <p className="text-sm text-surface-200 truncate">{value}</p>
      </div>
    </div>
  );
}
