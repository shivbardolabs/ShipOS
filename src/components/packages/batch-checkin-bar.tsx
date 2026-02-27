'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Layers,
  UserCheck,
  StopCircle,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  BAR-241: Batch Check-In Session Status Bar                                */
/*                                                                            */
/*  Displays at the top of the check-in page during an active batch session.  */
/*  Shows count of staged packages, session duration, and quick actions:      */
/*  - Queue Jump (customer waiting)                                           */
/*  - End Session (finish batch)                                              */
/* -------------------------------------------------------------------------- */

interface BatchCheckinBarProps {
  /** Is a batch session currently active? */
  isActive: boolean;
  /** Number of packages staged in this session */
  stagedCount: number;
  /** Number of labels queued for printing */
  labelQueueCount: number;
  /** Callback when "Customer Waiting" is clicked */
  onQueueJump: () => void;
  /** Callback when "End Session" is clicked */
  onEndSession: () => void;
  className?: string;
}

export function BatchCheckinBar({
  isActive,
  stagedCount,
  labelQueueCount,
  onQueueJump,
  onEndSession,
  className,
}: BatchCheckinBarProps) {
  if (!isActive) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-surface-200">
              Batch Session Active
            </p>
            <Badge variant="info" dot>
              In Progress
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-surface-400 flex items-center gap-1">
              <Package className="h-3 w-3" />
              {stagedCount} package{stagedCount !== 1 ? 's' : ''} staged
            </span>
            {labelQueueCount > 0 && (
              <span className="text-xs text-surface-400">
                · {labelQueueCount} label{labelQueueCount !== 1 ? 's' : ''} queued
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onQueueJump}
          leftIcon={<UserCheck className="h-4 w-4" />}
        >
          Customer Waiting
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEndSession}
          leftIcon={<StopCircle className="h-4 w-4" />}
        >
          End Session
        </Button>
      </div>
    </div>
  );
}
