'use client';

/* ── TASTE: Persistent resumable state ──
   Stores UI state (filters, tabs, search) in the URL so refreshing
   or sharing a link restores the exact view. */

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

type Serializable = string | number | boolean | null;

/**
 * Like useState but persisted in the URL search params.
 *
 * @example
 *   const [tab, setTab] = useUrlState('tab', 'overview');
 *   const [page, setPage] = useUrlState('p', 1);
 */
export function useUrlState<T extends Serializable>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = useMemo<T>(() => {
    const raw = searchParams.get(key);
    if (raw === null) return defaultValue;

    // Type coercion based on default value type
    if (typeof defaultValue === 'number') return Number(raw) as T;
    if (typeof defaultValue === 'boolean') return (raw === 'true') as unknown as T;
    return raw as T;
  }, [searchParams, key, defaultValue]);

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultValue || next === null || next === '') {
        params.delete(key);
      } else {
        params.set(key, String(next));
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, key, defaultValue, router, pathname],
  );

  return [value, setValue];
}
