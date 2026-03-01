'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import { formatDate, cn } from '@/lib/utils';
import {
  CheckCircle2,
  Package,
  Clock,
  ArrowRight,
  Mail,
  MessageSquare,
  Printer,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  BAR-40: Batch Check-In Session Summary                                    */
/*                                                                            */
/*  Displays after ending a batch session with all packages checked in        */
/*  during the session — counts by carrier, labels printed, notifications.    */
/* -------------------------------------------------------------------------- */

export interface BatchPackage {
  id: string;
  trackingNumber?: string;
  carrier: string;
  customerName: string;
  pmbNumber: string;
  packageType: string;
  checkedInAt: string;
  labelPrinted: boolean;
  notified: boolean;
}

interface BatchSessionSummaryProps {
  packages: BatchPackage[];
  sessionStart: Date;
  sessionEnd?: Date;
  onDismiss: () => void;
  onGoToPackages: () => void;
  className?: string;
}

const carrierLabels: Record<string, string> = {
  ups: 'UPS', fedex: 'FedEx', usps: 'USPS', amazon: 'Amazon',
  dhl: 'DHL', lasership: 'LaserShip', temu: 'Temu', ontrac: 'OnTrac',
};

export function BatchSessionSummary({
  packages,
  sessionStart,
  sessionEnd,
  onDismiss,
  onGoToPackages,
  className,
}: BatchSessionSummaryProps) {
  const duration = sessionEnd
    ? Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000)
    : 0;

  // Group by carrier
  const byCarrier: Record<string, number> = {};
  for (const pkg of packages) {
    byCarrier[pkg.carrier] = (byCarrier[pkg.carrier] || 0) + 1;
  }

  // Group by customer
  const byCustomer: Record<string, { name: string; pmb: string; count: number }> = {};
  for (const pkg of packages) {
    const key = pkg.pmbNumber;
    if (!byCustomer[key]) {
      byCustomer[key] = { name: pkg.customerName, pmb: pkg.pmbNumber, count: 0 };
    }
    byCustomer[key].count++;
  }

  const labelsPrinted = packages.filter((p) => p.labelPrinted).length;
  const notified = packages.filter((p) => p.notified).length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-100">Batch Session Complete</h3>
            <p className="text-xs text-surface-400">
              {packages.length} package{packages.length !== 1 ? 's' : ''} checked in
              {duration > 0 && ` in ${duration} min`}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-surface-500 hover:text-surface-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-surface-700/50">
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-100">{packages.length}</p>
          <p className="text-xs text-surface-500">Packages</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-100">{Object.keys(byCustomer).length}</p>
          <p className="text-xs text-surface-500">Customers</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-100">{labelsPrinted}</p>
          <p className="text-xs text-surface-500">Labels Printed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-100">{notified}</p>
          <p className="text-xs text-surface-500">Notified</p>
        </div>
      </div>

      {/* Carrier breakdown */}
      <div className="px-6 py-4 space-y-3 border-b border-surface-700/50">
        <h4 className="text-xs text-surface-500 uppercase tracking-wider">By Carrier</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCarrier)
            .sort((a, b) => b[1] - a[1])
            .map(([carrier, count]) => (
              <div
                key={carrier}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50"
              >
                <CarrierLogo carrier={carrier} size={16} />
                <span className="text-xs font-medium text-surface-300">
                  {carrierLabels[carrier] || carrier}
                </span>
                <Badge variant="default" className="text-[10px] min-w-[20px] text-center">
                  {count}
                </Badge>
              </div>
            ))}
        </div>
      </div>

      {/* Package list */}
      <div className="px-6 py-4 space-y-2 max-h-64 overflow-y-auto">
        <h4 className="text-xs text-surface-500 uppercase tracking-wider">All Packages</h4>
        {packages.map((pkg, i) => (
          <div
            key={pkg.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/30 border border-surface-700/30"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-surface-500 w-5">{i + 1}.</span>
              <CarrierLogo carrier={pkg.carrier} size={16} />
              <div>
                <p className="text-xs font-medium text-surface-200">
                  {pkg.trackingNumber || 'No tracking'}
                </p>
                <p className="text-[10px] text-surface-500">
                  {pkg.customerName} ({pkg.pmbNumber})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pkg.labelPrinted && (
                <Printer className="h-3 w-3 text-surface-500" />
              )}
              {pkg.notified && (
                <Mail className="h-3 w-3 text-surface-500" />
              )}
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-surface-700/50 bg-surface-800/20">
        <Button variant="secondary" onClick={onDismiss} className="flex-1">
          Start New Session
        </Button>
        <Button onClick={onGoToPackages} className="flex-1" rightIcon={<ArrowRight className="h-4 w-4" />}>
          View Packages
        </Button>
      </div>
    </Card>
  );
}
