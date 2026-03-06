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
  | 'muted'
  | 'outline';

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
  success: 'bg-status-success-100 text-status-success-600 border-status-success-200',
  warning: 'bg-status-warning-500/20 text-status-warning-400 border-status-warning-500/30',
  danger: 'bg-status-error-100 text-status-error-600 border-status-error-200',
  info: 'bg-status-info-100 text-status-info-600 border-status-info-500/30',
  muted: 'bg-surface-600/30 text-surface-400 border-surface-600/40',
  outline: 'bg-transparent text-surface-300 border-surface-500',
};

const dotVariantColors: Record<BadgeVariant, string> = {
  default: 'bg-primary-400',
  success: 'bg-status-success-400',
  warning: 'bg-status-warning-400',
  danger: 'bg-status-error-400',
  info: 'bg-status-info-400',
  muted: 'bg-surface-400',
  outline: 'bg-surface-400',
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
    // Extract e.g. "text-status-success-600" → "bg-status-success-400"
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
