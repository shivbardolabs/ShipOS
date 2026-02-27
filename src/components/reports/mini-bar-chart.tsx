'use client';

import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  MiniBarChart — lightweight, CSS-only bar chart for reports                */
/* -------------------------------------------------------------------------- */
interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface MiniBarChartProps {
  data: BarItem[];
  /** Show value labels on bars */
  showValues?: boolean;
  /** Height of each bar in px */
  barHeight?: number;
  className?: string;
  formatValue?: (v: number) => string;
}

export function MiniBarChart({
  data,
  showValues = true,
  barHeight = 28,
  className,
  formatValue = (v) => v.toLocaleString(),
}: MiniBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((item) => {
        const pct = (item.value / maxValue) * 100;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-surface-400 text-right truncate">
              {item.label}
            </span>
            <div className="flex-1 relative">
              <div
                className={cn('rounded-sm transition-all duration-500', item.color || 'bg-primary-500/60')}
                style={{ width: `${Math.max(pct, 2)}%`, height: barHeight }}
              />
              {showValues && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-surface-300">
                  {formatValue(item.value)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sparkline — tiny inline trend line using CSS gradients                    */
/* -------------------------------------------------------------------------- */
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({ data, color = '#6366f1', height = 32, className }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={height} className={cn('inline-block', className)} viewBox={`0 0 ${w} ${height}`}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  DonutChart — simple CSS donut                                             */
/* -------------------------------------------------------------------------- */
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

export function DonutChart({ data, size = 160, centerLabel, centerValue, className }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const r = size / 2 - 10;
  const circumference = 2 * Math.PI * r;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((seg) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const dashOff = cumulative * circumference;
          cumulative += pct;
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={20}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-dashOff}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-lg font-bold text-surface-100">{centerValue}</span>}
          {centerLabel && <span className="text-[10px] text-surface-400">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
