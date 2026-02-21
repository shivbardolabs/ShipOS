'use client';

import { cn } from '@/lib/utils';
import { getStatusColor } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

interface BadgeProps {
  children: ReactNode;
  /** Explicit variant – overrides auto-detect */
  variant?: BadgeVariant;
  /** Pass a status string (e.g. "active") to auto-detect color via getStatusColor() */
  status?: string;
  /** Show a leading dot indicator */
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary-500/20 text-primary-600 border-primary-200',
  success: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  danger: 'bg-red-100 text-red-600 border-red-200',
  info: 'bg-blue-100 text-blue-600 border-blue-500/30',
  muted: 'bg-surface-600/30 text-surface-400 border-surface-600/40',
};

const dotVariantColors: Record<BadgeVariant, string> = {
  default: 'bg-primary-400',
  success: 'bg-emerald-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  muted: 'bg-surface-400',
};

export function Badge({
  children,
  variant,
  status,
  dot = true,
  className,
}: BadgeProps) {
  // If a status string is provided and no explicit variant, use getStatusColor
  const colorClass = status && !variant ? getStatusColor(status) : undefined;
  const resolvedVariant = variant || 'default';

  // Determine dot color
  // When using getStatusColor, extract the text-* class for the dot
  let dotColor = dotVariantColors[resolvedVariant];
  if (colorClass) {
    // Extract e.g. "text-emerald-600" → "bg-emerald-400"
    const match = colorClass.match(/text-(\S+-\d+)/);
    if (match) dotColor = `bg-${match[1]}`;
  }

  return (
    <span
      className={cn(
        'status-badge',
        colorClass || variantStyles[resolvedVariant],
        className
      )}
    >
      {dot && (
        <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dotColor)} />
      )}
      {children}
    </span>
  );
}

export type { BadgeProps, BadgeVariant };
