'use client';

import { useState } from 'react';
import { Card, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
/* Select reserved for future filter usage */
import { Modal } from '@/components/ui/modal';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit3,
  Crown,
  Users,
  Handshake,
  Star,
  Save,
  Mail,
  ScanLine,
  Archive,
  Trash2,
  Truck,
  DollarSign,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface SubscriptionTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualDiscount: number;
  includedMail: number;
  includedScans: number;
  freeStorageDays: number;
  includedForwarding: number;
  freeShredding: number;
  maxRecipients: number;
  maxMailboxes: number;
  minCommitment: string;
  isActive: boolean;
  subscriberCount: number;
  overageRates: {
    mailOverage: number;
    scanOverage: number;
    storageOverage: number;
    forwardingOverage: number;
  };
}

interface PartnerProgram {
  id: string;
  name: string;
  type: string;
  revenueShare: number;
  compensationRate: number;
  minVolume: number;
  contractEnd: string;
  isActive: boolean;
  monthlyRevenue: number;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const MOCK_TIERS: SubscriptionTier[] = [
  {
    id: 't1', name: 'Bronze', monthlyPrice: 9.99, annualPrice: 99.99, annualDiscount: 17,
    includedMail: 30, includedScans: 5, freeStorageDays: 30, includedForwarding: 0,
    freeShredding: 0, maxRecipients: 1, maxMailboxes: 1, minCommitment: 'Month-to-month',
    isActive: true, subscriberCount: 142,
    overageRates: { mailOverage: 0.50, scanOverage: 1.00, storageOverage: 0.50, forwardingOverage: 2.00 },
  },
  {
    id: 't2', name: 'Silver', monthlyPrice: 19.99, annualPrice: 199.99, annualDiscount: 17,
    includedMail: 60, includedScans: 15, freeStorageDays: 30, includedForwarding: 2,
    freeShredding: 5, maxRecipients: 2, maxMailboxes: 1, minCommitment: 'Month-to-month',
    isActive: true, subscriberCount: 89,
    overageRates: { mailOverage: 0.40, scanOverage: 0.75, storageOverage: 0.40, forwardingOverage: 1.50 },
  },
  {
    id: 't3', name: 'Gold', monthlyPrice: 29.99, annualPrice: 299.99, annualDiscount: 17,
    includedMail: 120, includedScans: 30, freeStorageDays: 30, includedForwarding: 5,
    freeShredding: 10, maxRecipients: 4, maxMailboxes: 2, minCommitment: '6 months',
    isActive: true, subscriberCount: 56,
    overageRates: { mailOverage: 0.30, scanOverage: 0.50, storageOverage: 0.30, forwardingOverage: 1.00 },
  },
  {
    id: 't4', name: 'Platinum', monthlyPrice: 49.99, annualPrice: 499.99, annualDiscount: 17,
    includedMail: 240, includedScans: 60, freeStorageDays: 60, includedForwarding: 10,
    freeShredding: 20, maxRecipients: 8, maxMailboxes: 3, minCommitment: '12 months',
    isActive: true, subscriberCount: 23,
    overageRates: { mailOverage: 0.20, scanOverage: 0.25, storageOverage: 0.20, forwardingOverage: 0.50 },
  },
];

const MOCK_PARTNERS: PartnerProgram[] = [
  { id: 'pp1', name: 'Anytime Mailbox', type: 'Digital Mail Platform', revenueShare: 30, compensationRate: 2.50, minVolume: 50, contractEnd: '2027-01-15', isActive: true, monthlyRevenue: 3200 },
  { id: 'pp2', name: 'iPostal1', type: 'Digital Mail Platform', revenueShare: 25, compensationRate: 2.00, minVolume: 30, contractEnd: '2026-12-01', isActive: true, monthlyRevenue: 2100 },
  { id: 'pp3', name: 'PostScan Mail', type: 'Digital Mail Platform', revenueShare: 28, compensationRate: 2.25, minVolume: 20, contractEnd: '2027-03-01', isActive: true, monthlyRevenue: 1800 },
  { id: 'pp4', name: 'Boxfo', type: 'Digital Mail Platform', revenueShare: 22, compensationRate: 1.75, minVolume: 10, contractEnd: '2026-09-15', isActive: true, monthlyRevenue: 900 },
  { id: 'pp5', name: 'FedEx HAL', type: 'Carrier Incentive', revenueShare: 0, compensationRate: 1.50, minVolume: 100, contractEnd: '2027-06-01', isActive: true, monthlyRevenue: 4500 },
  { id: 'pp6', name: 'UPS Access Point', type: 'Carrier Incentive', revenueShare: 0, compensationRate: 1.25, minVolume: 75, contractEnd: '2027-06-01', isActive: true, monthlyRevenue: 3200 },
  { id: 'pp7', name: 'Amazon Counter', type: 'Special Program', revenueShare: 15, compensationRate: 0.75, minVolume: 200, contractEnd: '2027-04-01', isActive: true, monthlyRevenue: 5100 },
  { id: 'pp8', name: 'Happy Returns', type: 'Returns Program', revenueShare: 20, compensationRate: 3.00, minVolume: 50, contractEnd: '2027-02-01', isActive: true, monthlyRevenue: 2800 },
];

const tierIcons: Record<string, React.ElementType> = { Bronze: Star, Silver: Star, Gold: Crown, Platinum: Crown };

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function SubscriptionsTab() {
  const [subTab, setSubTab] = useState('pmb');
  const [tiers] = useState(MOCK_TIERS);
  const [partners] = useState(MOCK_PARTNERS);
  const [tierModal, setTierModal] = useState<{ open: boolean; tier: SubscriptionTier | null }>({ open: false, tier: null });
  const [partnerModal, setPartnerModal] = useState<{ open: boolean; partner: PartnerProgram | null }>({ open: false, partner: null });
  const [billingToggle, setBillingToggle] = useState<'monthly' | 'annual'>('monthly');

  const subTabs = [
    { id: 'pmb', label: 'PMB Subscriptions', icon: <Users className="h-3.5 w-3.5" /> },
    { id: 'partner', label: 'Partner Programs', icon: <Handshake className="h-3.5 w-3.5" /> },
  ];

  const totalSubscribers = tiers.reduce((s, t) => s + t.subscriberCount, 0);
  const totalMRR = tiers.reduce((s, t) => s + t.monthlyPrice * t.subscriberCount, 0);
  const totalPartnerRevenue = partners.reduce((s, p) => s + p.monthlyRevenue, 0);

  return (
    <div className="space-y-6">
      <Tabs tabs={subTabs} activeTab={subTab} onChange={setSubTab} />

      {/* PMB Subscriptions */}
      <TabPanel active={subTab === 'pmb'}>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Users className="h-5 w-5" />} title="Total Subscribers" value={totalSubscribers} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Monthly Recurring Revenue" value={formatCurrency(totalMRR)} />
          <StatCard icon={<Crown className="h-5 w-5" />} title="Active Tiers" value={tiers.filter((t) => t.isActive).length} />
          <StatCard icon={<Calendar className="h-5 w-5" />} title="Annual Revenue" value={formatCurrency(totalMRR * 12)} />
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-surface-800 rounded-lg p-1">
            <button
              onClick={() => setBillingToggle('monthly')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billingToggle === 'monthly' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'}`}
            >Monthly</button>
            <button
              onClick={() => setBillingToggle('annual')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billingToggle === 'annual' ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200'}`}
            >Annual</button>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />}>Add Tier</Button>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiers.map((tier) => {
            const TierIcon = tierIcons[tier.name] || Star;
            return (
              <Card key={tier.id} padding="none" className="overflow-hidden">
                <div className={`px-4 py-3 ${tier.name === 'Platinum' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : tier.name === 'Gold' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-surface-800/50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TierIcon className={`h-4 w-4 ${tier.name === 'Platinum' ? 'text-purple-400' : tier.name === 'Gold' ? 'text-yellow-400' : 'text-surface-400'}`} />
                      <h4 className="font-bold text-sm text-surface-100">{tier.name}</h4>
                    </div>
                    <Badge variant="success" dot={false}>{tier.subscriberCount} active</Badge>
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-surface-100">
                      {formatCurrency(billingToggle === 'monthly' ? tier.monthlyPrice : tier.annualPrice)}
                    </p>
                    <p className="text-xs text-surface-500">/{billingToggle === 'monthly' ? 'month' : 'year'}</p>
                    {billingToggle === 'annual' && (
                      <Badge variant="success" dot={false} className="mt-1">Save {tier.annualDiscount}%</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-surface-500" /><span className="text-surface-300">{tier.includedMail} mail items/mo</span></div>
                    <div className="flex items-center gap-2"><ScanLine className="h-3 w-3 text-surface-500" /><span className="text-surface-300">{tier.includedScans} scan pages/mo</span></div>
                    <div className="flex items-center gap-2"><Archive className="h-3 w-3 text-surface-500" /><span className="text-surface-300">{tier.freeStorageDays} days free storage</span></div>
                    <div className="flex items-center gap-2"><Truck className="h-3 w-3 text-surface-500" /><span className="text-surface-300">{tier.includedForwarding} forwarding/mo</span></div>
                    <div className="flex items-center gap-2"><Trash2 className="h-3 w-3 text-surface-500" /><span className="text-surface-300">{tier.freeShredding} free shreds/mo</span></div>
                    <div className="flex items-center gap-2"><Users className="h-3 w-3 text-surface-500" /><span className="text-surface-300">{tier.maxRecipients} recipients, {tier.maxMailboxes} mailbox(es)</span></div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-800">
                    <p className="text-[10px] text-surface-500 uppercase font-medium mb-1">Overage Rates</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-surface-500">Mail: {formatCurrency(tier.overageRates.mailOverage)}/ea</span>
                      <span className="text-surface-500">Scan: {formatCurrency(tier.overageRates.scanOverage)}/pg</span>
                      <span className="text-surface-500">Storage: {formatCurrency(tier.overageRates.storageOverage)}/day</span>
                      <span className="text-surface-500">Fwd: {formatCurrency(tier.overageRates.forwardingOverage)}/ea</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-800 text-xs text-surface-500">
                    <p>Min: {tier.minCommitment}</p>
                  </div>

                  <Button variant="secondary" size="sm" fullWidth className="mt-3" leftIcon={<Edit3 className="h-3 w-3" />} onClick={() => setTierModal({ open: true, tier })}>
                    Edit Tier
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </TabPanel>

      {/* Partner Programs */}
      <TabPanel active={subTab === 'partner'}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatCard icon={<Handshake className="h-5 w-5" />} title="Active Partners" value={partners.filter((p) => p.isActive).length} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} title="Monthly Partner Revenue" value={formatCurrency(totalPartnerRevenue)} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} title="Program Types" value={new Set(partners.map((p) => p.type)).size} />
        </div>

        <div className="flex justify-end mb-4">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Add Partner Program</Button>
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase">Partner</th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-surface-500 uppercase">Type</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-surface-500 uppercase">Rev Share</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-surface-500 uppercase">Comp Rate</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-surface-500 uppercase">Min Volume</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-surface-500 uppercase">Monthly Rev</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-surface-500 uppercase">Contract End</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-100">{p.name}</span>
                        <Badge variant={p.isActive ? 'success' : 'muted'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-surface-400">{p.type}</td>
                    <td className="px-3 py-3 text-right text-surface-100">{p.revenueShare > 0 ? `${p.revenueShare}%` : '—'}</td>
                    <td className="px-3 py-3 text-right text-surface-100">{formatCurrency(p.compensationRate)}</td>
                    <td className="px-3 py-3 text-right text-surface-300">{p.minVolume}/mo</td>
                    <td className="px-3 py-3 text-right font-medium text-emerald-400">{formatCurrency(p.monthlyRevenue)}</td>
                    <td className="px-3 py-3 text-center text-surface-400">{new Date(p.contractEnd).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" iconOnly onClick={() => setPartnerModal({ open: true, partner: p })}><Edit3 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </TabPanel>

      {/* Edit Tier Modal */}
      <Modal open={tierModal.open} onClose={() => setTierModal({ open: false, tier: null })} title={`Edit Tier — ${tierModal.tier?.name ?? ''}`} size="lg">
        {tierModal.tier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Monthly Price ($)" type="number" step="0.01" defaultValue={String(tierModal.tier.monthlyPrice)} />
              <Input label="Annual Price ($)" type="number" step="0.01" defaultValue={String(tierModal.tier.annualPrice)} />
              <Input label="Included Mail Items/mo" type="number" defaultValue={String(tierModal.tier.includedMail)} />
              <Input label="Included Scan Pages/mo" type="number" defaultValue={String(tierModal.tier.includedScans)} />
              <Input label="Free Storage Days" type="number" defaultValue={String(tierModal.tier.freeStorageDays)} />
              <Input label="Included Forwarding/mo" type="number" defaultValue={String(tierModal.tier.includedForwarding)} />
              <Input label="Free Shredding/mo" type="number" defaultValue={String(tierModal.tier.freeShredding)} />
              <Input label="Max Recipients" type="number" defaultValue={String(tierModal.tier.maxRecipients)} />
            </div>
            <h4 className="text-sm font-semibold text-surface-200 pt-2">Overage Rates</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Mail Overage ($/item)" type="number" step="0.01" defaultValue={String(tierModal.tier.overageRates.mailOverage)} />
              <Input label="Scan Overage ($/page)" type="number" step="0.01" defaultValue={String(tierModal.tier.overageRates.scanOverage)} />
              <Input label="Storage Overage ($/day)" type="number" step="0.01" defaultValue={String(tierModal.tier.overageRates.storageOverage)} />
              <Input label="Forwarding Overage ($/ea)" type="number" step="0.01" defaultValue={String(tierModal.tier.overageRates.forwardingOverage)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setTierModal({ open: false, tier: null })}>Cancel</Button>
              <Button leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Partner Modal */}
      <Modal open={partnerModal.open} onClose={() => setPartnerModal({ open: false, partner: null })} title={`Edit Partner — ${partnerModal.partner?.name ?? ''}`} size="md">
        {partnerModal.partner && (
          <div className="space-y-4">
            <Input label="Revenue Share (%)" type="number" step="0.1" defaultValue={String(partnerModal.partner.revenueShare)} />
            <Input label="Compensation Rate ($)" type="number" step="0.01" defaultValue={String(partnerModal.partner.compensationRate)} />
            <Input label="Min Monthly Volume" type="number" defaultValue={String(partnerModal.partner.minVolume)} />
            <Input label="Contract End Date" type="date" defaultValue={partnerModal.partner.contractEnd} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setPartnerModal({ open: false, partner: null })}>Cancel</Button>
              <Button leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
