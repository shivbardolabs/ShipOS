'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Users,
  Clock,
  Edit3,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  Eye,
  Save,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface CustomerAccount {
  id: string;
  name: string;
  pmbNumber: string;
  plan: string;
  balance: number;
  pendingCharges: number;
  lastPayment: string;
  billingCycle: string;
  status: string;
  allowanceUsed: { mail: number; mailLimit: number; scans: number; scansLimit: number; storage: number; storageLimit: number };
}

interface ChargeEntry {
  id: string;
  date: string;
  action: string;
  description: string;
  amount: number;
  type: 'charge' | 'credit' | 'payment' | 'adjustment';
}

interface AdjustmentRequest {
  customerId: string;
  customerName: string;
  type: 'credit' | 'debit';
  amount: string;
  reason: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const MOCK_ACCOUNTS: CustomerAccount[] = [
  {
    id: 'c1', name: 'John Martinez', pmbNumber: 'PMB-0001', plan: 'Gold',
    balance: 47.50, pendingCharges: 12.00, lastPayment: '2026-02-15', billingCycle: 'Monthly',
    status: 'current',
    allowanceUsed: { mail: 85, mailLimit: 120, scans: 22, scansLimit: 30, storage: 5, storageLimit: 30 },
  },
  {
    id: 'c2', name: 'Sarah Chen', pmbNumber: 'PMB-0002', plan: 'Silver',
    balance: 15.75, pendingCharges: 0, lastPayment: '2026-02-20', billingCycle: 'Monthly',
    status: 'current',
    allowanceUsed: { mail: 42, mailLimit: 60, scans: 8, scansLimit: 15, storage: 2, storageLimit: 30 },
  },
  {
    id: 'c3', name: 'TechCorp LLC', pmbNumber: 'PMB-0003', plan: 'Platinum',
    balance: 125.00, pendingCharges: 45.00, lastPayment: '2026-02-10', billingCycle: 'Monthly',
    status: 'overdue',
    allowanceUsed: { mail: 220, mailLimit: 240, scans: 55, scansLimit: 60, storage: 18, storageLimit: 60 },
  },
  {
    id: 'c4', name: 'Emily Rodriguez', pmbNumber: 'PMB-0004', plan: 'Bronze',
    balance: 0, pendingCharges: 3.50, lastPayment: '2026-02-25', billingCycle: 'Monthly',
    status: 'current',
    allowanceUsed: { mail: 28, mailLimit: 30, scans: 4, scansLimit: 5, storage: 0, storageLimit: 30 },
  },
  {
    id: 'c5', name: 'David Kim', pmbNumber: 'PMB-0005', plan: 'Gold',
    balance: 67.25, pendingCharges: 8.00, lastPayment: '2026-02-18', billingCycle: 'Weekly',
    status: 'current',
    allowanceUsed: { mail: 98, mailLimit: 120, scans: 28, scansLimit: 30, storage: 12, storageLimit: 30 },
  },
  {
    id: 'c6', name: 'Metro Business Services', pmbNumber: 'PMB-0006', plan: 'Platinum',
    balance: 210.50, pendingCharges: 35.00, lastPayment: '2026-02-05', billingCycle: 'Monthly',
    status: 'overdue',
    allowanceUsed: { mail: 240, mailLimit: 240, scans: 60, scansLimit: 60, storage: 45, storageLimit: 60 },
  },
];

const MOCK_CHARGES: ChargeEntry[] = [
  { id: 'ch1', date: '2026-02-26', action: 'Package Receiving', description: 'FedEx package #7234', amount: 3.00, type: 'charge' },
  { id: 'ch2', date: '2026-02-26', action: 'Storage Fee', description: '3 items × $1.00/day', amount: 3.00, type: 'charge' },
  { id: 'ch3', date: '2026-02-25', action: 'Document Scanning', description: '12 pages (5 incl + 7 × $0.25)', amount: 1.75, type: 'charge' },
  { id: 'ch4', date: '2026-02-25', action: 'Payment Received', description: 'Visa ending 4242', amount: -50.00, type: 'payment' },
  { id: 'ch5', date: '2026-02-24', action: 'Forwarding', description: 'USPS Priority to CA', amount: 12.50, type: 'charge' },
  { id: 'ch6', date: '2026-02-24', action: 'Credit Adjustment', description: 'Overcharged scanning — mgr approved', amount: -2.00, type: 'credit' },
];

const BILLING_OPTIONS = [
  { value: 'all', label: 'All Customers' },
  { value: 'overdue', label: 'Overdue Only' },
  { value: 'current', label: 'Current Only' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function AllowanceMeter({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isOver = used > limit;

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-surface-500">{label}</span>
        <span className={isOver ? 'text-red-400 font-medium' : 'text-surface-400'}>{used}/{limit}</span>
      </div>
      <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function CustomerBillingTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accounts] = useState(MOCK_ACCOUNTS);
  const [detailModal, setDetailModal] = useState<{ open: boolean; account: CustomerAccount | null }>({ open: false, account: null });
  const [adjustModal, setAdjustModal] = useState<AdjustmentRequest | null>(null);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.pmbNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [accounts, search, statusFilter]);

  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const totalPending = accounts.reduce((s, a) => s + a.pendingCharges, 0);
    const overdue = accounts.filter((a) => a.status === 'overdue').length;
    return { totalBalance, totalPending, overdue, total: accounts.length };
  }, [accounts]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} title="Total Outstanding" value={formatCurrency(stats.totalBalance)} />
        <StatCard icon={<Clock className="h-5 w-5" />} title="Pending Charges" value={formatCurrency(stats.totalPending)} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Overdue Accounts" value={stats.overdue} />
        <StatCard icon={<Users className="h-5 w-5" />} title="Active Accounts" value={stats.total} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select options={BILLING_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        <Button variant="secondary" leftIcon={<FileText className="h-4 w-4" />}>Generate Statements</Button>
      </div>

      {/* Customer accounts */}
      <div className="space-y-3">
        {filtered.map((acct) => (
          <Card key={acct.id} padding="none">
            <div className="px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-surface-100">{acct.name}</h4>
                    <span className="text-xs text-surface-500">{acct.pmbNumber}</span>
                    <Badge variant={acct.plan === 'Platinum' ? 'default' : acct.plan === 'Gold' ? 'warning' : 'muted'} dot={false}>{acct.plan}</Badge>
                    <Badge variant={acct.status === 'current' ? 'success' : 'danger'}>{acct.status === 'current' ? 'Current' : 'Overdue'}</Badge>
                  </div>

                  {/* Allowance meters */}
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <AllowanceMeter used={acct.allowanceUsed.mail} limit={acct.allowanceUsed.mailLimit} label="Mail items" />
                    <AllowanceMeter used={acct.allowanceUsed.scans} limit={acct.allowanceUsed.scansLimit} label="Scan pages" />
                    <AllowanceMeter used={acct.allowanceUsed.storage} limit={acct.allowanceUsed.storageLimit} label="Storage days" />
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-surface-500">Balance</p>
                  <p className={`text-lg font-bold ${acct.balance > 0 ? 'text-surface-100' : 'text-emerald-400'}`}>
                    {formatCurrency(acct.balance)}
                  </p>
                  {acct.pendingCharges > 0 && (
                    <p className="text-[10px] text-yellow-400">+{formatCurrency(acct.pendingCharges)} pending</p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" iconOnly onClick={() => setDetailModal({ open: true, account: acct })}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" iconOnly onClick={() => setAdjustModal({ customerId: acct.id, customerName: acct.name, type: 'credit', amount: '', reason: '' })}>
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2 text-[10px] text-surface-500">
                <span>Billing: {acct.billingCycle}</span>
                <span>Last payment: {new Date(acct.lastPayment).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Billing options info */}
      <Card>
        <CardHeader><CardTitle>Flexible Billing Options</CardTitle></CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['Per-Action', 'End-of-Day Batch', 'Weekly Invoice', 'Monthly Statement', 'On-Demand'].map((opt) => (
            <div key={opt} className="bg-surface-800/50 rounded-lg px-3 py-2 text-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-surface-300">{opt}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal open={detailModal.open} onClose={() => setDetailModal({ open: false, account: null })} title={`Account — ${detailModal.account?.name ?? ''}`} size="lg">
        {detailModal.account && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Balance</p>
                <p className="text-xl font-bold text-surface-100">{formatCurrency(detailModal.account.balance)}</p>
              </div>
              <div className="bg-surface-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Pending</p>
                <p className="text-xl font-bold text-yellow-400">{formatCurrency(detailModal.account.pendingCharges)}</p>
              </div>
              <div className="bg-surface-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Plan</p>
                <p className="text-xl font-bold text-primary-400">{detailModal.account.plan}</p>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-surface-200 pt-2">Recent Transactions</h4>
            <div className="space-y-2">
              {MOCK_CHARGES.map((ch) => (
                <div key={ch.id} className="flex items-center gap-3 bg-surface-800/50 rounded-lg px-4 py-2 text-sm">
                  <span className="text-xs text-surface-500 w-20">{new Date(ch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div className="flex-1">
                    <p className="text-surface-200">{ch.action}</p>
                    <p className="text-[10px] text-surface-500">{ch.description}</p>
                  </div>
                  <span className={`font-medium ${ch.amount > 0 ? 'text-surface-100' : 'text-emerald-400'}`}>
                    {ch.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(ch.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Adjustment Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Adjust Account — ${adjustModal?.customerName ?? ''}`} size="md">
        {adjustModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-surface-800 rounded-lg p-1">
              <button
                onClick={() => setAdjustModal((p) => p ? { ...p, type: 'credit' } : p)}
                className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adjustModal.type === 'credit' ? 'bg-emerald-600 text-white' : 'text-surface-400'}`}
              ><Minus className="h-3 w-3 inline mr-1" />Credit (reduce)</button>
              <button
                onClick={() => setAdjustModal((p) => p ? { ...p, type: 'debit' } : p)}
                className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adjustModal.type === 'debit' ? 'bg-red-600 text-white' : 'text-surface-400'}`}
              ><Plus className="h-3 w-3 inline mr-1" />Debit (increase)</button>
            </div>
            <Input label="Amount ($)" type="number" step="0.01" value={adjustModal.amount} onChange={(e) => setAdjustModal((p) => p ? { ...p, amount: e.target.value } : p)} />
            <Input label="Reason (required)" placeholder="Reason for adjustment..." value={adjustModal.reason} onChange={(e) => setAdjustModal((p) => p ? { ...p, reason: e.target.value } : p)} helperText="Manager approval required for adjustments above $50.00" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAdjustModal(null)}>Cancel</Button>
              <Button leftIcon={<Save className="h-4 w-4" />} disabled={!adjustModal.amount || !adjustModal.reason}>Submit Adjustment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
