'use client';

/**
 * Feature-flag context provider.
 *
 * Fetches evaluated flags from /api/feature-flags on mount and provides
 * them via React context. Components use `useFlags()` to check flag state.
 *
 * Superadmin users always get all flags enabled (handled server-side).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

interface FeatureFlagContextValue {
  /** Map of flagKey → enabled */
  flags: Record<string, boolean>;
  /** Whether flags are still loading */
  loading: boolean;
  /** Check if a specific flag is enabled */
  isEnabled: (key: string) => boolean;
  /** Re-fetch flags (e.g. after admin changes) */
  refresh: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  loading: true,
  isEnabled: () => true, // default to true until loaded to avoid flash
  refresh: async () => {},
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useUser();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/feature-flags');
      if (res.ok) {
        const data = await res.json();
        setFlags(data);
      }
    } catch (e) {
      console.error('Failed to fetch feature flags', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchFlags();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, fetchFlags]);

  const isEnabled = useCallback(
    (key: string): boolean => {
      if (loading) return true; // while loading, show everything (avoid flash)
      return flags[key] ?? true; // unknown flags default to true (safe fallback)
    },
    [flags, loading],
  );

  return (
    <FeatureFlagContext.Provider value={{ flags, loading, isEnabled, refresh: fetchFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to access evaluated feature flags.
 *
 * @example
 * const { isEnabled } = useFlags();
 * if (isEnabled('ai-smart-intake')) { ... }
 */
export function useFlags() {
  return useContext(FeatureFlagContext);
}
