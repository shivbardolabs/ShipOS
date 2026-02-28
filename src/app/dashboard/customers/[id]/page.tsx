'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EditCustomerModal } from '@/components/customer/edit-customer-modal';
import { cn, formatDate, formatCurrency, formatDateTime } from '@/lib/utils';
import { auditLog, loyaltyAccounts, loyaltyTiers, loyaltyRewards, getCustomerFeeSummary } from '@/lib/mock-data';
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
  Send,
  Camera,
  Upload,
  Award,
  Crown,
  Gem,
  Star,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Forward,
  MapPin,
  Users,
} from 'lucide-react';
import { CustomerAvatar } from '@/components/ui/customer-avatar';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const platformBadge: Record<string, { label: string; classes: string }> = {
  physical: { label: 'Physical', classes: 'bg-surface-600/30 text-surface-300 border-surface-600/40' },
  iPostal: { label: 'iPostal', classes: 'bg-blue-100 text-blue-600 border-blue-500/30' },
  anytime: { label: 'Anytime', classes: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  postscan: { label: 'PostScan', classes: 'bg-indigo-100 text-indigo-600 border-indigo-200' } };

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
  { key: 'type', label: 'Type', render: (row) => <span className="capitalize text-xs font-medium">{row.type.replace(/_/g, ' ').replace(/\bid\b/gi, 'ID')}</span> },
  {
    key: 'channel',
    label: 'Channel',
    render: (row) => (
      <div className="flex items-center gap-1">
        {(row.channel === 'email' || row.channel === 'both') && (
          <span className="status-badge text-[10px] bg-blue-100 text-blue-600 border-blue-500/30">Email</span>
        )}
        {(row.channel === 'sms' || row.channel === 'both') && (
          <span className="status-badge text-[10px] bg-emerald-100 text-emerald-600 border-emerald-200">SMS</span>
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

  /* ── Fetch customer + relations from API ───────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customerData, setCustomerData] = useState<any>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setCustomerLoading(true);
    fetch(`/api/customers/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then((data) => setCustomerData(data))
      .catch((err) => console.error('Failed to fetch customer:', err))
      .finally(() => setCustomerLoading(false));
  }, [params.id]);

  const customer = customerData;

  const customerPackages = useMemo(
    () => (customer?.packages ?? []) as (PackageType & Record<string, unknown>)[],
    [customer?.packages]
  );
  const customerMail = useMemo(
    () => (customer?.mailPieces ?? []) as (MailPiece & Record<string, unknown>)[],
    [customer?.mailPieces]
  );
  const customerShipments = useMemo(
    () => (customer?.shipments ?? []) as (Shipment & Record<string, unknown>)[],
    [customer?.shipments]
  );
  const customerNotifications = useMemo(
    () => (customer?.notifications ?? []) as (Notification & Record<string, unknown>)[],
    [customer?.notifications]
  );
  const customerActivity = useMemo(
    () => auditLog.slice(0, 10) as (AuditLogEntry & Record<string, unknown>)[],
    []
  );

  // Fee tracking data for this customer
  const feeSummary = useMemo(
    () => getCustomerFeeSummary(customer?.id ?? ''),
    [customer?.id]
  );

  if (customerLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/customers')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Customers
        </Button>
        <div className="glass-card p-12 text-center">
          <div className="h-6 w-48 mx-auto rounded bg-surface-800 animate-pulse mb-3" />
          <div className="h-4 w-64 mx-auto rounded bg-surface-800 animate-pulse" />
        </div>
      </div>
    );
  }

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
    { id: 'loyalty', label: 'Loyalty', icon: <Award className="h-3.5 w-3.5" /> },
  ];

  // Loyalty data for this customer
  const loyaltyAccount = loyaltyAccounts.find(a => a.customerId === customer?.id);
  const nextTier = loyaltyAccount?.currentTier
    ? loyaltyTiers.find(t => t.sortOrder === (loyaltyAccount.currentTier!.sortOrder + 1))
    : null;
  const tierProgressPct = loyaltyAccount && nextTier
    ? Math.min(100, ((loyaltyAccount.lifetimePoints - loyaltyAccount.currentTier!.minPoints) / (nextTier.minPoints - loyaltyAccount.currentTier!.minPoints)) * 100)
    : loyaltyAccount ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/customers')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
        Back to Customers
      </Button>

      {/* Customer Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar with photo upload */}
          <CustomerAvatar
            firstName={customer.firstName}
            lastName={customer.lastName}
            photoUrl={customer.photoUrl}
            size="xl"
            className="shadow-lg"
            editable
            onClick={() => {
              // In production, this would open a file picker to upload/capture a photo
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.capture = 'environment';
              input.onchange = () => {
                // Photo upload would be handled here
                // For now this is a UI-ready placeholder
              };
              input.click();
            }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-surface-100">{fullName}</h1>
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
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-300 hover:bg-red-50" leftIcon={<UserX className="h-3.5 w-3.5" />}>
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
                    {entry.entityType === 'package' ? <Package className="h-3.5 w-3.5 text-primary-600" /> :
                     entry.entityType === 'notification' ? <Bell className="h-3.5 w-3.5 text-yellow-400" /> :
                     entry.entityType === 'mail' ? <Mail className="h-3.5 w-3.5 text-blue-600" /> :
                     entry.entityType === 'shipment' ? <Truck className="h-3.5 w-3.5 text-emerald-600" /> :
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

          {/* Loyalty tab */}
          <TabPanel active={activeTab === 'loyalty'}>
            {loyaltyAccount ? (
              <div className="space-y-6">
                {/* Loyalty Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-surface-700 p-4">
                    <p className="text-xs text-surface-500 mb-1">Current Points</p>
                    <p className="text-2xl font-bold text-surface-100">{loyaltyAccount.currentPoints.toLocaleString()}</p>
                    <p className="text-xs text-surface-500 mt-1">≈ ${(loyaltyAccount.currentPoints * 0.05).toFixed(2)} value</p>
                  </div>
                  <div className="rounded-xl border border-surface-700 p-4">
                    <p className="text-xs text-surface-500 mb-1">Lifetime Points</p>
                    <p className="text-2xl font-bold text-surface-100">{loyaltyAccount.lifetimePoints.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-surface-700 p-4">
                    <p className="text-xs text-surface-500 mb-1">Current Tier</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
                        style={{
                          backgroundColor: `${loyaltyAccount.currentTier?.color || '#CD7F32'}20`,
                          color: loyaltyAccount.currentTier?.color || '#CD7F32',
                        }}
                      >
                        {loyaltyAccount.currentTier?.name === 'Gold' && <Crown className="h-4 w-4" />}
                        {loyaltyAccount.currentTier?.name === 'Silver' && <Gem className="h-4 w-4" />}
                        {loyaltyAccount.currentTier?.name === 'Bronze' && <Award className="h-4 w-4" />}
                        {loyaltyAccount.currentTier?.name}
                      </span>
                    </div>
                    {nextTier && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-surface-500 mb-1">
                          <span>{loyaltyAccount.lifetimePoints} pts</span>
                          <span>{nextTier.minPoints} pts to {nextTier.name}</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${tierProgressPct}%`,
                              backgroundColor: loyaltyAccount.currentTier?.color || '#CD7F32',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Referral Code */}
                <div className="rounded-lg border border-surface-700 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-500 mb-0.5">Referral Code</p>
                    <code className="text-lg font-mono font-bold text-primary-400">{loyaltyAccount.referralCode}</code>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(loyaltyAccount.referralCode)}
                    className="flex items-center gap-1.5 rounded-lg bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-300 hover:text-surface-100 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>

                {/* Tier Benefits */}
                {loyaltyAccount.currentTier && (
                  <div className="rounded-lg border border-surface-700 p-4">
                    <h4 className="text-sm font-semibold text-surface-200 mb-3">
                      {loyaltyAccount.currentTier.name} Tier Benefits
                    </h4>
                    <ul className="space-y-2">
                      {loyaltyAccount.currentTier.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-surface-300">
                          <Star className="h-3.5 w-3.5 flex-shrink-0" style={{ color: loyaltyAccount.currentTier!.color }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Available Rewards */}
                <div>
                  <h4 className="text-sm font-semibold text-surface-200 mb-3">Available Rewards</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {loyaltyRewards.filter(r => r.isActive).map((reward) => {
                      const canRedeem = loyaltyAccount.currentPoints >= reward.pointsCost;
                      return (
                        <div key={reward.id} className="rounded-lg border border-surface-700 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Gift className="h-4 w-4 text-accent-amber" />
                              <span className="text-sm font-medium text-surface-200">{reward.name}</span>
                            </div>
                            <span className="text-xs font-bold text-primary-400">{reward.pointsCost} pts</span>
                          </div>
                          <p className="text-xs text-surface-500 mb-2">{reward.description}</p>
                          <button
                            disabled={!canRedeem}
                            className={cn(
                              'w-full rounded-lg py-1.5 text-xs font-medium transition-colors',
                              canRedeem
                                ? 'bg-primary-600 text-white hover:bg-primary-500'
                                : 'bg-surface-800 text-surface-500 cursor-not-allowed'
                            )}
                          >
                            {canRedeem ? 'Redeem' : `Need ${(reward.pointsCost - loyaltyAccount.currentPoints).toLocaleString()} more pts`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div>
                  <h4 className="text-sm font-semibold text-surface-200 mb-3">Recent Transactions</h4>
                  <div className="space-y-2">
                    {(loyaltyAccount.transactions || []).slice(0, 10).map((txn) => {
                      const isEarn = txn.points > 0;
                      return (
                        <div key={txn.id} className="flex items-center justify-between rounded-lg bg-surface-900/50 px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isEarn ? 'bg-accent-emerald/10' : 'bg-accent-rose/10'}`}>
                              {isEarn ? (
                                <ArrowUpRight className="h-3.5 w-3.5 text-accent-emerald" />
                              ) : (
                                <ArrowDownRight className="h-3.5 w-3.5 text-accent-rose" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-surface-200">{txn.description || txn.type}</p>
                              <p className="text-xs text-surface-500">{formatDate(txn.createdAt)}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${isEarn ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                            {isEarn ? '+' : ''}{txn.points} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="h-10 w-10 text-surface-600 mx-auto mb-3" />
                <p className="text-sm text-surface-400">Customer is not enrolled in the loyalty program</p>
                <button className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500 transition-colors">
                  Enroll Customer
                </button>
              </div>
            )}
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
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-surface-600" />
                    )}
                    <span className={customer.notifyEmail ? 'text-surface-300' : 'text-surface-600'}>Email</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    {customer.notifySms ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-surface-600" />
                    )}
                    <span className={customer.notifySms ? 'text-surface-300' : 'text-surface-600'}>SMS</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Forwarding */}
          <Card>
            <CardHeader>
              <CardTitle>Address Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-surface-500 flex-shrink-0 mt-0.5"><MapPin className="h-3.5 w-3.5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-surface-500">Street Address</p>
                  <p className="text-sm text-surface-200">{customer.address || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-surface-500 flex-shrink-0 mt-0.5"><Forward className="h-3.5 w-3.5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-surface-500">Preferred Forwarding Address</p>
                  <p className="text-sm text-surface-200">{customer.forwardingAddress || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorized Pickup Persons */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-surface-400" />
                <CardTitle>Authorized Pickup</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {customer.authorizedPickupPersons && customer.authorizedPickupPersons.length > 0 ? (
                <div className="space-y-3">
                  {customer.authorizedPickupPersons.map((person: { id: string; name: string; relationship?: string; phone?: string }) => (
                    <div key={person.id} className="flex items-center gap-3 rounded-lg bg-surface-800/50 px-3 py-2.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600/10 text-primary-500 text-xs font-semibold">
                        {person.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-200">{person.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {person.relationship && (
                            <span className="text-[10px] text-surface-500">{person.relationship}</span>
                          )}
                          {person.phone && (
                            <>
                              {person.relationship && <span className="text-surface-700">·</span>}
                              <span className="text-[10px] text-surface-500">{person.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-surface-500 italic">No authorized persons on file.</p>
              )}
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

              {/* Proof of Address */}
              {customer.proofOfAddressType && (
                <div className="pt-3 border-t border-surface-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-surface-400">Proof of Address</span>
                    {customer.proofOfAddressStatus && (
                      <Badge status={customer.proofOfAddressStatus} className="text-[10px]">
                        {customer.proofOfAddressStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-surface-200 mt-0.5">
                    {customer.proofOfAddressType === 'home_vehicle_insurance' ? 'Home/Vehicle Insurance' :
                     customer.proofOfAddressType === 'mortgage_deed_of_trust' ? 'Mortgage / Deed of Trust' :
                     customer.proofOfAddressType === 'current_lease' ? 'Current Lease Agreement' :
                     customer.proofOfAddressType === 'state_drivers_nondriver_id' ? "Driver's License / Non-Driver ID" :
                     customer.proofOfAddressType === 'voter_id_card' ? 'Voter Registration Card' :
                     customer.proofOfAddressType}
                  </p>
                  {customer.proofOfAddressDateOfIssue && (
                    <p className="text-xs text-surface-500 mt-1">
                      Issued: {formatDate(customer.proofOfAddressDateOfIssue)}
                    </p>
                  )}
                </div>
              )}

              {/* Form 1583 */}
              {customer.form1583Date && (
                <div className="pt-3 border-t border-surface-800">
                  <p className="text-xs text-surface-400">Form 1583 Date</p>
                  <p className="text-sm text-surface-200 mt-0.5">{formatDate(customer.form1583Date)}</p>
                </div>
              )}

              {/* Form 1583 Gating Warning */}
              {customer.form1583Status === 'submitted' && (!customer.proofOfAddressType || !customer.proofOfAddressDateOfIssue) && (
                <div className="pt-3 border-t border-surface-800">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-300">Form 1583 cannot be approved until proof of address document type and date of issue are on file.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Photo */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-surface-400" />
                <CardTitle>Customer Photo</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <CustomerAvatar
                  firstName={customer.firstName}
                  lastName={customer.lastName}
                  photoUrl={customer.photoUrl}
                  size="2xl"
                  editable
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = () => {};
                    input.click();
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = () => {};
                    input.click();
                  }}
                  className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-400 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  {customer.photoUrl ? 'Change photo' : 'Upload photo'}
                </button>
                <p className="text-[10px] text-surface-500 text-center">
                  Use ID photo or webcam capture for easy identification
                </p>
              </div>
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
