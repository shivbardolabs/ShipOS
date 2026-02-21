'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

interface TabPanelProps {
  children: ReactNode;
  active: boolean;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                      */
/* -------------------------------------------------------------------------- */
export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'horizontal',
  className,
}: TabsProps) {
  if (variant === 'vertical') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
                isActive
                  ? 'bg-primary-50 text-primary-600 border-l-2 border-primary-500'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-xs',
                    isActive
                      ? 'bg-primary-500/20 text-primary-300'
                      : 'bg-surface-700 text-surface-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-surface-800',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative',
              isActive
                ? 'text-primary-600'
                : 'text-surface-400 hover:text-surface-200'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold',
                  isActive
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'bg-surface-700 text-surface-400'
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Active underline */}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TabPanel                                                                  */
/* -------------------------------------------------------------------------- */
export function TabPanel({ children, active, className }: TabPanelProps) {
  if (!active) return null;
  return <div className={cn('pt-4', className)}>{children}</div>;
}

export type { Tab, TabsProps, TabPanelProps };
