'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  Package,
  Mail,
  Box,
  Truck,
  Snowflake,
  Palette,
  Weight,
  Settings,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface CogsByAction {
  receiving: number;
  storage: number;
  scanning: number;
  disposal: number;
  forwarding: number;
}

interface ParcelType {
  id: string;
  name: string;
  description: string;
  icon: string;
  isCustom: boolean;
  isActive: boolean;
  revenuePrice: number;
  cogs: number;
  margin: number;
  marginPct: number;
  cogsByAction: CogsByAction;
  fixedCosts: number;
  variableCosts: number;
}

/* -------------------------------------------------------------------------- */
/*  Mock data                                                                 */
/* -------------------------------------------------------------------------- */
const iconMap: Record<string, React.ElementType> = {
  mail: Mail,
  softpak: Package,
  parcel: Package,
  box: Box,
  largebox: Box,
  heavy: Weight,
  freight: Truck,
  art: Palette,
  perishable: Snowflake,
  custom: Settings,
};

const MOCK_PARCEL_TYPES: ParcelType[] = [
  {
    id: 'pt1', name: 'Letter', description: 'Standard mail envelope', icon: 'mail',
    isCustom: false, isActive: true, revenuePrice: 0.50, cogs: 0.15, margin: 0.35, marginPct: 70,
    cogsByAction: { receiving: 0.05, storage: 0.02, scanning: 0.05, disposal: 0.01, forwarding: 0.02 },
    fixedCosts: 0.10, variableCosts: 0.05,
  },
  {
    id: 'pt2', name: 'Softpak / Bubble Mailer', description: 'Padded envelope or poly mailer', icon: 'softpak',
    isCustom: false, isActive: true, revenuePrice: 2.00, cogs: 0.50, margin: 1.50, marginPct: 75,
    cogsByAction: { receiving: 0.15, storage: 0.10, scanning: 0.10, disposal: 0.05, forwarding: 0.10 },
    fixedCosts: 0.25, variableCosts: 0.25,
  },
  {
    id: 'pt3', name: 'Parcel', description: 'Small standard parcel', icon: 'parcel',
    isCustom: false, isActive: true, revenuePrice: 3.00, cogs: 0.75, margin: 2.25, marginPct: 75,
    cogsByAction: { receiving: 0.20, storage: 0.15, scanning: 0.15, disposal: 0.10, forwarding: 0.15 },
    fixedCosts: 0.35, variableCosts: 0.40,
  },
  {
    id: 'pt4', name: 'Package / Box', description: 'Standard box shipment', icon: 'box',
    isCustom: false, isActive: true, revenuePrice: 5.00, cogs: 1.25, margin: 3.75, marginPct: 75,
    cogsByAction: { receiving: 0.30, storage: 0.25, scanning: 0.20, disposal: 0.15, forwarding: 0.35 },
    fixedCosts: 0.50, variableCosts: 0.75,
  },
  {
    id: 'pt5', name: 'Large Box', description: 'Oversized box', icon: 'largebox',
    isCustom: false, isActive: true, revenuePrice: 8.00, cogs: 2.50, margin: 5.50, marginPct: 68.8,
    cogsByAction: { receiving: 0.60, storage: 0.50, scanning: 0.30, disposal: 0.35, forwarding: 0.75 },
    fixedCosts: 1.00, variableCosts: 1.50,
  },
  {
    id: 'pt6', name: 'Heavy Package', description: 'Weight-based surcharge applicable', icon: 'heavy',
    isCustom: false, isActive: true, revenuePrice: 12.00, cogs: 4.00, margin: 8.00, marginPct: 66.7,
    cogsByAction: { receiving: 1.00, storage: 0.75, scanning: 0.25, disposal: 0.50, forwarding: 1.50 },
    fixedCosts: 1.50, variableCosts: 2.50,
  },
  {
    id: 'pt7', name: 'Freight', description: 'LTL/FTL freight shipments', icon: 'freight',
    isCustom: false, isActive: true, revenuePrice: 25.00, cogs: 10.00, margin: 15.00, marginPct: 60,
    cogsByAction: { receiving: 3.00, storage: 2.00, scanning: 0.50, disposal: 1.00, forwarding: 3.50 },
    fixedCosts: 4.00, variableCosts: 6.00,
  },
  {
    id: 'pt8', name: 'Special Handling: Art', description: 'Fragile art pieces requiring special care', icon: 'art',
    isCustom: false, isActive: true, revenuePrice: 15.00, cogs: 5.00, margin: 10.00, marginPct: 66.7,
    cogsByAction: { receiving: 1.50, storage: 1.00, scanning: 0.50, disposal: 0.50, forwarding: 1.50 },
    fixedCosts: 2.00, variableCosts: 3.00,
  },
  {
    id: 'pt9', name: 'Perishables', description: 'Temperature-sensitive or time-sensitive items', icon: 'perishable',
    isCustom: false, isActive: true, revenuePrice: 10.00, cogs: 4.00, margin: 6.00, marginPct: 60,
    cogsByAction: { receiving: 1.00, storage: 1.50, scanning: 0.25, disposal: 0.25, forwarding: 1.00 },
    fixedCosts: 1.50, variableCosts: 2.50,
  },
  {
    id: 'pt10', name: 'Wine Shipment', description: 'CLIENT-defined: Wine and spirits requiring age verification', icon: 'custom',
    isCustom: true, isActive: true, revenuePrice: 8.00, cogs: 3.00, margin: 5.00, marginPct: 62.5,
    cogsByAction: { receiving: 0.75, storage: 0.75, scanning: 0.25, disposal: 0.25, forwarding: 1.00 },
    fixedCosts: 1.00, variableCosts: 2.00,
  },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function ParcelTypesTab() {
  const [parcelTypes, setParcelTypes] = useState<ParcelType[]>(MOCK_PARCEL_TYPES);
  const [editModal, setEditModal] = useState<{ open: boolean; type: ParcelType | null }>({ open: false, type: null });
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editRevenue, setEditRevenue] = useState('');
  const [editCogs, setEditCogs] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const standard = parcelTypes.filter((p) => !p.isCustom).length;
    const custom = parcelTypes.filter((p) => p.isCustom).length;
    const avgMargin = parcelTypes.reduce((s, p) => s + p.marginPct, 0) / parcelTypes.length;
    return { standard, custom, total: parcelTypes.length, avgMargin };
  }, [parcelTypes]);

  const openEdit = (pt: ParcelType) => {
    setEditModal({ open: true, type: pt });
    setEditRevenue(String(pt.revenuePrice));
    setEditCogs(String(pt.cogs));
  };

  const saveEdit = () => {
    if (!editModal.type) return;
    const rp = parseFloat(editRevenue) || 0;
    const c = parseFloat(editCogs) || 0;
    setParcelTypes((prev) =>
      prev.map((p) =>
        p.id === editModal.type!.id
          ? { ...p, revenuePrice: rp, cogs: c, margin: rp - c, marginPct: rp > 0 ? ((rp - c) / rp) * 100 : 0 }
          : p
      )
    );
    setEditModal({ open: false, type: null });
  };

  const addCustomType = () => {
    if (!newName.trim()) return;
    const newType: ParcelType = {
      id: `pt_custom_${Date.now()}`,
      name: newName,
      description: newDesc || 'Custom parcel type',
      icon: 'custom',
      isCustom: true,
      isActive: true,
      revenuePrice: 0,
      cogs: 0,
      margin: 0,
      marginPct: 0,
      cogsByAction: { receiving: 0, storage: 0, scanning: 0, disposal: 0, forwarding: 0 },
      fixedCosts: 0,
      variableCosts: 0,
    };
    setParcelTypes((prev) => [...prev, newType]);
    setCreateModal(false);
    setNewName('');
    setNewDesc('');
  };

  const deleteCustomType = (id: string) => {
    setParcelTypes((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><div className="text-center"><p className="text-2xl font-bold text-surface-100">{stats.standard}</p><p className="text-xs text-surface-400 mt-1">Standard Types</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-primary-400">{stats.custom}</p><p className="text-xs text-surface-400 mt-1">Custom Types</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-surface-100">{stats.total}</p><p className="text-xs text-surface-400 mt-1">Total Active</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-emerald-400">{stats.avgMargin.toFixed(1)}%</p><p className="text-xs text-surface-400 mt-1">Avg Margin</p></div></Card>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModal(true)}>Add Custom Type</Button>
      </div>

      {/* Parcel type grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parcelTypes.map((pt) => {
          const Icon = iconMap[pt.icon] || Package;
          const isExpanded = expandedId === pt.id;

          return (
            <Card key={pt.id} padding="none" className="overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-surface-100">{pt.name}</h4>
                      {pt.isCustom && <Badge variant="info" dot={false}>Custom</Badge>}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">{pt.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" iconOnly onClick={() => openEdit(pt)}><Edit3 className="h-3.5 w-3.5" /></Button>
                    {pt.isCustom && (
                      <Button size="sm" variant="ghost" iconOnly onClick={() => deleteCustomType(pt.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    )}
                  </div>
                </div>

                {/* Pricing summary */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="bg-surface-800/50 rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] text-surface-500 uppercase">Revenue</p>
                    <p className="text-sm font-bold text-surface-100">{formatCurrency(pt.revenuePrice)}</p>
                  </div>
                  <div className="bg-surface-800/50 rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] text-surface-500 uppercase">COGS</p>
                    <p className="text-sm font-bold text-surface-300">{formatCurrency(pt.cogs)}</p>
                  </div>
                  <div className="bg-surface-800/50 rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] text-surface-500 uppercase">Margin</p>
                    <p className={`text-sm font-bold ${pt.marginPct >= 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                      {formatCurrency(pt.margin)} <span className="text-[10px]">({pt.marginPct.toFixed(0)}%)</span>
                    </p>
                  </div>
                </div>

                {/* COGS breakdown toggle */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : pt.id)}
                  className="mt-3 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  {isExpanded ? 'Hide' : 'Show'} COGS breakdown by action
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(pt.cogsByAction).map(([action, cost]) => (
                      <div key={action} className="flex items-center justify-between text-xs px-2">
                        <span className="text-surface-400 capitalize">{action}</span>
                        <span className="text-surface-300 font-medium">{formatCurrency(cost)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs px-2 pt-1 border-t border-surface-800">
                      <span className="text-surface-400">Fixed costs</span>
                      <span className="text-surface-300 font-medium">{formatCurrency(pt.fixedCosts)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-2">
                      <span className="text-surface-400">Variable costs</span>
                      <span className="text-surface-300 font-medium">{formatCurrency(pt.variableCosts)}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, type: null })} title={`Edit Pricing — ${editModal.type?.name ?? ''}`} size="md">
        {editModal.type && (
          <div className="space-y-4">
            <Input label="Revenue Price ($)" type="number" step="0.01" value={editRevenue} onChange={(e) => setEditRevenue(e.target.value)} />
            <Input label="Total COGS ($)" type="number" step="0.01" value={editCogs} onChange={(e) => setEditCogs(e.target.value)} />
            <div className="bg-surface-800/50 rounded-lg p-3">
              <p className="text-xs text-surface-400">Auto-calculated margin</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {formatCurrency((parseFloat(editRevenue) || 0) - (parseFloat(editCogs) || 0))}
                <span className="text-sm ml-2">
                  ({(parseFloat(editRevenue) || 0) > 0 ? (((parseFloat(editRevenue) || 0) - (parseFloat(editCogs) || 0)) / (parseFloat(editRevenue) || 1) * 100).toFixed(1) : '0.0'}%)
                </span>
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditModal({ open: false, type: null })}>Cancel</Button>
              <Button onClick={saveEdit} leftIcon={<Save className="h-4 w-4" />}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Custom Type Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Custom Parcel Type" size="md">
        <div className="space-y-4">
          <Input label="Type Name" placeholder="e.g., Wine Shipment" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input label="Description" placeholder="Brief description..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <p className="text-xs text-surface-500">After creating, you can configure revenue pricing and COGS for this type.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button onClick={addCustomType} leftIcon={<Plus className="h-4 w-4" />}>Create Type</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
