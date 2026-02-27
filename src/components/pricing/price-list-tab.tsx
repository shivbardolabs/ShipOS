'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, SearchInput } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Check,
  ToggleLeft,
  ToggleRight,
  History,
  Users,
  User,
  Building2,
  Layers,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface PriceOverride {
  id: string;
  targetType: 'segment' | 'customer' | 'program';
  targetLabel: string;
  retailPrice: number | null;
  cogs: number | null;
}

interface PriceEntry {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  retailPrice: number;
  cogs: number;
  margin: number;
  marginPct: number;
  unitLabel: string;
  isActive: boolean;
  hasTieredPricing: boolean;
  firstUnitPrice: number | null;
  additionalUnitPrice: number | null;
  overrides: PriceOverride[];
  lastModified: string;
  modifiedBy: string;
}

interface VersionEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'mail', label: 'Mail Services' },
  { value: 'package', label: 'Package Services' },
  { value: 'shipping', label: 'Shipping Services' },
  { value: 'scanning', label: 'Scanning & Copying' },
  { value: 'notary', label: 'Notary & Legal' },
  { value: 'general', label: 'General Services' },
];

const MOCK_PRICES: PriceEntry[] = [
  {
    id: 'p1', key: 'mail_receiving', name: 'Mail Receiving', description: 'Standard mail intake and sorting',
    category: 'mail', retailPrice: 0.00, cogs: 0.15, margin: -0.15, marginPct: -100,
    unitLabel: 'per item', isActive: true, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [
      { id: 'o1', targetType: 'segment', targetLabel: 'iPostal1', retailPrice: 0.50, cogs: null },
    ],
    lastModified: '2026-02-25T10:30:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p2', key: 'pkg_receiving', name: 'Package Receiving', description: 'Package check-in and logging',
    category: 'package', retailPrice: 3.00, cogs: 0.75, margin: 2.25, marginPct: 75,
    unitLabel: 'per package', isActive: true, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [
      { id: 'o2', targetType: 'segment', targetLabel: 'Anytime Mailbox', retailPrice: 2.50, cogs: null },
      { id: 'o3', targetType: 'program', targetLabel: 'Gold Plan', retailPrice: 0.00, cogs: null },
    ],
    lastModified: '2026-02-24T15:45:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p3', key: 'scanning_first', name: 'Document Scanning', description: 'Scan and digitize mail/documents',
    category: 'scanning', retailPrice: 2.00, cogs: 0.30, margin: 1.70, marginPct: 85,
    unitLabel: 'per page', isActive: true, hasTieredPricing: true,
    firstUnitPrice: 2.00, additionalUnitPrice: 0.25,
    overrides: [],
    lastModified: '2026-02-23T09:00:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p4', key: 'storage_daily', name: 'Storage (Daily)', description: 'Per-item daily storage after free period',
    category: 'package', retailPrice: 1.00, cogs: 0.10, margin: 0.90, marginPct: 90,
    unitLabel: 'per item/day', isActive: true, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [],
    lastModified: '2026-02-22T14:20:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p5', key: 'forwarding_handling', name: 'Forwarding Handling', description: 'Handling fee for outbound shipments',
    category: 'shipping', retailPrice: 3.50, cogs: 1.00, margin: 2.50, marginPct: 71.4,
    unitLabel: 'per shipment', isActive: true, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [],
    lastModified: '2026-02-21T11:00:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p6', key: 'shredding', name: 'Secure Shredding', description: 'Certified secure document destruction',
    category: 'mail', retailPrice: 1.00, cogs: 0.20, margin: 0.80, marginPct: 80,
    unitLabel: 'per item', isActive: true, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [],
    lastModified: '2026-02-20T16:00:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p7', key: 'notary_service', name: 'Notary Service', description: 'In-person notarization',
    category: 'notary', retailPrice: 15.00, cogs: 5.00, margin: 10.00, marginPct: 66.7,
    unitLabel: 'per signing', isActive: true, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [],
    lastModified: '2026-02-19T08:00:00Z', modifiedBy: 'Admin',
  },
  {
    id: 'p8', key: 'photo_documentation', name: 'Photo Documentation', description: 'Photograph package contents for records',
    category: 'general', retailPrice: 2.00, cogs: 0.10, margin: 1.90, marginPct: 95,
    unitLabel: 'per photo', isActive: false, hasTieredPricing: false,
    firstUnitPrice: null, additionalUnitPrice: null,
    overrides: [],
    lastModified: '2026-02-18T12:00:00Z', modifiedBy: 'Admin',
  },
];

const MOCK_HISTORY: VersionEntry[] = [
  { id: 'v1', field: 'Retail Price', oldValue: '$2.50', newValue: '$3.00', changedBy: 'Admin', changedAt: '2026-02-24T15:45:00Z' },
  { id: 'v2', field: 'COGS', oldValue: '$0.50', newValue: '$0.75', changedBy: 'Admin', changedAt: '2026-02-24T15:45:00Z' },
  { id: 'v3', field: 'Status', oldValue: 'Inactive', newValue: 'Active', changedBy: 'Admin', changedAt: '2026-02-23T10:00:00Z' },
];

const overrideIcon: Record<string, React.ElementType> = {
  segment: Building2,
  customer: User,
  program: Users,
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function PriceListTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [prices, setPrices] = useState<PriceEntry[]>(MOCK_PRICES);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ retailPrice: string; cogs: string }>({ retailPrice: '', cogs: '' });
  const [historyModal, setHistoryModal] = useState<{ open: boolean; itemName: string }>({ open: false, itemName: '' });
  const [importModal, setImportModal] = useState(false);

  const filtered = useMemo(() => {
    return prices.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || p.category === category;
      return matchSearch && matchCategory;
    });
  }, [prices, search, category]);

  const stats = useMemo(() => {
    const active = prices.filter((p) => p.isActive).length;
    const totalRevenue = prices.filter((p) => p.isActive).reduce((s, p) => s + p.retailPrice, 0);
    const avgMargin = prices.filter((p) => p.isActive && p.marginPct > 0).reduce((s, p) => s + p.marginPct, 0) / Math.max(1, prices.filter((p) => p.isActive && p.marginPct > 0).length);
    const overrideCount = prices.reduce((s, p) => s + p.overrides.length, 0);
    return { active, total: prices.length, totalRevenue, avgMargin, overrideCount };
  }, [prices]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const startEdit = (p: PriceEntry) => {
    setEditingId(p.id);
    setEditValues({ retailPrice: String(p.retailPrice), cogs: String(p.cogs) });
  };

  const saveEdit = (id: string) => {
    setPrices((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const rp = parseFloat(editValues.retailPrice) || 0;
        const c = parseFloat(editValues.cogs) || 0;
        return { ...p, retailPrice: rp, cogs: c, margin: rp - c, marginPct: rp > 0 ? ((rp - c) / rp) * 100 : 0, lastModified: new Date().toISOString(), modifiedBy: 'You' };
      })
    );
    setEditingId(null);
  };

  const toggleActive = (id: string) => {
    setPrices((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><div className="text-center"><p className="text-2xl font-bold text-surface-100">{stats.active}</p><p className="text-xs text-surface-400 mt-1">Active Prices</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-surface-100">{stats.total}</p><p className="text-xs text-surface-400 mt-1">Total Entries</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-emerald-400">{stats.avgMargin.toFixed(1)}%</p><p className="text-xs text-surface-400 mt-1">Avg Margin</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-primary-400">{stats.overrideCount}</p><p className="text-xs text-surface-400 mt-1">Price Overrides</p></div></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select options={CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Button variant="secondary" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setImportModal(true)}>Import CSV</Button>
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>Export CSV</Button>
      </div>

      {/* Price list */}
      <div className="space-y-2">
        {filtered.map((entry) => {
          const isExpanded = expanded.has(entry.id);
          const isEditing = editingId === entry.id;

          return (
            <Card key={entry.id} padding="none">
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Expand toggle */}
                  <button onClick={() => toggleExpand(entry.id)} className="text-surface-500 hover:text-surface-300">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {/* Name & category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-surface-100">{entry.name}</span>
                      <Badge variant={entry.isActive ? 'success' : 'muted'}>{entry.isActive ? 'Active' : 'Inactive'}</Badge>
                      {entry.overrides.length > 0 && (
                        <Badge variant="info" dot={false}>{entry.overrides.length} override{entry.overrides.length !== 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">{entry.description} · {entry.unitLabel}</p>
                  </div>

                  {/* Price columns */}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input className="w-24" value={editValues.retailPrice} onChange={(e) => setEditValues((v) => ({ ...v, retailPrice: e.target.value }))} />
                      <Input className="w-24" value={editValues.cogs} onChange={(e) => setEditValues((v) => ({ ...v, cogs: e.target.value }))} />
                      <Button size="sm" onClick={() => saveEdit(entry.id)} leftIcon={<Check className="h-3 w-3" />}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right w-20">
                        <p className="text-surface-400 text-[10px]">Revenue</p>
                        <p className="font-semibold text-surface-100">{formatCurrency(entry.retailPrice)}</p>
                      </div>
                      <div className="text-right w-20">
                        <p className="text-surface-400 text-[10px]">COGS</p>
                        <p className="font-semibold text-surface-300">{formatCurrency(entry.cogs)}</p>
                      </div>
                      <div className="text-right w-20">
                        <p className="text-surface-400 text-[10px]">Margin</p>
                        <p className={`font-semibold ${entry.marginPct >= 50 ? 'text-emerald-400' : entry.marginPct >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {formatCurrency(entry.margin)} <span className="text-[10px]">({entry.marginPct.toFixed(0)}%)</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="ghost" iconOnly onClick={() => startEdit(entry)}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" iconOnly onClick={() => setHistoryModal({ open: true, itemName: entry.name })}><History className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" iconOnly onClick={() => toggleActive(entry.id)}>
                        {entry.isActive ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4 text-surface-500" />}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded: overrides & details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-surface-800">
                    {entry.hasTieredPricing && (
                      <div className="mb-3 text-xs text-surface-400">
                        <span className="font-medium text-surface-300">Tiered pricing:</span>{' '}
                        First unit {formatCurrency(entry.firstUnitPrice ?? 0)} · Additional {formatCurrency(entry.additionalUnitPrice ?? 0)}
                      </div>
                    )}

                    {entry.overrides.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Price Overrides</p>
                        {entry.overrides.map((ov) => {
                          const Icon = overrideIcon[ov.targetType] || Layers;
                          return (
                            <div key={ov.id} className="flex items-center gap-3 text-sm bg-surface-800/50 rounded-lg px-3 py-2">
                              <Icon className="h-3.5 w-3.5 text-surface-500" />
                              <span className="text-surface-300 flex-1">{ov.targetLabel}</span>
                              {ov.retailPrice !== null && <span className="text-surface-200">{formatCurrency(ov.retailPrice)}</span>}
                              <Button size="sm" variant="ghost" iconOnly><Trash2 className="h-3 w-3 text-red-400" /></Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-surface-500 italic">No overrides — using universal pricing</p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="ghost" leftIcon={<Plus className="h-3 w-3" />}>Add Override</Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-surface-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-300">No matching prices</h3>
            <p className="text-sm text-surface-500 mt-1">Try a different search or category filter.</p>
          </div>
        </Card>
      )}

      {/* Pricing hierarchy info */}
      <Card>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-surface-200">Pricing Inheritance Hierarchy</h4>
            <p className="text-xs text-surface-500 mt-1">
              Prices cascade from most specific to least:{' '}
              <strong className="text-surface-300">Individual Customer</strong> →{' '}
              <strong className="text-surface-300">Program-Specific</strong> →{' '}
              <strong className="text-surface-300">Segment</strong> (iPostal, Anytime, PostScan) →{' '}
              <strong className="text-surface-300">CLIENT Default</strong> →{' '}
              <strong className="text-surface-300">System Default</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Version History Modal */}
      <Modal open={historyModal.open} onClose={() => setHistoryModal({ open: false, itemName: '' })} title={`Version History — ${historyModal.itemName}`} size="lg">
        <div className="space-y-3">
          {MOCK_HISTORY.map((v) => (
            <div key={v.id} className="flex items-center gap-4 bg-surface-800/50 rounded-lg px-4 py-3 text-sm">
              <div className="flex-1">
                <span className="text-surface-300 font-medium">{v.field}</span>
                <span className="text-surface-500 mx-2">changed from</span>
                <span className="text-red-400 line-through">{v.oldValue}</span>
                <span className="text-surface-500 mx-2">to</span>
                <span className="text-emerald-400">{v.newValue}</span>
              </div>
              <div className="text-right text-xs text-surface-500">
                <p>{v.changedBy}</p>
                <p>{new Date(v.changedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import Pricing CSV" size="md">
        <div className="space-y-4">
          <p className="text-sm text-surface-400">Upload a CSV file to bulk import or update pricing. The file should contain columns: key, name, category, retail_price, cogs, unit_label.</p>
          <div className="border-2 border-dashed border-surface-700 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-surface-500 mx-auto mb-3" />
            <p className="text-sm text-surface-300">Drop CSV file here or click to browse</p>
            <p className="text-xs text-surface-500 mt-1">Max file size: 5MB</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setImportModal(false)}>Cancel</Button>
            <Button leftIcon={<Upload className="h-4 w-4" />}>Upload & Preview</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
