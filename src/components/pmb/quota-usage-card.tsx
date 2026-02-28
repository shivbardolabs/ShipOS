'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  Gauge,
  Mail,
  ScanLine,
  Archive,
  Truck,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface QuotaServiceStatus {
  service: string;
  label: string;
  used: number;
  included: number;
  remaining: number;
  percentUsed: number;
  isOverLimit: boolean;
  overageCount: number;
}

interface QuotaData {
  period: string;
  periodStart: string;
  periodEnd: string;
  services: QuotaServiceStatus[];
  totalOverageCharge: number;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  mailItems: <Mail className="h-4 w-4" />,
  scans: <ScanLine className="h-4 w-4" />,
  storageDays: <Archive className="h-4 w-4" />,
  forwarding: <Truck className="h-4 w-4" />,
  shredding: <Trash2 className="h-4 w-4" />,
  packages: <Package className="h-4 w-4" />,
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function QuotaUsageCard({ customerId }: { customerId: string }) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/pmb/quotas?customerId=${customerId}`);
        if (res.ok) {
          const data = await res.json();
          setQuota(data.quota);
        }
      } catch (err) {
        console.error('Failed to load quota:', err);
      }
      setLoading(false);
    };
    load();
  }, [customerId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
        </CardContent>
      </Card>
    );
  }

  if (!quota) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Quota Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-surface-500">No quota data for this billing period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Quota Usage — {quota.period}
          </CardTitle>
          {quota.totalOverageCharge > 0 && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {formatCurrency(quota.totalOverageCharge)} overage
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quota.services.map((s) => {
          const isUnlimited = s.included === 0;
          const barColor = s.isOverLimit
            ? 'bg-red-500'
            : s.percentUsed >= 80
              ? 'bg-amber-500'
              : 'bg-emerald-500';

          return (
            <div key={s.service}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-surface-300">
                  <span className="text-surface-500">{SERVICE_ICONS[s.service]}</span>
                  {s.label}
                </div>
                <div className="text-sm text-surface-400">
                  {isUnlimited ? (
                    <span>{s.used} used</span>
                  ) : (
                    <span>
                      {s.used} / {s.included}
                      {s.isOverLimit && (
                        <span className="text-red-400 ml-1">(+{s.overageCount} over)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              {!isUnlimited && (
                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(100, s.percentUsed)}%` }}
                  />
                </div>
              )}
              {isUnlimited && (
                <div className="text-xs text-surface-500">Unlimited</div>
              )}
            </div>
          );
        })}

        <div className="pt-2 border-t border-surface-800 flex items-center justify-between text-xs text-surface-500">
          <span>Period: {new Date(quota.periodStart).toLocaleDateString()} – {new Date(quota.periodEnd).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
