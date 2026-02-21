'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { mailPieces, customers } from '@/lib/mock-data';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { MailPiece } from '@/lib/types';
import {
  ScanLine,
  Inbox,
  Eye,
  Forward,
  Hand,
  Trash2,
  Mail,
  FileText,
  BookOpen,
  ScrollText,
  MoreVertical,
  Send,
  Clock,
  ArrowUpRight } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const mailTypeIcon: Record<string, React.ReactNode> = {
  letter: <Mail className="h-4 w-4 text-blue-600" />,
  magazine: <BookOpen className="h-4 w-4 text-indigo-600" />,
  catalog: <ScrollText className="h-4 w-4 text-amber-600" />,
  legal: <FileText className="h-4 w-4 text-red-600" />,
  other: <Inbox className="h-4 w-4 text-surface-400" /> };

type MailRow = MailPiece & Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/*  Stats                                                                     */
/* -------------------------------------------------------------------------- */

function useMailStats() {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.getTime();

    const receivedToday = mailPieces.filter((m) => new Date(m.receivedAt).getTime() >= todayStr).length;
    const pending = mailPieces.filter((m) => m.status === 'received' || m.status === 'scanned').length;
    const forwarded = mailPieces.filter((m) => m.status === 'forwarded').length;
    const held = mailPieces.filter((m) => m.status === 'held').length;

    return { receivedToday, pending, forwarded, held };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Columns                                                                   */
/* -------------------------------------------------------------------------- */

function useColumns(onView: (mail: MailPiece) => void) {
  return useMemo<Column<MailRow>[]>(() => [
    {
      key: 'type',
      label: 'Type',
      width: 'w-24',
      render: (row) => (
        <div className="flex items-center gap-2">
          {mailTypeIcon[row.type] || mailTypeIcon.other}
          <span className="capitalize text-xs font-medium">{row.type}</span>
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
      key: 'sender',
      label: 'Sender',
      sortable: true,
      render: (row) => <span className="text-sm">{row.sender || '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} className="text-xs">{row.status}</Badge> },
    {
      key: 'receivedAt',
      label: 'Received',
      sortable: true,
      render: (row) => <span className="text-xs text-surface-400">{formatDate(row.receivedAt)}</span> },
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
            { id: 'view', label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => onView(row) },
            { id: 'notify', label: 'Notify Customer', icon: <Send className="h-4 w-4" /> },
            { id: 'hold', label: 'Hold', icon: <Hand className="h-4 w-4" /> },
            { id: 'forward', label: 'Forward', icon: <Forward className="h-4 w-4" /> },
            'separator',
            { id: 'discard', label: 'Discard', icon: <Trash2 className="h-4 w-4" />, danger: true },
          ]}
        />
      ) },
  ], [onView]);
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function MailPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<MailPiece | null>(null);
  const stats = useMailStats();

  const filtered = useMemo<MailRow[]>(() => {
    if (activeTab === 'all') return mailPieces as MailRow[];
    return mailPieces.filter((m) => m.status === activeTab) as MailRow[];
  }, [activeTab]);

  const columns = useColumns((mail) => setDetailModal(mail));

  const tabs = [
    { id: 'all', label: 'All', count: mailPieces.length },
    { id: 'received', label: 'Received', count: mailPieces.filter((m) => m.status === 'received').length },
    { id: 'scanned', label: 'Scanned', count: mailPieces.filter((m) => m.status === 'scanned').length },
    { id: 'notified', label: 'Notified', count: mailPieces.filter((m) => m.status === 'notified').length },
    { id: 'held', label: 'Held', count: mailPieces.filter((m) => m.status === 'held').length },
    { id: 'forwarded', label: 'Forwarded', count: mailPieces.filter((m) => m.status === 'forwarded').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Mail Management"
        description="Process, scan, and manage incoming mail for all customers"
        actions={
          <Button leftIcon={<ScanLine className="h-4 w-4" />} onClick={() => setScanModalOpen(true)}>
            Scan Mail
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Inbox className="h-5 w-5" />}
          title="Received Today"
          value={stats.receivedToday}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          title="Pending Action"
          value={stats.pending}
        />
        <StatCard
          icon={<ArrowUpRight className="h-5 w-5" />}
          title="Forwarded"
          value={stats.forwarded}
        />
        <StatCard
          icon={<Hand className="h-5 w-5" />}
          title="Held"
          value={stats.held}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyAccessor={(row) => row.id}
        searchable={true}
        searchPlaceholder="Search mail by customer, sender..."
        pageSize={10}
        emptyMessage="No mail pieces found"
        onRowClick={(row) => setDetailModal(row)}
      />

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title="Mail Piece Details"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailModal(null)}>Close</Button>
            <Button leftIcon={<Send className="h-4 w-4" />}>Notify Customer</Button>
          </>
        }
      >
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-surface-500">Type</p>
                <div className="flex items-center gap-2 mt-1">
                  {mailTypeIcon[detailModal.type]}
                  <span className="text-sm text-surface-200 capitalize font-medium">{detailModal.type}</span>
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
                <p className="text-xs text-surface-500">Sender</p>
                <p className="text-sm text-surface-200 mt-1">{detailModal.sender || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-surface-500">Received</p>
                <p className="text-sm text-surface-200 mt-1">{formatDateTime(detailModal.receivedAt)}</p>
              </div>
              {detailModal.action && (
                <div>
                  <p className="text-xs text-surface-500">Action</p>
                  <p className="text-sm text-surface-200 mt-1 capitalize">{detailModal.action.replace('_', ' ')}</p>
                </div>
              )}
            </div>
            {detailModal.notes && (
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-500 mb-1">Notes</p>
                <p className="text-sm text-surface-300">{detailModal.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Scan New Mail Modal */}
      <Modal
        open={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Scan New Mail"
        description="Log a new mail piece for a customer"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScanModalOpen(false)}>Cancel</Button>
            <Button leftIcon={<ScanLine className="h-4 w-4" />}>Save Mail Piece</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Customer"
            placeholder="Select customer..."
            options={customers.filter((c) => c.status === 'active').map((c) => ({
              value: c.id,
              label: `${c.firstName} ${c.lastName} (${c.pmbNumber})` }))}
          />
          <Select
            label="Mail Type"
            placeholder="Select type..."
            options={[
              { value: 'letter', label: 'Letter' },
              { value: 'magazine', label: 'Magazine' },
              { value: 'catalog', label: 'Catalog' },
              { value: 'legal', label: 'Legal' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input label="Sender" placeholder="e.g. IRS, Chase Bank..." />
          <Textarea label="Notes" placeholder="Any additional notes about this mail piece..." />
        </div>
      </Modal>
    </div>
  );
}
