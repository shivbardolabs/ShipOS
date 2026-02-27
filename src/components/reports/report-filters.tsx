'use client';

import { Select } from '@/components/ui/select';
import {
  dateRangeOptions,
  platformOptions,
  carrierOptions,
  programOptions,
  type DateGranularity,
  type Platform,
  type CarrierFilter,
  type ProgramFilter,
} from '@/lib/report-utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface ReportFilterValues {
  dateRange: DateGranularity;
  platform: Platform;
  carrier: CarrierFilter;
  program: ProgramFilter;
}

interface ReportFiltersProps {
  filters: ReportFilterValues;
  onChange: (filters: ReportFilterValues) => void;
  /** Hide specific filter keys */
  hide?: (keyof ReportFilterValues)[];
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function ReportFilters({ filters, onChange, hide = [] }: ReportFiltersProps) {
  const set = <K extends keyof ReportFilterValues>(key: K, value: ReportFilterValues[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-end gap-3">
      {!hide.includes('dateRange') && (
        <div className="min-w-[140px]">
          <Select
            label="Period"
            options={dateRangeOptions.map((d) => ({ value: d.id, label: d.label }))}
            value={filters.dateRange}
            onChange={(e) => set('dateRange', e.target.value as DateGranularity)}
          />
        </div>
      )}
      {!hide.includes('platform') && (
        <div className="min-w-[160px]">
          <Select
            label="Platform"
            options={platformOptions}
            value={filters.platform}
            onChange={(e) => set('platform', e.target.value as Platform)}
          />
        </div>
      )}
      {!hide.includes('carrier') && (
        <div className="min-w-[150px]">
          <Select
            label="Carrier"
            options={carrierOptions}
            value={filters.carrier}
            onChange={(e) => set('carrier', e.target.value as CarrierFilter)}
          />
        </div>
      )}
      {!hide.includes('program') && (
        <div className="min-w-[170px]">
          <Select
            label="Program"
            options={programOptions}
            value={filters.program}
            onChange={(e) => set('program', e.target.value as ProgramFilter)}
          />
        </div>
      )}
    </div>
  );
}
