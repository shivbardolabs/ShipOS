'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const padMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className,
  hover = false,
  onClick,
  padding = 'md',
}: CardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'glass-card',
        padMap[padding],
        hover && 'card-hover',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card sub-components                                                       */
/* -------------------------------------------------------------------------- */
export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-sm font-semibold text-surface-200', className)}>
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}

/* -------------------------------------------------------------------------- */
/*  StatCard                                                                  */
/* -------------------------------------------------------------------------- */
interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  /** Percentage change – positive = up, negative = down */
  change?: number;
  className?: string;
}

export function StatCard({ icon, title, value, change, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/15 text-primary-400">
          {icon}
        </div>
        {change !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', changeColor)}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-surface-400">{title}</p>
    </div>
  );
}

export type { CardProps, StatCardProps };
