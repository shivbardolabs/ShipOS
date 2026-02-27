'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  Truck,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  BAR-258 — Dashboard Carrier Status Section                                */
/*  Daily Drop-off & Pickup Tracker                                           */
/* -------------------------------------------------------------------------- */

/** Carrier configuration (tenant-level) */
interface CarrierConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

/** Daily status for a single carrier */
interface CarrierDailyStatus {
  carrierId: string;
  droppedOff: boolean;
  droppedOffCount: number;
  droppedOffTime?: string;
  pickedUp: boolean;
  pickedUpCount: number;
  pickedUpTime?: string;
}

/* ── Default supported carriers ─────────────────────────────────────────── */
const DEFAULT_CARRIERS: CarrierConfig[] = [
  { id: 'fedex_express', name: 'FedEx Express', type: 'Document / Parcel', enabled: true },
  { id: 'fedex_ground', name: 'FedEx Ground', type: 'Parcel / Package', enabled: true },
  { id: 'ups', name: 'UPS', type: 'Document / Parcel', enabled: true },
  { id: 'usps', name: 'USPS', type: 'Mail / Parcel / Package', enabled: true },
  { id: 'amazon', name: 'Amazon', type: 'Parcel / Package', enabled: true },
  { id: 'dhl', name: 'DHL', type: 'Intl Document / Parcel / Package', enabled: false },
];

/** Map carrier config IDs to carrier-logo component IDs */
const carrierLogoId: Record<string, string> = {
  fedex_express: 'fedex',
  fedex_ground: 'fedex',
  ups: 'ups',
  usps: 'usps',
  amazon: 'amazon',
  dhl: 'dhl',
};

/* ── Mock daily status data ─────────────────────────────────────────────── */
const MOCK_DAILY_STATUS: CarrierDailyStatus[] = [
  { carrierId: 'fedex_express', droppedOff: true, droppedOffCount: 4, droppedOffTime: '09:15 AM', pickedUp: false, pickedUpCount: 0 },
  { carrierId: 'fedex_ground', droppedOff: true, droppedOffCount: 12, droppedOffTime: '10:30 AM', pickedUp: false, pickedUpCount: 0 },
  { carrierId: 'ups', droppedOff: true, droppedOffCount: 8, droppedOffTime: '10:45 AM', pickedUp: true, pickedUpCount: 5, pickedUpTime: '04:30 PM' },
  { carrierId: 'usps', droppedOff: true, droppedOffCount: 23, droppedOffTime: '11:20 AM', pickedUp: true, pickedUpCount: 7, pickedUpTime: '03:00 PM' },
  { carrierId: 'amazon', droppedOff: true, droppedOffCount: 15, droppedOffTime: '02:15 PM', pickedUp: false, pickedUpCount: 0 },
  { carrierId: 'dhl', droppedOff: false, droppedOffCount: 0, pickedUp: false, pickedUpCount: 0 },
];

/* ── Status indicator component ─────────────────────────────────────────── */
function StatusIndicator({
  active,
  label,
  count,
  time,
  variant,
}: {
  active: boolean;
  label: string;
  count: number;
  time?: string;
  variant: 'dropoff' | 'pickup';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
        active
          ? variant === 'dropoff'
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-surface-800/30 text-surface-500 border border-surface-700/30'
      )}
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium">{active ? label : 'Pending'}</span>
        {active && count > 0 && (
          <span className="ml-1 opacity-75">({count})</span>
        )}
      </div>
      {active && time && (
        <span className="text-[10px] opacity-60 whitespace-nowrap">{time}</span>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */

interface CarrierStatusSectionProps {
  className?: string;
}

export function CarrierStatusSection({ className }: CarrierStatusSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [carriers] = useState<CarrierConfig[]>(DEFAULT_CARRIERS);
  const [dailyStatus] = useState<CarrierDailyStatus[]>(MOCK_DAILY_STATUS);

  // Only show enabled carriers
  const enabledCarriers = useMemo(
    () => carriers.filter((c) => c.enabled),
    [carriers]
  );

  // Status lookup by carrier ID
  const statusMap = useMemo(() => {
    const map = new Map<string, CarrierDailyStatus>();
    for (const s of dailyStatus) {
      map.set(s.carrierId, s);
    }
    return map;
  }, [dailyStatus]);

  // Summary counts
  const summary = useMemo(() => {
    const enabled = enabledCarriers.length;
    const droppedOff = enabledCarriers.filter((c) => statusMap.get(c.id)?.droppedOff).length;
    const pickedUp = enabledCarriers.filter((c) => statusMap.get(c.id)?.pickedUp).length;
    const totalPkgs = enabledCarriers.reduce(
      (sum, c) => sum + (statusMap.get(c.id)?.droppedOffCount ?? 0),
      0
    );
    return { enabled, droppedOff, pickedUp, totalPkgs };
  }, [enabledCarriers, statusMap]);

  // Fetch carrier status (polls every 60s)
  const fetchStatus = useCallback(async () => {
    try {
      // In production, this would call /api/dashboard/carrier-status
      // For now, using mock data
    } catch {
      // Silently fail — dashboard should still render
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <Card className={cn('overflow-hidden', className)} padding="none">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-3.5 hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
            <Truck className="h-4.5 w-4.5 text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-surface-200">
              Carrier Status
            </h3>
            <p className="text-xs text-surface-500">
              {summary.droppedOff}/{summary.enabled} dropped off · {summary.pickedUp}/{summary.enabled} picked up · {summary.totalPkgs} packages today
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {summary.droppedOff === summary.enabled && summary.pickedUp === summary.enabled ? (
            <Badge variant="success" dot>All Complete</Badge>
          ) : (
            <Badge variant="warning" dot>In Progress</Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-surface-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-surface-500" />
          )}
        </div>
      </button>

      {/* Carrier grid */}
      {expanded && (
        <div className="px-4 pb-4 space-y-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {enabledCarriers.map((carrier) => {
              const status = statusMap.get(carrier.id);
              const isComplete = status?.droppedOff && status?.pickedUp;

              return (
                <div
                  key={carrier.id}
                  className={cn(
                    'rounded-xl border p-3.5 transition-all',
                    isComplete
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-surface-700/50 bg-surface-800/20'
                  )}
                >
                  {/* Carrier header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <CarrierLogo carrier={carrierLogoId[carrier.id] || carrier.id} size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-200 truncate">
                        {carrier.name}
                      </p>
                      <p className="text-[10px] text-surface-500 truncate">
                        {carrier.type}
                      </p>
                    </div>
                    {isComplete && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Status indicators */}
                  <div className="grid grid-cols-2 gap-2">
                    <StatusIndicator
                      active={!!status?.droppedOff}
                      label="Dropped Off"
                      count={status?.droppedOffCount ?? 0}
                      time={status?.droppedOffTime}
                      variant="dropoff"
                    />
                    <StatusIndicator
                      active={!!status?.pickedUp}
                      label="Picked Up"
                      count={status?.pickedUpCount ?? 0}
                      time={status?.pickedUpTime}
                      variant="pickup"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-700/30">
            <p className="text-[10px] text-surface-500">
              Statuses reset each business day · Last refreshed just now
            </p>
            <button className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 transition-colors">
              <Settings className="h-3 w-3" />
              Configure Carriers
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
