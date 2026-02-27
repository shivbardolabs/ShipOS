'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit3,
  PackageOpen,
  Archive,
  ScanLine,
  Trash2,
  Truck,
  Sparkles,
  Settings,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ReceivingFee {
  id: string;
  parcelType: string;
  fee: number;
  isFree: boolean;
  bulkDiscount: number;
}

interface StorageFee {
  id: string;
  parcelType: string;
  freeDays: number;
  dailyRate: number;
  countWeekends: boolean;
}

interface ScanningFee {
  id: string;
  firstPageRate: number;
  additionalPageRate: number;
  includedPages: number;
  maxPages: number;
}

interface DisposalFee {
  id: string;
  method: string;
  description: string;
  fee: number;
  isActive: boolean;
}

interface ForwardingFee {
  id: string;
  method: string;
  description: string;
  handlingFee: number;
  feeType: string;
}

interface CustomAction {
  id: string;
  name: string;
  description: string;
  feeType: string;
  rate: number;
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const MOCK_RECEIVING: ReceivingFee[] = [
  { id: 'r1', parcelType: 'Letter', fee: 0, isFree: true, bulkDiscount: 0 },
  { id: 'r2', parcelType: 'Softpak / Bubble Mailer', fee: 1.50, isFree: false, bulkDiscount: 10 },
  { id: 'r3', parcelType: 'Parcel', fee: 3.00, isFree: false, bulkDiscount: 15 },
  { id: 'r4', parcelType: 'Package / Box', fee: 3.00, isFree: false, bulkDiscount: 15 },
  { id: 'r5', parcelType: 'Large Box', fee: 5.00, isFree: false, bulkDiscount: 10 },
  { id: 'r6', parcelType: 'Heavy Package', fee: 8.00, isFree: false, bulkDiscount: 5 },
  { id: 'r7', parcelType: 'Freight', fee: 15.00, isFree: false, bulkDiscount: 0 },
  { id: 'r8', parcelType: 'Special Handling: Art', fee: 10.00, isFree: false, bulkDiscount: 0 },
  { id: 'r9', parcelType: 'Perishables', fee: 5.00, isFree: false, bulkDiscount: 0 },
];

const MOCK_STORAGE: StorageFee[] = [
  { id: 's1', parcelType: 'Letter', freeDays: 30, dailyRate: 0.05, countWeekends: false },
  { id: 's2', parcelType: 'Softpak / Bubble Mailer', freeDays: 14, dailyRate: 0.10, countWeekends: true },
  { id: 's3', parcelType: 'Parcel', freeDays: 10, dailyRate: 0.50, countWeekends: true },
  { id: 's4', parcelType: 'Package / Box', freeDays: 10, dailyRate: 1.00, countWeekends: true },
  { id: 's5', parcelType: 'Large Box', freeDays: 5, dailyRate: 2.00, countWeekends: true },
  { id: 's6', parcelType: 'Heavy Package', freeDays: 5, dailyRate: 3.00, countWeekends: true },
  { id: 's7', parcelType: 'Freight', freeDays: 3, dailyRate: 5.00, countWeekends: true },
  { id: 's8', parcelType: 'Special Handling: Art', freeDays: 7, dailyRate: 2.00, countWeekends: false },
  { id: 's9', parcelType: 'Perishables', freeDays: 1, dailyRate: 3.00, countWeekends: true },
];

const MOCK_SCANNING: ScanningFee = {
  id: 'sc1', firstPageRate: 2.00, additionalPageRate: 0.25, includedPages: 0, maxPages: 50,
};

const MOCK_DISPOSAL: DisposalFee[] = [
  { id: 'd1', method: 'Trash', description: 'Standard disposal of unwanted items', fee: 0.00, isActive: true },
  { id: 'd2', method: 'Shred', description: 'Secure certified document destruction', fee: 1.00, isActive: true },
  { id: 'd3', method: 'Recycle', description: 'Eco-friendly material recycling', fee: 0.00, isActive: true },
];

const MOCK_FORWARDING: ForwardingFee[] = [
  { id: 'f1', method: 'Via Carrier (USPS/FedEx/UPS/DHL)', description: 'Standard carrier shipment', handlingFee: 3.50, feeType: 'Actual shipping + handling' },
  { id: 'f2', method: 'Courier / Messenger', description: 'Local courier delivery', handlingFee: 5.00, feeType: 'Flat rate + handling' },
  { id: 'f3', method: 'Freight (LTL/FTL)', description: 'Large item freight shipping', handlingFee: 15.00, feeType: 'Quote-based + handling' },
  { id: 'f4', method: 'Uber / On-Demand', description: 'On-demand ride-share delivery', handlingFee: 5.00, feeType: 'On-demand rate + handling' },
  { id: 'f5', method: 'Other', description: 'Custom forwarding method', handlingFee: 3.00, feeType: 'Custom' },
];

const MOCK_CUSTOM_ACTIONS: CustomAction[] = [
  { id: 'ca1', name: 'Photo Documentation', description: 'Photograph package contents', feeType: 'Per photo', rate: 2.00, isActive: true },
  { id: 'ca2', name: 'Repackaging', description: 'Repack items into new container', feeType: 'Flat rate', rate: 5.00, isActive: true },
  { id: 'ca3', name: 'Insurance', description: 'Declared value insurance', feeType: 'Percentage', rate: 2.5, isActive: true },
  { id: 'ca4', name: 'Notarization', description: 'Notary public service', feeType: 'Per signing', rate: 15.00, isActive: true },
];

const FEE_TYPE_OPTIONS = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'per-unit', label: 'Per Unit' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'tiered', label: 'Tiered' },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function BillableActionsTab() {
  const [subTab, setSubTab] = useState('receiving');
  const [receiving] = useState(MOCK_RECEIVING);
  const [storage, setStorage] = useState(MOCK_STORAGE);
  const [scanning] = useState(MOCK_SCANNING);
  const [disposal] = useState(MOCK_DISPOSAL);
  const [forwarding] = useState(MOCK_FORWARDING);
  const [customActions, setCustomActions] = useState(MOCK_CUSTOM_ACTIONS);
  /* reserved for future inline editing */
  const [createCustomModal, setCreateCustomModal] = useState(false);
  const [newAction, setNewAction] = useState({ name: '', description: '', feeType: 'flat', rate: '' });

  const subTabs = [
    { id: 'receiving', label: 'Receiving', icon: <PackageOpen className="h-3.5 w-3.5" /> },
    { id: 'storage', label: 'Storage', icon: <Archive className="h-3.5 w-3.5" /> },
    { id: 'scanning', label: 'Scanning', icon: <ScanLine className="h-3.5 w-3.5" /> },
    { id: 'disposal', label: 'Disposal', icon: <Trash2 className="h-3.5 w-3.5" /> },
    { id: 'forwarding', label: 'Forwarding', icon: <Truck className="h-3.5 w-3.5" /> },
    { id: 'special', label: 'Special Handling', icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: 'custom', label: 'Custom Actions', icon: <Settings className="h-3.5 w-3.5" /> },
  ];

  const toggleWeekendCounting = (id: string) => {
    setStorage((prev) => prev.map((s) => (s.id === id ? { ...s, countWeekends: !s.countWeekends } : s)));
  };

  const addCustomAction = () => {
    if (!newAction.name.trim()) return;
    const action: CustomAction = {
      id: `ca_${Date.now()}`, name: newAction.name, description: newAction.description,
      feeType: newAction.feeType === 'flat' ? 'Flat rate' : newAction.feeType === 'per-unit' ? 'Per unit' : newAction.feeType === 'percentage' ? 'Percentage' : 'Tiered',
      rate: parseFloat(newAction.rate) || 0, isActive: true,
    };
    setCustomActions((prev) => [...prev, action]);
    setCreateCustomModal(false);
    setNewAction({ name: '', description: '', feeType: 'flat', rate: '' });
  };

  const toggleCustomActive = (id: string) => {
    setCustomActions((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a)));
  };

  const deleteCustomAction = (id: string) => {
    setCustomActions((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <Tabs tabs={subTabs} activeTab={subTab} onChange={setSubTab} />

      {/* Receiving */}
      <TabPanel active={subTab === 'receiving'}>
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Receiving Fees by Parcel Type</CardTitle></CardHeader>
          </div>
          <div className="divide-y divide-surface-800">
            {receiving.map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center gap-4">
                <span className="text-sm text-surface-200 flex-1">{r.parcelType}</span>
                <div className="flex items-center gap-3">
                  {r.isFree ? (
                    <Badge variant="success">Free</Badge>
                  ) : (
                    <span className="text-sm font-semibold text-surface-100">{formatCurrency(r.fee)}</span>
                  )}
                  {r.bulkDiscount > 0 && (
                    <Badge variant="info" dot={false}>{r.bulkDiscount}% bulk discount</Badge>
                  )}
                  <Button size="sm" variant="ghost" iconOnly><Edit3 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      {/* Storage */}
      <TabPanel active={subTab === 'storage'}>
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Storage Fees by Parcel Type</CardTitle></CardHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-5 py-2 text-xs font-medium text-surface-500 uppercase">Parcel Type</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Free Days</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-surface-500 uppercase">Daily Rate</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-surface-500 uppercase">Weekends</th>
                  <th className="text-right px-5 py-2 text-xs font-medium text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {storage.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-surface-200">{s.parcelType}</td>
                    <td className="px-3 py-3 text-right text-surface-100 font-medium">{s.freeDays} days</td>
                    <td className="px-3 py-3 text-right text-surface-100 font-medium">{formatCurrency(s.dailyRate)}/day</td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => toggleWeekendCounting(s.id)}>
                        {s.countWeekends ? <ToggleRight className="h-5 w-5 text-emerald-400 mx-auto" /> : <ToggleLeft className="h-5 w-5 text-surface-500 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" iconOnly><Edit3 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-surface-200">Competitive Benchmarks</h4>
              <div className="text-xs text-surface-500 mt-1 space-y-0.5">
                <p><strong className="text-surface-400">iPostal1:</strong> 30 days free (letters/small), 10 days (medium), 5 days (large)</p>
                <p><strong className="text-surface-400">PostScan Mail:</strong> 30 days free (mail), 7 days (packages), then $0.05/envelope/day</p>
                <p><strong className="text-surface-400">Anytime Mailbox:</strong> Varies by location</p>
              </div>
            </div>
          </div>
        </Card>
      </TabPanel>

      {/* Scanning */}
      <TabPanel active={subTab === 'scanning'}>
        <Card>
          <CardHeader><CardTitle>Scanning Fee Configuration</CardTitle></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-800/50 rounded-lg p-4">
              <p className="text-xs text-surface-500 uppercase">First Page</p>
              <p className="text-xl font-bold text-surface-100 mt-1">{formatCurrency(scanning.firstPageRate)}</p>
            </div>
            <div className="bg-surface-800/50 rounded-lg p-4">
              <p className="text-xs text-surface-500 uppercase">Additional Pages</p>
              <p className="text-xl font-bold text-surface-100 mt-1">{formatCurrency(scanning.additionalPageRate)}/page</p>
            </div>
            <div className="bg-surface-800/50 rounded-lg p-4">
              <p className="text-xs text-surface-500 uppercase">Included Pages</p>
              <p className="text-xl font-bold text-surface-100 mt-1">{scanning.includedPages || 'None'}</p>
            </div>
            <div className="bg-surface-800/50 rounded-lg p-4">
              <p className="text-xs text-surface-500 uppercase">Max Pages/Scan</p>
              <p className="text-xl font-bold text-surface-100 mt-1">{scanning.maxPages}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" leftIcon={<Edit3 className="h-4 w-4" />}>Edit Scanning Rates</Button>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-surface-200">Competitive Benchmarks</h4>
              <div className="text-xs text-surface-500 mt-1 space-y-0.5">
                <p><strong className="text-surface-400">Anytime Mailbox:</strong> $1.00/page</p>
                <p><strong className="text-surface-400">PostScan Mail:</strong> $2.00 for up to 10 pages, then $0.25/additional</p>
                <p><strong className="text-surface-400">Boxfo:</strong> $0.50/scan (included in higher tiers)</p>
              </div>
            </div>
          </div>
        </Card>
      </TabPanel>

      {/* Disposal */}
      <TabPanel active={subTab === 'disposal'}>
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Disposal Methods & Pricing</CardTitle></CardHeader>
          </div>
          <div className="divide-y divide-surface-800">
            {disposal.map((d) => (
              <div key={d.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-surface-100">{d.method}</h4>
                    <Badge variant={d.isActive ? 'success' : 'muted'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">{d.description}</p>
                </div>
                <span className="text-sm font-semibold text-surface-100">{d.fee === 0 ? 'Free' : formatCurrency(d.fee)}</span>
                <Button size="sm" variant="ghost" iconOnly><Edit3 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-surface-200">Competitive Benchmarks</h4>
              <div className="text-xs text-surface-500 mt-1 space-y-0.5">
                <p><strong className="text-surface-400">Boxfo:</strong> Free shredding on all plans</p>
                <p><strong className="text-surface-400">PostScan Mail:</strong> $1.00/item for first 10 pages, $0.15/additional page</p>
                <p><strong className="text-surface-400">iPostal1:</strong> Free discard service</p>
              </div>
            </div>
          </div>
        </Card>
      </TabPanel>

      {/* Forwarding */}
      <TabPanel active={subTab === 'forwarding'}>
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Forwarding Methods & Handling Fees</CardTitle></CardHeader>
          </div>
          <div className="divide-y divide-surface-800">
            {forwarding.map((f) => (
              <div key={f.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-surface-100">{f.method}</h4>
                  <p className="text-xs text-surface-500 mt-0.5">{f.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-surface-100">{formatCurrency(f.handlingFee)} handling</p>
                  <p className="text-[10px] text-surface-500">{f.feeType}</p>
                </div>
                <Button size="sm" variant="ghost" iconOnly><Edit3 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-surface-200">Competitive Benchmarks</h4>
              <div className="text-xs text-surface-500 mt-1 space-y-0.5">
                <p><strong className="text-surface-400">Boxfo:</strong> Actual shipping + $3.50 handling</p>
                <p><strong className="text-surface-400">PostScan:</strong> $2.00 first item + $0.50/additional + shipping</p>
                <p><strong className="text-surface-400">Anytime:</strong> $1.00/item + actual shipping</p>
              </div>
            </div>
          </div>
        </Card>
      </TabPanel>

      {/* Special Handling */}
      <TabPanel active={subTab === 'special'}>
        <Card>
          <CardHeader><CardTitle>Special Handling Surcharges</CardTitle></CardHeader>
          <div className="space-y-3">
            {[
              { name: 'Fragile Items', fee: 5.00, description: 'Extra care for breakable items' },
              { name: 'Oversized Items', fee: 8.00, description: 'Items exceeding standard dimensions' },
              { name: 'Perishables', fee: 3.00, description: 'Temperature or time-sensitive items' },
              { name: 'High-Value Items', fee: 10.00, description: 'Items requiring secure storage ($500+)' },
              { name: 'Art / Framed Items', fee: 7.00, description: 'Artwork requiring padded handling' },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-4 bg-surface-800/50 rounded-lg px-4 py-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-surface-200">{s.name}</h4>
                  <p className="text-xs text-surface-500">{s.description}</p>
                </div>
                <span className="text-sm font-semibold text-surface-100">{formatCurrency(s.fee)}</span>
                <Button size="sm" variant="ghost" iconOnly><Edit3 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      {/* Custom Actions */}
      <TabPanel active={subTab === 'custom'}>
        <div className="flex justify-end mb-4">
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateCustomModal(true)}>Add Custom Action</Button>
        </div>
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-800">
            <CardHeader className="!mb-0"><CardTitle>Custom Billable Actions</CardTitle></CardHeader>
          </div>
          <div className="divide-y divide-surface-800">
            {customActions.map((a) => (
              <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-surface-100">{a.name}</h4>
                    <Badge variant={a.isActive ? 'success' : 'muted'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">{a.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-surface-100">
                    {a.feeType === 'Percentage' ? `${a.rate}%` : formatCurrency(a.rate)}
                  </p>
                  <p className="text-[10px] text-surface-500">{a.feeType}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleCustomActive(a.id)}>
                    {a.isActive ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5 text-surface-500" />}
                  </button>
                  <Button size="sm" variant="ghost" iconOnly><Edit3 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" iconOnly onClick={() => deleteCustomAction(a.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Create Custom Action Modal */}
        <Modal open={createCustomModal} onClose={() => setCreateCustomModal(false)} title="Create Custom Billable Action" size="md">
          <div className="space-y-4">
            <Input label="Action Name" placeholder="e.g., Repackaging" value={newAction.name} onChange={(e) => setNewAction((p) => ({ ...p, name: e.target.value }))} />
            <Input label="Description" placeholder="Brief description..." value={newAction.description} onChange={(e) => setNewAction((p) => ({ ...p, description: e.target.value }))} />
            <Select label="Fee Type" options={FEE_TYPE_OPTIONS} value={newAction.feeType} onChange={(e) => setNewAction((p) => ({ ...p, feeType: e.target.value }))} />
            <Input label="Rate" type="number" step="0.01" placeholder="0.00" value={newAction.rate} onChange={(e) => setNewAction((p) => ({ ...p, rate: e.target.value }))} />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCreateCustomModal(false)}>Cancel</Button>
              <Button onClick={addCustomAction} leftIcon={<Plus className="h-4 w-4" />}>Create Action</Button>
            </div>
          </div>
        </Modal>
      </TabPanel>
    </div>
  );
}
