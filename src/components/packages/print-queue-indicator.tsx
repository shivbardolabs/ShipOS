'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrintQueue } from '@/components/packages/print-queue-provider';

/* -------------------------------------------------------------------------- */
/*  BAR-329: Print Queue Indicator                                            */
/*                                                                            */
/*  Displays on the Package Management screen when labels are pending in the  */
/*  batch print queue. Shows a count badge and a quick link to the check-in   */
/*  page where the queue can be printed.                                      */
/* -------------------------------------------------------------------------- */

interface PrintQueueIndicatorProps {
  className?: string;
}

export function PrintQueueIndicator({ className }: PrintQueueIndicatorProps) {
  const { queue, pendingCount } = usePrintQueue();
  const router = useRouter();

  if (pendingCount === 0) return null;

  // Summarize carriers in the queue
  const carrierCounts = queue.reduce<Record<string, number>>((acc, label) => {
    const carrier = label.carrier.toUpperCase();
    acc[carrier] = (acc[carrier] || 0) + 1;
    return acc;
  }, {});
  const carrierSummary = Object.entries(carrierCounts)
    .map(([carrier, count]) => `${count} ${carrier}`)
    .join(', ');

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
          <Printer className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-surface-200">
              Print Queue
            </p>
            <Badge variant="info" dot>
              {pendingCount} pending
            </Badge>
          </div>
          <p className="text-xs text-surface-400 mt-0.5">
            {pendingCount} label{pendingCount !== 1 ? 's' : ''} waiting to be
            printed{carrierSummary ? ` · ${carrierSummary}` : ''}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/dashboard/packages/check-in')}
        leftIcon={<Layers className="h-4 w-4" />}
      >
        View Queue
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
