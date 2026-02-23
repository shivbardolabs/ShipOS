'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Optional icon shown before the title */
  icon?: ReactNode;
  /** Optional badge/indicator shown after the description (e.g. "last performed by") */
  badge?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, icon, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div>
        <div className="flex items-center gap-2">
          {icon && <span className="text-surface-400">{icon}</span>}
          <h1 className="text-2xl font-bold text-surface-100">{title}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          {description && (
            <p className="text-sm text-surface-400">{description}</p>
          )}
          {badge}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0">{actions}</div>}
    </div>
  );
}

export type { PageHeaderProps };
