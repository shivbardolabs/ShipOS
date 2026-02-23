'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ChevronRight, X } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface DetailRow {
  label: string;
  value: string | number;
  /** Optional color bar width 0-100 for mini horizontal bar */
  bar?: number;
  /** Bar color class, e.g. "bg-blue-500" */
  barColor?: string;
  /** Optional icon */
  icon?: React.ElementType;
  /** Optional icon color class */
  iconColor?: string;
}

export interface DetailSection {
  title: string;
  rows: DetailRow[];
}

export interface ExpandableStatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  /** Percentage change */
  change?: number;
  className?: string;
  /** Link target for "View All" */
  href?: string;
  /** Detail sections shown when expanded */
  details?: DetailSection[];
  /** Summary text shown at the bottom of expanded view */
  detailSummary?: string;
}

/* -------------------------------------------------------------------------- */
/*  ExpandableStatCard                                                        */
/* -------------------------------------------------------------------------- */
export function ExpandableStatCard({
  icon,
  title,
  value,
  change,
  className,
  href,
  details,
  detailSummary,
}: ExpandableStatCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? 'text-emerald-600' : 'text-red-600';
  const hasDetails = details && details.length > 0;

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, details]);

  return (
    <div
      className={cn(
        'glass-card transition-all duration-200',
        hasDetails && 'cursor-pointer hover:border-surface-600/80',
        expanded && 'ring-1 ring-primary-600/30 border-primary-600/20',
        className
      )}
      onClick={() => hasDetails && setExpanded(!expanded)}
      role={hasDetails ? 'button' : undefined}
      tabIndex={hasDetails ? 0 : undefined}
      onKeyDown={hasDetails ? (e) => e.key === 'Enter' && setExpanded(!expanded) : undefined}
    >
      {/* Main stat area */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            {icon}
          </div>
          <div className="flex items-center gap-2">
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
            {hasDetails && (
              <div className={cn(
                'flex h-5 w-5 items-center justify-center rounded transition-transform duration-200',
                expanded ? 'rotate-90' : ''
              )}>
                <ChevronRight className="h-3.5 w-3.5 text-surface-500" />
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold text-surface-100">{value}</p>
        <p className="mt-1 text-xs text-surface-400">{title}</p>
      </div>

      {/* Expandable detail panel */}
      {hasDetails && (
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: expanded ? `${contentHeight + 20}px` : '0px' }}
        >
          <div ref={contentRef}>
            <div className="border-t border-surface-700/50 px-5 pb-4 pt-3">
              {details.map((section, sIdx) => (
                <div key={sIdx} className={sIdx > 0 ? 'mt-3' : ''}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-surface-500 mb-2">
                    {section.title}
                  </p>
                  <div className="space-y-1.5">
                    {section.rows.map((row, rIdx) => {
                      const RowIcon = row.icon;
                      return (
                        <div key={rIdx} className="flex items-center gap-2">
                          {RowIcon && (
                            <RowIcon className={cn('h-3 w-3 shrink-0', row.iconColor || 'text-surface-500')} />
                          )}
                          <span className="text-xs text-surface-400 flex-1 truncate">
                            {row.label}
                          </span>
                          {row.bar !== undefined && (
                            <div className="w-16 h-1.5 rounded-full bg-surface-800 shrink-0">
                              <div
                                className={cn('h-full rounded-full transition-all duration-500', row.barColor || 'bg-primary-500')}
                                style={{ width: `${Math.min(row.bar, 100)}%` }}
                              />
                            </div>
                          )}
                          <span className="text-xs font-semibold text-surface-200 tabular-nums shrink-0">
                            {row.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Summary line */}
              {detailSummary && (
                <p className="mt-3 text-[11px] text-surface-500 italic border-t border-surface-800 pt-2">
                  {detailSummary}
                </p>
              )}

              {/* View All link */}
              {href && (
                <a
                  href={href}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  View Details
                  <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
