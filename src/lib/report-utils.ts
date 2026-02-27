/**
 * Shared report utility functions — date ranges, mock generators, export helpers.
 * BAR-267 / BAR-278
 */

/* -------------------------------------------------------------------------- */
/*  Date-range helpers                                                         */
/* -------------------------------------------------------------------------- */
export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRangeOption {
  id: DateGranularity;
  label: string;
}

export const dateRangeOptions: DateRangeOption[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

/* -------------------------------------------------------------------------- */
/*  Dimension filters                                                          */
/* -------------------------------------------------------------------------- */
export type Platform = 'all' | 'physical' | 'anytime' | 'iPostal' | 'postscan';
export type CarrierFilter = 'all' | 'fedex' | 'ups' | 'usps' | 'dhl' | 'amazon' | 'fedex_hal' | 'ups_ap';
export type ProgramFilter = 'all' | 'amazon_counter' | 'vinted' | 'pudo' | 'the_return' | 'return_queen' | 'fedex_easy' | 'happy_returns';

export const platformOptions = [
  { value: 'all', label: 'All Platforms' },
  { value: 'physical', label: 'In-Store Physical' },
  { value: 'anytime', label: 'AnyTime Mailbox' },
  { value: 'iPostal', label: 'iPostal1' },
  { value: 'postscan', label: 'PostScan Mail' },
];

export const carrierOptions = [
  { value: 'all', label: 'All Carriers' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'usps', label: 'USPS' },
  { value: 'dhl', label: 'DHL' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'fedex_hal', label: 'FedEx HAL' },
  { value: 'ups_ap', label: 'UPS Access Point' },
];

export const programOptions = [
  { value: 'all', label: 'All Programs' },
  { value: 'amazon_counter', label: 'Amazon Counter' },
  { value: 'vinted', label: 'Vinted' },
  { value: 'pudo', label: 'PUDO Point' },
  { value: 'the_return', label: 'The Return' },
  { value: 'return_queen', label: 'Return Queen' },
  { value: 'fedex_easy', label: 'FedEx Easy Returns' },
  { value: 'happy_returns', label: 'Happy Returns' },
];

/* -------------------------------------------------------------------------- */
/*  Export formats (BAR-278)                                                    */
/* -------------------------------------------------------------------------- */
export type ExportFormat = 'xlsx' | 'csv' | 'qbo' | 'pdf';

export const exportFormats: { id: ExportFormat; label: string; icon: string }[] = [
  { id: 'xlsx', label: 'Excel', icon: '📊' },
  { id: 'csv', label: 'CSV', icon: '📄' },
  { id: 'qbo', label: 'QBO', icon: '📒' },
  { id: 'pdf', label: 'PDF', icon: '📑' },
];

/* -------------------------------------------------------------------------- */
/*  Mock data generators                                                       */
/* -------------------------------------------------------------------------- */
const today = new Date('2026-02-21');

export function daysAgo(n: number): Date {
  return new Date(today.getTime() - n * 86400000);
}

/**
 * Generate a seeded random number between min and max (inclusive).
 * `seed` is hashed to give deterministic results for consistent UI.
 */
export function seededRandom(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  const r = x - Math.floor(x);
  return Math.floor(r * (max - min + 1)) + min;
}

/**
 * Generate daily series data for the last N days.
 */
export function generateDailySeries(days: number, baseSeed: number, min: number, max: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = daysAgo(days - 1 - i);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: d.toISOString().slice(0, 10),
      value: seededRandom(baseSeed + i, min, max),
    };
  });
}

/**
 * Generate weekly series data for the last N weeks.
 */
export function generateWeeklySeries(weeks: number, baseSeed: number, min: number, max: number) {
  return Array.from({ length: weeks }, (_, i) => {
    const d = daysAgo((weeks - 1 - i) * 7);
    const weekEnd = new Date(d.getTime() + 6 * 86400000);
    return {
      label: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      value: seededRandom(baseSeed + i * 10, min, max),
    };
  });
}

/**
 * Format a number with commas: 1234567 → "1,234,567"
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format percentage with 1 decimal
 */
export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/**
 * Report categories for navigation hub
 */
export interface ReportCategory {
  id: string;
  title: string;
  description: string;
  href: string;
  iconName: string;
  color: string;
  requiredRole?: string;
}

export const reportCategories: ReportCategory[] = [
  {
    id: 'kpi',
    title: 'KPI Dashboard',
    description: 'Customizable store metrics with trends and comparisons',
    href: '/dashboard/reports/kpi',
    iconName: 'Activity',
    color: 'bg-primary-500/20 text-primary-400',
  },
  {
    id: 'packages',
    title: 'Package Inventory',
    description: 'Real-time inventory, aging, and status breakdown',
    href: '/dashboard/reports/packages',
    iconName: 'Package',
    color: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'revenue',
    title: 'Revenue & Profitability',
    description: 'Income, margins, and profit across service lines',
    href: '/dashboard/reports/revenue',
    iconName: 'DollarSign',
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    id: 'expenses',
    title: 'Expenses & COGS',
    description: 'Track carrier costs, materials, and operating expenses',
    href: '/dashboard/reports/expenses',
    iconName: 'Receipt',
    color: 'bg-red-500/20 text-red-400',
  },
  {
    id: 'mail',
    title: 'Mail & Parcel Statistics',
    description: 'Volume, processing times, and period-over-period analysis',
    href: '/dashboard/reports/mail',
    iconName: 'Mail',
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'franchise',
    title: 'Franchise Admin Reports',
    description: 'Cross-store aggregated analytics and comparisons',
    href: '/dashboard/reports/franchise',
    iconName: 'Building2',
    color: 'bg-purple-500/20 text-purple-400',
    requiredRole: 'admin',
  },
  {
    id: 'export-history',
    title: 'Export History',
    description: 'Previously generated exports for re-download',
    href: '/dashboard/reports/export-history',
    iconName: 'Download',
    color: 'bg-surface-500/20 text-surface-400',
  },
];
