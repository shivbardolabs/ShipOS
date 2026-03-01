'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Package,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  BAR-97: Package Check-Out Inventory Table                                 */
/*                                                                            */
/*  Detailed, sortable table showing all held packages for a customer with    */
/*  tracking, carrier, days held, storage fee, and bulk selection.            */
/* -------------------------------------------------------------------------- */

interface InventoryPackage {
  id: string;
  trackingNumber?: string;
  carrier: string;
  senderName?: string;
  packageType: string;
  status: string;
  notes?: string;
  condition?: string;
  storageFee: number;
  storageLocation?: string;
  checkedInAt: string;
  customerId: string;
}

interface CheckoutInventoryTableProps {
  packages: InventoryPackage[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onViewPackage?: (pkg: InventoryPackage) => void;
  className?: string;
}

type SortField = 'trackingNumber' | 'carrier' | 'senderName' | 'checkedInAt' | 'daysHeld' | 'packageType' | 'storageFee' | 'storageLocation';
type SortDir = 'asc' | 'desc';

const carrierLabels: Record<string, string> = {
  ups: 'UPS', fedex: 'FedEx', usps: 'USPS', amazon: 'Amazon',
  dhl: 'DHL', lasership: 'LaserShip', temu: 'Temu', ontrac: 'OnTrac',
  walmart: 'Walmart', target: 'Target', other: 'Other',
};

const pkgTypeLabels: Record<string, string> = {
  letter: 'Letter', small: 'Small Box', medium: 'Medium Box',
  large: 'Large Box', oversized: 'Oversized', tube: 'Tube',
  envelope: 'Envelope', pak: 'Pak/Packet',
};

function getDaysHeld(checkedInAt: string): number {
  const now = new Date();
  const checkedIn = new Date(checkedInAt);
  return Math.max(0, Math.floor((now.getTime() - checkedIn.getTime()) / 86400000));
}

function getDaysHeldColor(days: number): string {
  if (days >= 30) return 'text-red-400';
  if (days >= 14) return 'text-yellow-400';
  if (days >= 7) return 'text-orange-400';
  return 'text-surface-300';
}

export function CheckoutInventoryTable({
  packages,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onViewPackage,
  className,
}: CheckoutInventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('checkedInAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    return [...packages].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'trackingNumber':
          cmp = (a.trackingNumber || '').localeCompare(b.trackingNumber || '');
          break;
        case 'carrier':
          cmp = a.carrier.localeCompare(b.carrier);
          break;
        case 'senderName':
          cmp = (a.senderName || '').localeCompare(b.senderName || '');
          break;
        case 'checkedInAt':
          cmp = new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
          break;
        case 'daysHeld':
          cmp = getDaysHeld(a.checkedInAt) - getDaysHeld(b.checkedInAt);
          break;
        case 'packageType':
          cmp = a.packageType.localeCompare(b.packageType);
          break;
        case 'storageFee':
          cmp = a.storageFee - b.storageFee;
          break;
        case 'storageLocation':
          cmp = (a.storageLocation || '').localeCompare(b.storageLocation || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [packages, sortField, sortDir]);

  const allSelected = packages.length > 0 && selectedIds.size === packages.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < packages.length;

  const totalStorageFee = useMemo(
    () => packages.filter((p) => selectedIds.has(p.id)).reduce((sum, p) => sum + p.storageFee, 0),
    [packages, selectedIds]
  );

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer select-none hover:text-surface-300 transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );

  return (
    <div className={cn('overflow-x-auto', className)}>
      {/* Selection summary */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg mb-3">
          <span className="text-sm text-primary-400">
            {selectedIds.size} of {packages.length} package{packages.length !== 1 ? 's' : ''} selected
          </span>
          <span className="text-sm font-medium text-surface-200">
            Storage fees: {formatCurrency(totalStorageFee)}
          </span>
        </div>
      )}

      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-700/50">
            <th className="px-3 py-2 w-10">
              <button onClick={onToggleAll} className="text-surface-400 hover:text-surface-200">
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary-500" />
                ) : someSelected ? (
                  <MinusSquare className="h-4 w-4 text-primary-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
              #
            </th>
            <SortHeader field="trackingNumber" label="Tracking" />
            <SortHeader field="carrier" label="Carrier" />
            <SortHeader field="senderName" label="Sender" />
            <SortHeader field="packageType" label="Type" />
            <SortHeader field="checkedInAt" label="Date In" />
            <SortHeader field="daysHeld" label="Days Held" />
            <SortHeader field="storageLocation" label="Location" />
            <SortHeader field="storageFee" label="Storage Fee" />
            <th className="px-3 py-2 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-800/50">
          {sorted.map((pkg, i) => {
            const daysHeld = getDaysHeld(pkg.checkedInAt);
            const isSelected = selectedIds.has(pkg.id);
            return (
              <tr
                key={pkg.id}
                className={cn(
                  'transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-primary-500/10 hover:bg-primary-500/15'
                    : 'hover:bg-surface-800/30'
                )}
                onClick={() => onToggleSelect(pkg.id)}
              >
                <td className="px-3 py-2.5">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary-500" />
                  ) : (
                    <Square className="h-4 w-4 text-surface-500" />
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-surface-500 font-mono">
                  {i + 1}
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-primary-600">
                    {pkg.trackingNumber || '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <CarrierLogo carrier={pkg.carrier} size={16} />
                    <span className="text-xs font-medium text-surface-300">
                      {carrierLabels[pkg.carrier] || pkg.carrier}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-surface-300">
                  {pkg.senderName || '—'}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className="text-[10px]">
                    {pkgTypeLabels[pkg.packageType] || pkg.packageType}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs text-surface-400">
                  {formatDate(pkg.checkedInAt)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn('text-xs font-semibold', getDaysHeldColor(daysHeld))}>
                    {daysHeld}d
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-surface-400">
                  {pkg.storageLocation || '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={cn('text-xs font-medium', pkg.storageFee > 0 ? 'text-yellow-400' : 'text-surface-500')}>
                    {pkg.storageFee > 0 ? formatCurrency(pkg.storageFee) : 'Free'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-surface-500 max-w-[120px] truncate">
                  {pkg.notes || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {packages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-surface-600 mb-3" />
          <p className="text-sm text-surface-500">No packages to check out</p>
        </div>
      )}
    </div>
  );
}
