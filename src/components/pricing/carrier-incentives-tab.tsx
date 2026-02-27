'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Package,
  Edit3,
  Save,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface CarrierRate {
  id: string;
  carrier: string;
  program: string;
  actionType: string;
  baseRate: number;
  tier2Rate: number;
  tier2Threshold: number;
  tier3Rate: number;
  tier3Threshold: number;
}

interface MonthlyIncentive {
  month: string;
  carrier: string;
  program: string;
  packagesHeld: number;
  packagesPickedUp: number;
  expectedCompensation: number;
  actualPayment: number;
  discrepancy: number;
  status: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const MOCK_RATES: CarrierRate[] = [
  { id: 'cr1', carrier: 'FedEx', program: 'Hold at Location (HAL)', actionType: 'Hold', baseRate: 1.50, tier2Rate: 1.75, tier2Threshold: 200, tier3Rate: 2.00, tier3Threshold: 500 },
  { id: 'cr2', carrier: 'FedEx', program: 'Hold at Location (HAL)', actionType: 'Pickup', baseRate: 0.50, tier2Rate: 0.60, tier2Threshold: 200, tier3Rate: 0.75, tier3Threshold: 500 },
  { id: 'cr3', carrier: 'FedEx', program: 'Hold at Location (HAL)', actionType: 'Return to Carrier', baseRate: 0.25, tier2Rate: 0.30, tier2Threshold: 200, tier3Rate: 0.40, tier3Threshold: 500 },
  { id: 'cr4', carrier: 'UPS', program: 'Access Point', actionType: 'Hold', baseRate: 1.25, tier2Rate: 1.50, tier2Threshold: 150, tier3Rate: 1.75, tier3Threshold: 400 },
  { id: 'cr5', carrier: 'UPS', program: 'Access Point', actionType: 'Pickup', baseRate: 0.40, tier2Rate: 0.50, tier2Threshold: 150, tier3Rate: 0.60, tier3Threshold: 400 },
  { id: 'cr6', carrier: 'UPS', program: 'Access Point', actionType: 'Return to Carrier', baseRate: 0.20, tier2Rate: 0.25, tier2Threshold: 150, tier3Rate: 0.35, tier3Threshold: 400 },
];

const MOCK_MONTHLY: MonthlyIncentive[] = [
  { month: '2026-02', carrier: 'FedEx', program: 'HAL', packagesHeld: 342, packagesPickedUp: 318, expectedCompensation: 672.00, actualPayment: 672.00, discrepancy: 0, status: 'reconciled' },
  { month: '2026-02', carrier: 'UPS', program: 'Access Point', packagesHeld: 215, packagesPickedUp: 198, expectedCompensation: 367.50, actualPayment: 350.00, discrepancy: -17.50, status: 'discrepancy' },
  { month: '2026-01', carrier: 'FedEx', program: 'HAL', packagesHeld: 310, packagesPickedUp: 295, expectedCompensation: 612.50, actualPayment: 612.50, discrepancy: 0, status: 'reconciled' },
  { month: '2026-01', carrier: 'UPS', program: 'Access Point', packagesHeld: 198, packagesPickedUp: 185, expectedCompensation: 332.50, actualPayment: 332.50, discrepancy: 0, status: 'reconciled' },
  { month: '2025-12', carrier: 'FedEx', program: 'HAL', packagesHeld: 289, packagesPickedUp: 270, expectedCompensation: 568.50, actualPayment: 568.50, discrepancy: 0, status: 'reconciled' },
  { month: '2025-12', carrier: 'UPS', program: 'Access Point', packagesHeld: 175, packagesPickedUp: 162, expectedCompensation: 293.50, actualPayment: 280.00, discrepancy: -13.50, status: 'discrepancy' },
];

const CARRIER_FILTER = [
  { value: 'all', label: 'All Carriers' },
  { value: 'FedEx', label: 'FedEx' },
  { value: 'UPS', label: 'UPS' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function CarrierIncentivesTab() {
  const [rates] = useState(MOCK_RATES);
  const [editModal, setEditModal] = useState<{ open: boolean; rate: CarrierRate | null }>({ open: false, rate: null });
  const [carrierFilter, setCarrierFilter] = useState('all');

  const filteredMonthly = useMemo(() => {
    return MOCK_MONTHLY.filter((m) => carrierFilter === 'all' || m.carrier === carrierFilter);
  }, [carrierFilter]);

  const stats = useMemo(() => {
    const currentMonth = MOCK_MONTHLY.filter((m) => m.month === '2026-02');
    const totalExpected = currentMonth.reduce((s, m) => s + m.expectedCompensation, 0);
    const totalActual = currentMonth.reduce((s, m) => s + m.actualPayment, 0);
    const totalPackages = currentMonth.reduce((s, m) => s + m.packagesHeld, 0);
    const totalDiscrepancy = currentMonth.reduce((s, m) => s + m.discrepancy, 0);
    return { totalExpected, totalActual, totalPackages, totalDiscrepancy };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Package className="h-5 w-5" />} title="Packages Held (Feb)" value={stats.totalPackages} change={8.2} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} title="Expected Compensation" value={formatCurrency(stats.totalExpected)} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Actual Received" value={formatCurrency(stats.totalActual)} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} title="Discrepancies" value={formatCurrency(Math.abs(stats.totalDiscrepancy))} />
      </div>

      {/* Incentive Rate Configuration */}
      <Card padding="none">
        <div className="px-5 py-3 border-b border-surface-800">
          <CardHeader className="!mb-0">
            <CardTitle>Carrier Incentive Rate Configuration</CardTitle>
          </CardHeader>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-5 py-2 text-xs font-medium text-surface-500 uppercase">Carrier</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-surface-500 uppercase">Program</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-surface-500 uppercase">Action</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Base Rate</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Tier 2</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Tier 3</th>
                <th className="text-right px-5 py-2 text-xs font-medium text-surface-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-medium text-surface-100">{r.carrier}</td>
                  <td className="px-3 py-3 text-surface-300">{r.program}</td>
                  <td className="px-3 py-3 text-surface-300">{r.actionType}</td>
                  <td className="px-3 py-3 text-right text-surface-100 font-medium">{formatCurrency(r.baseRate)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-surface-100">{formatCurrency(r.tier2Rate)}</span>
                    <span className="text-[10px] text-surface-500 ml-1">({r.tier2Threshold}+ pkg)</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-surface-100">{formatCurrency(r.tier3Rate)}</span>
                    <span className="text-[10px] text-surface-500 ml-1">({r.tier3Threshold}+ pkg)</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" iconOnly onClick={() => setEditModal({ open: true, rate: r })}><Edit3 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Monthly tracking */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-200">Monthly Incentive Tracking</h3>
        <div className="flex items-center gap-3">
          <Select options={CARRIER_FILTER} value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} />
          <Button variant="secondary" size="sm" leftIcon={<FileText className="h-3.5 w-3.5" />}>Export Report</Button>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-5 py-2 text-xs font-medium text-surface-500 uppercase">Month</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-surface-500 uppercase">Carrier</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Held</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Picked Up</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Expected</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Actual</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Diff</th>
                <th className="text-center px-5 py-2 text-xs font-medium text-surface-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {filteredMonthly.map((m, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 text-surface-200">{m.month}</td>
                  <td className="px-3 py-3 text-surface-300">{m.carrier} {m.program}</td>
                  <td className="px-3 py-3 text-right text-surface-100">{m.packagesHeld}</td>
                  <td className="px-3 py-3 text-right text-surface-100">{m.packagesPickedUp}</td>
                  <td className="px-3 py-3 text-right text-surface-100 font-medium">{formatCurrency(m.expectedCompensation)}</td>
                  <td className="px-3 py-3 text-right text-surface-100 font-medium">{formatCurrency(m.actualPayment)}</td>
                  <td className={`px-3 py-3 text-right font-medium ${m.discrepancy === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.discrepancy === 0 ? '—' : formatCurrency(m.discrepancy)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={m.status === 'reconciled' ? 'success' : 'danger'}>
                      {m.status === 'reconciled' ? 'Reconciled' : 'Discrepancy'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Aging Report */}
      <Card>
        <CardHeader><CardTitle>Unpaid Incentive Aging</CardTitle></CardHeader>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-500">0–30 Days</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(0)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-500">31–60 Days</p>
            <p className="text-lg font-bold text-yellow-400">{formatCurrency(17.50)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-500">61–90 Days</p>
            <p className="text-lg font-bold text-orange-400">{formatCurrency(13.50)}</p>
          </div>
          <div className="bg-surface-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-surface-500">90+ Days</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(0)}</p>
          </div>
        </div>
      </Card>

      {/* Edit Rate Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, rate: null })} title={`Edit Rate — ${editModal.rate?.carrier} ${editModal.rate?.actionType}`} size="md">
        {editModal.rate && (
          <div className="space-y-4">
            <Input label="Base Rate ($)" type="number" step="0.01" defaultValue={String(editModal.rate.baseRate)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tier 2 Rate ($)" type="number" step="0.01" defaultValue={String(editModal.rate.tier2Rate)} />
              <Input label="Tier 2 Threshold (pkgs)" type="number" defaultValue={String(editModal.rate.tier2Threshold)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tier 3 Rate ($)" type="number" step="0.01" defaultValue={String(editModal.rate.tier3Rate)} />
              <Input label="Tier 3 Threshold (pkgs)" type="number" defaultValue={String(editModal.rate.tier3Threshold)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setEditModal({ open: false, rate: null })}>Cancel</Button>
              <Button leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
