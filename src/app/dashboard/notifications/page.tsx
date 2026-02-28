'use client';
/* eslint-disable */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
// notifications and customers now fetched from API
import {
  formatDateTime,
  getCarrierTrackingUrl,
  getNotificationTargetUrl,
  getNotificationStatusLabel,
} from '@/lib/utils';
import type { Notification } from '@/lib/types';
import {
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Package,
  AlertTriangle,
  RefreshCw,
  Eye,
  CalendarClock,
  Truck,
  UserPlus,
  MoreVertical,
  MailOpen,
  Smartphone } from 'lucide-react';
import { DropdownMenu } from '@/components/ui/dropdown-menu';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const notifTypeIcon: Record<string, React.ReactNode> = {
  package_arrival: <Package className="h-4 w-4 text-blue-600" />,
  package_reminder: <CalendarClock className="h-4 w-4 text-amber-600" />,
  mail_received: <MailOpen className="h-4 w-4 text-indigo-600" />,
  id_expiring: <AlertTriangle className="h-4 w-4 text-red-600" />,
  renewal_reminder: <Clock className="h-4 w-4 text-yellow-400" />,
  shipment_update: <Truck className="h-4 w-4 text-emerald-600" />,
  welcome: <UserPlus className="h-4 w-4 text-primary-600" /> };

type NotifRow = Notification & Record<string, unknown>;

/** Format notification type for display – capitalises "ID" properly. */
function formatNotifType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\bid\b/gi, 'ID');
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Notification | null>(null);

  /* ── Fetch notifications + customers from API ───────────────── */
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/notifications?limit=100')
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch((err) => console.error('Failed to fetch notifications:', err));
    fetch('/api/customers?limit=200&status=active')
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers ?? []))
      .catch((err) => console.error('Failed to fetch customers:', err));
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const delivered = notifications.filter((n) => n.status === 'delivered').length;
    const failed = notifications.filter((n) => n.status === 'failed' || n.status === 'bounced').length;
    const pending = notifications.filter((n) => n.status === 'pending').length;
    const sent = notifications.filter((n) => n.status === 'sent').length;
    return { total, delivered, failed, pending, sent };
  }, [notifications]);

  // Filtered data
  const filtered = useMemo<NotifRow[]>(() => {
    if (activeTab === 'all') return notifications as NotifRow[];
    if (activeTab === 'failed') {
      return notifications.filter((n) => n.status === 'failed' || n.status === 'bounced') as NotifRow[];
    }
    return notifications.filter((n) => n.status === activeTab) as NotifRow[];
  }, [activeTab, notifications]);

  // Tabs
  const tabs = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'sent', label: 'Sent', count: stats.sent },
    { id: 'delivered', label: 'Delivered', count: stats.delivered },
    { id: 'failed', label: 'Failed', count: stats.failed },
  ];

  // Table columns
  const columns: Column<NotifRow>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          {notifTypeIcon[row.type] || <Bell className="h-4 w-4 text-surface-400" />}
          <span className="text-xs font-medium capitalize">{formatNotifType(row.type)}</span>
        </div>
      ) },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (row) => {
        const c = row.customer;
        return c ? (
          <div>
            <span className="text-sm text-surface-200 font-medium">
              {c.firstName} {c.lastName}
            </span>
            <span className="ml-2 text-[10px] text-surface-500">{c.pmbNumber}</span>
          </div>
        ) : (
          <span className="text-surface-500">—</span>
        );
      } },
    {
      key: 'channel',
      label: 'Channel',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {(row.channel === 'email' || row.channel === 'both') && (
            <span className="inline-flex items-center gap-1 status-badge text-[10px] bg-blue-100 text-blue-600 border-blue-500/30">
              <Mail className="h-3 w-3" />
              Email
            </span>
          )}
          {(row.channel === 'sms' || row.channel === 'both') && (
            <span className="inline-flex items-center gap-1 status-badge text-[10px] bg-emerald-100 text-emerald-600 border-emerald-200">
              <Smartphone className="h-3 w-3" />
              SMS
            </span>
          )}
        </div>
      ) },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} className="text-xs">{row.status}</Badge> },
    {
      key: 'subject',
      label: 'Subject',
      render: (row) => (
        <span className="text-xs text-surface-300 max-w-[200px] truncate block">
          {row.subject || '—'}
        </span>
      ) },
    {
      key: 'sentAt',
      label: 'Sent',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-surface-400">
          {row.sentAt ? formatDateTime(row.sentAt) : '—'}
        </span>
      ) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      width: 'w-12',
      render: (row) => (
        <DropdownMenu
          trigger={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </div>
          }
          items={[
            { id: 'view', label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => setDetailModal(row) },
            { id: 'resend', label: 'Resend', icon: <RefreshCw className="h-4 w-4" /> },
          ]}
        />
      ) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Notifications"
        description="Manage and monitor customer notifications across all channels"
        actions={
          <Button leftIcon={<Send className="h-4 w-4" />} onClick={() => setSendModalOpen(true)}>
            Send Notification
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Send className="h-5 w-5" />}
          title="Total Sent"
          value={stats.total}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          title="Delivered"
          value={stats.delivered}
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          title="Failed"
          value={stats.failed}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          title="Pending"
          value={stats.pending}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Notification Log */}
      <DataTable
        columns={columns}
        data={filtered}
        keyAccessor={(row) => row.id}
        searchable={true}
        searchPlaceholder="Search by customer, type, subject..."
        pageSize={10}
        emptyMessage="No notifications found"
        onRowClick={(row) => setDetailModal(row)}
      />

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Notification Details"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailModal(null)}>Close</Button>
            <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>Resend</Button>
          </>
        }
      >
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500">Type</p>
                <div className="flex items-center gap-2 mt-1">
                  {notifTypeIcon[detailModal.type] || <Bell className="h-4 w-4 text-surface-400" />}
                  <span className="text-sm text-surface-200 capitalize font-medium">
                    {formatNotifType(detailModal.type)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-surface-500">Status</p>
                <div className="mt-1">
                  <Badge status={detailModal.status}>{detailModal.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-surface-500">Customer</p>
                <p className="text-sm text-surface-200 mt-1">
                  {detailModal.customer
                    ? `${detailModal.customer.firstName} ${detailModal.customer.lastName} (${detailModal.customer.pmbNumber})`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Channel</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {(detailModal.channel === 'email' || detailModal.channel === 'both') && (
                    <span className="inline-flex items-center gap-1 status-badge text-[10px] bg-blue-100 text-blue-600 border-blue-500/30">
                      <Mail className="h-3 w-3" /> Email
                    </span>
                  )}
                  {(detailModal.channel === 'sms' || detailModal.channel === 'both') && (
                    <span className="inline-flex items-center gap-1 status-badge text-[10px] bg-emerald-100 text-emerald-600 border-emerald-200">
                      <Smartphone className="h-3 w-3" /> SMS
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-surface-500">Created</p>
                <p className="text-sm text-surface-200 mt-1">{formatDateTime(detailModal.createdAt)}</p>
              </div>
              {detailModal.sentAt && (
                <div>
                  <p className="text-xs text-surface-500">Sent</p>
                  <p className="text-sm text-surface-200 mt-1">{formatDateTime(detailModal.sentAt)}</p>
                </div>
              )}
            </div>

            {detailModal.subject && (
              <div className="pt-3 border-t border-surface-800">
                <p className="text-xs text-surface-500 mb-1">Subject</p>
                <p className="text-sm text-surface-200 font-medium">{detailModal.subject}</p>
              </div>
            )}

            {detailModal.body && (
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Body</p>
                <p className="text-sm text-surface-300">{detailModal.body}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Send Notification Modal */}
      <Modal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Notification"
        description="Compose and send a notification to a customer"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendModalOpen(false)}>Cancel</Button>
            <Button leftIcon={<Send className="h-4 w-4" />}>Send Notification</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Customer"
              placeholder="Select customer..."
              options={customers.filter((c) => c.status === 'active').map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName} (${c.pmbNumber})` }))}
            />
            <Select
              label="Notification Type"
              placeholder="Select type..."
              options={[
                { value: 'package_arrival', label: 'Package Arrival' },
                { value: 'package_reminder', label: 'Package Reminder' },
                { value: 'mail_received', label: 'Mail Received' },
                { value: 'id_expiring', label: 'ID Expiring Soon' },
                { value: 'renewal_reminder', label: 'Renewal Reminder' },
                { value: 'shipment_update', label: 'Shipment Update' },
              ]}
            />
          </div>

          <Select
            label="Channel"
            placeholder="Select channel..."
            options={[
              { value: 'email', label: '📧 Email' },
              { value: 'sms', label: '📱 SMS' },
              { value: 'both', label: '📧📱 Email & SMS' },
            ]}
          />

          <Input label="Subject" placeholder="Notification subject line..." />
          <Textarea
            label="Body"
            placeholder="Write your notification message..."
            rows={4}
          />

          {/* Preview Section */}
          <div className="rounded-lg border border-surface-700/50 bg-surface-800/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-surface-400" />
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Preview</p>
            </div>
            <div className="rounded-lg bg-surface-900 border border-surface-700 p-4">
              <p className="text-sm text-surface-500 italic">
                Fill in the fields above to see a preview of your notification...
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
