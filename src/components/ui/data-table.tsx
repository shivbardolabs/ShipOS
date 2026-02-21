'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SearchInput } from './input';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Button } from './button';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  /** Custom render function for the cell */
  render?: (row: T) => ReactNode;
  /** Column width class (e.g. "w-40") */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key accessor for each row */
  keyAccessor: (row: T) => string;
  /** Fired when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Enable search bar */
  searchable?: boolean;
  /** Placeholder for search */
  searchPlaceholder?: string;
  /** Fields to search by – defaults to all string fields */
  searchFields?: string[];
  /** Page size for pagination (0 = no pagination) */
  pageSize?: number;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Header actions (filters, buttons, etc.) */
  headerActions?: ReactNode;
  className?: string;
}

type SortDir = 'asc' | 'desc' | null;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyAccessor,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search…',
  searchFields,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No results found',
  headerActions,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  // ---- Search filter ----
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => {
      const fields = searchFields || Object.keys(row);
      return fields.some((f) => {
        const val = row[f];
        if (typeof val === 'string') return val.toLowerCase().includes(q);
        if (typeof val === 'number') return String(val).includes(q);
        return false;
      });
    });
  }, [data, search, searchFields]);

  // ---- Sort ----
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc'
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // ---- Pagination ----
  const totalPages = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1;
  const paged =
    pageSize > 0 ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  // Reset to page 0 when search changes
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  // Toggle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const alignClass = (a?: string) =>
    a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Toolbar */}
      {(searchable || headerActions) && (
        <div className="flex items-center gap-3 flex-wrap">
          {searchable && (
            <SearchInput
              placeholder={searchPlaceholder}
              value={search}
              onSearch={handleSearch}
              className="w-72"
            />
          )}
          <div className="ml-auto flex items-center gap-2">{headerActions}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 bg-surface-900/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-400',
                    alignClass(col.align),
                    col.width,
                    col.sortable && 'cursor-pointer select-none hover:text-surface-200'
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-surface-600">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-primary-400" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-primary-400" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-20 text-center text-surface-400"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-400" />
                    <span className="text-sm">Loading…</span>
                  </div>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-20 text-center text-surface-400"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Inbox className="h-8 w-8 text-surface-600" />
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={keyAccessor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-surface-800/50 table-row-hover',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-surface-200',
                        alignClass(col.align),
                        col.width
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : (row[col.key] as ReactNode) ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-400">
          <span>
            Showing {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-surface-300">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
