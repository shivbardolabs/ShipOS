'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { customers } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  Send,
  Printer,
  MoreHorizontal,
  Download,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Mock invoices                                                             */
/* -------------------------------------------------------------------------- */
interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerPmb: string;
  type: 'shipping' | 'storage' | 'receiving' | 'services' | 'monthly';
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
}

const today = new Date('2026-02-21');
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(today.getTime() + n * 86400000).toISOString();

const invoices: Invoice[] = [
  {
    id: 'inv_001', number: 'INV-2026-0041', customerId: 'cust_003', customerName: 'Robert Singh',
    customerPmb: 'PMB-0003', type: 'monthly', amount: 285.00, tax: 25.29, total: 310.29,
    status: 'paid', dueDate: daysAgo(5), createdAt: daysAgo(20), paidAt: daysAgo(7),
  },
  {
    id: 'inv_002', number: 'INV-2026-0042', customerId: 'cust_001', customerName: 'James Morrison',
    customerPmb: 'PMB-0001', type: 'shipping', amount: 147.50, tax: 13.09, total: 160.59,
    status: 'sent', dueDate: daysFromNow(10), createdAt: daysAgo(5),
  },
  {
    id: 'inv_003', number: 'INV-2026-0043', customerId: 'cust_005', customerName: 'David Kim',
    customerPmb: 'PMB-0005', type: 'storage', amount: 45.00, tax: 3.99, total: 48.99,
    status: 'overdue', dueDate: daysAgo(3), createdAt: daysAgo(18),
  },
  {
    id: 'inv_004', number: 'INV-2026-0044', customerId: 'cust_010', customerName: 'Elizabeth Martinez',
    customerPmb: 'PMB-0010', type: 'services', amount: 520.00, tax: 46.15, total: 566.15,
    status: 'paid', dueDate: daysAgo(10), createdAt: daysAgo(30), paidAt: daysAgo(12),
  },
  {
    id: 'inv_005', number: 'INV-2026-0045', customerId: 'cust_014', customerName: 'Jessica White',
    customerPmb: 'PMB-0014', type: 'monthly', amount: 195.00, tax: 17.31, total: 212.31,
    status: 'sent', dueDate: daysFromNow(5), createdAt: daysAgo(10),
  },
  {
    id: 'inv_006', number: 'INV-2026-0046', customerId: 'cust_021', customerName: 'Mark Walker',
    customerPmb: 'PMB-0021', type: 'receiving', amount: 87.50, tax: 7.77, total: 95.27,
    status: 'draft', dueDate: daysFromNow(15), createdAt: daysAgo(1),
  },
  {
    id: 'inv_007', number: 'INV-2026-0047', customerId: 'cust_024', customerName: 'Donna Young',
    customerPmb: 'PMB-0024', type: 'shipping', amount: 312.75, tax: 27.76, total: 340.51,
    status: 'paid', dueDate: daysAgo(2), createdAt: daysAgo(15), paidAt: daysAgo(4),
  },
  {
    id: 'inv_008', number: 'INV-2026-0048', customerId: 'cust_017', customerName: 'Matthew Garcia',
    customerPmb: 'PMB-0017', type: 'storage', amount: 65.00, tax: 5.77, total: 70.77,
    status: 'overdue', dueDate: daysAgo(7), createdAt: daysAgo(22),
  },
  {
    id: 'inv_009', number: 'INV-2026-0049', customerId: 'cust_012', customerName: 'Sarah Taylor',
    customerPmb: 'PMB-0012', type: 'monthly', amount: 225.00, tax: 19.97, total: 244.97,
    status: 'draft', dueDate: daysFromNow(20), createdAt: daysAgo(0),
  },
  {
    id: 'inv_010', number: 'INV-2026-0050', customerId: 'cust_029', customerName: 'Kevin Scott',
    customerPmb: 'PMB-0029', type: 'services', amount: 175.00, tax: 15.53, total: 190.53,
    status: 'sent', dueDate: daysFromNow(8), createdAt: daysAgo(7),
  },
];

/* -------------------------------------------------------------------------- */
/*  Stats                                                                     */
/* -------------------------------------------------------------------------- */
const outstanding = invoices
  .filter((i) => i.status === 'sent' || i.status === 'overdue')
  .reduce((s, i) => s + i.total, 0);
const overdue = invoices
  .filter((i) => i.status === 'overdue')
  .reduce((s, i) => s + i.total, 0);
const paidThisMonth = invoices
  .filter((i) => i.status === 'paid')
  .reduce((s, i) => s + i.total, 0);
const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);

/* -------------------------------------------------------------------------- */
/*  Invoicing Page                                                            */
/* -------------------------------------------------------------------------- */
export default function InvoicingPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionRow, setActionRow] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    switch (activeTab) {
      case 'draft':
        return invoices.filter((i) => i.status === 'draft');
      case 'sent':
        return invoices.filter((i) => i.status === 'sent');
      case 'paid':
        return invoices.filter((i) => i.status === 'paid');
      case 'overdue':
        return invoices.filter((i) => i.status === 'overdue');
      default:
        return invoices;
    }
  }, [activeTab]);

  const tabs = [
    { id: 'all', label: 'All', count: invoices.length },
    { id: 'draft', label: 'Draft', count: invoices.filter((i) => i.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: invoices.filter((i) => i.status === 'sent').length },
    { id: 'paid', label: 'Paid', count: invoices.filter((i) => i.status === 'paid').length },
    { id: 'overdue', label: 'Overdue', count: invoices.filter((i) => i.status === 'overdue').length },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'sent': return 'info';
      case 'overdue': return 'danger';
      case 'draft': return 'muted';
      default: return 'default';
    }
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      shipping: 'Shipping',
      storage: 'Storage Fee',
      receiving: 'Receiving Fee',
      services: 'Services',
      monthly: 'Monthly Invoice',
    };
    return map[type] || type;
  };

  const columns: Column<Invoice & Record<string, unknown>>[] = [
    {
      key: 'number',
      label: 'Invoice #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm text-primary-600 font-medium">{row.number}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-surface-200">{row.customerName}</span>
          <p className="text-xs text-surface-500">{row.customerPmb}</p>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <Badge variant="muted" dot={false}>
          {typeLabel(row.type)}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      sortable: true,
      render: (row) => <span className="text-surface-300">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'tax',
      label: 'Tax',
      align: 'right',
      render: (row) => <span className="text-surface-500 text-xs">{formatCurrency(row.tax)}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="text-surface-100 font-semibold">{formatCurrency(row.total)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={statusVariant(row.status) as 'success' | 'info' | 'danger' | 'muted'} dot>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (row) => {
        const isOverdue =
          row.status !== 'paid' && new Date(row.dueDate) < today;
        return (
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-surface-400'}`}>
            {formatDate(row.dueDate)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      width: 'w-10',
      render: (row) => (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={(e) => {
              e.stopPropagation();
              setActionRow(actionRow === row.id ? null : row.id);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {actionRow === row.id && (
            <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-surface-700 bg-surface-900 shadow-xl py-1">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                <Eye className="h-3.5 w-3.5" /> View Invoice
              </button>
              {row.status === 'draft' && (
                <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                  <Send className="h-3.5 w-3.5" /> Send Invoice
                </button>
              )}
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                <Download className="h-3.5 w-3.5" /> Download PDF
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-800">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoicing"
        description="Create and track invoices."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Create Invoice
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          title="Outstanding"
          value={formatCurrency(outstanding)}
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5" />}
          title="Overdue"
          value={formatCurrency(overdue)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Paid This Month"
          value={formatCurrency(paidThisMonth)}
          change={18}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          change={12}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Invoice Table */}
      <TabPanel active={true}>
        <DataTable
          columns={columns}
          data={filteredInvoices as (Invoice & Record<string, unknown>)[]}
          keyAccessor={(row) => row.id}
          searchable
          searchPlaceholder="Search invoices…"
          searchFields={['number', 'customerName', 'customerPmb', 'type']}
          pageSize={10}
          emptyMessage="No invoices found"
        />
      </TabPanel>

      {/* Create Invoice Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Invoice"
        description="Create a new invoice."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => setShowCreate(false)}
            >
              Save as Draft
            </Button>
            <Button
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => setShowCreate(false)}
            >
              Create & Send
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Select
            label="Customer"
            placeholder="Select a customer..."
            options={customers
              .filter((c) => c.status === 'active')
              .map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName} (${c.pmbNumber})`,
              }))}
          />
          <Select
            label="Invoice Type"
            placeholder="Select type..."
            options={[
              { value: 'monthly', label: 'Monthly Invoice' },
              { value: 'shipping', label: 'Shipping' },
              { value: 'storage', label: 'Storage Fee' },
              { value: 'receiving', label: 'Receiving Fee' },
              { value: 'services', label: 'Services' },
            ]}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
            <Input
              label="Tax Rate (%)"
              type="number"
              placeholder="8.875"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-surface-300">Total</label>
              <div className="flex items-center h-[38px] rounded-lg border border-surface-700 bg-surface-800 px-3.5 text-sm">
                <span className="text-surface-100 font-semibold">$0.00</span>
              </div>
              <p className="text-xs text-surface-500">Auto-calculated</p>
            </div>
          </div>
          <Input label="Due Date" type="date" />
          <Input label="Notes (optional)" placeholder="Additional notes for this invoice..." />
        </div>
      </Modal>
    </div>
  );
}
