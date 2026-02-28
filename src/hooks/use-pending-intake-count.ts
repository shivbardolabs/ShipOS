'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook that polls /api/packages/smart-intake/pending for the count
 * of pending Smart Intake items. Used by the sidebar badge.
 *
 * BAR-337: Sidebar Badge — Show Pending Labels Count.
 *
 * @param pollInterval - Polling interval in ms (default 30s)
 * @param enabled - Whether polling is active (default true)
 */
export function usePendingIntakeCount(
  pollInterval = 30_000,
  enabled = true,
) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/packages/smart-intake/pending?countOnly=true');
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
      }
    } catch {
      // Silently fail — badge just shows stale count
    } finally {
      setLoading(false);
    }
  }, []);

  /** Manually trigger a refresh (e.g. after check-in). */
  const refresh = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchCount();

    // Set up polling
    intervalRef.current = setInterval(fetchCount, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pollInterval, fetchCount]);

  return { count, loading, refresh };
}
