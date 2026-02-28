'use client';

import { cn } from '@/lib/utils';

/* ── TASTE: Skeleton loading states ──
   Composable primitives that mirror real content shapes.
   Usage: <Skeleton className="h-4 w-32" /> for a text line
          <Skeleton variant="circle" className="h-10 w-10" /> for avatar
          <SkeletonCard /> for a full card placeholder
          <SkeletonTable rows={5} cols={4} /> for table loading */

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-800',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'rect' && 'rounded-lg',
        className,
      )}
    />
  );
}

/** Card-shaped skeleton — stat card, info panel, etc. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-5 space-y-3', className)}>
      <Skeleton className="h-3 w-20" variant="text" />
      <Skeleton className="h-8 w-28" variant="text" />
      <Skeleton className="h-3 w-40" variant="text" />
    </div>
  );
}

/** Table-shaped skeleton */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      {/* Header row */}
      <div className="flex gap-4 px-5 py-3 border-b border-surface-700">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" variant="text" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-5 py-4 border-b border-surface-700 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn('h-4 flex-1', c === 0 && 'max-w-[160px]')}
              variant="text"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Row of stat cards */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
