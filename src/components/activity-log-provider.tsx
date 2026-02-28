'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTenant } from '@/components/tenant-provider';
import {
  logAction as _logAction,
  readLog,
  type LogActionParams,
  type ActivityLogEntry,
  type ActionVerb,
  type ActionCategory,
} from '@/lib/activity-log';

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

interface ActivityLogContextValue {
  /** Log a new action — auto-fills user info from the current session */
  log: (params: Omit<LogActionParams, 'userId' | 'userName' | 'userRole' | 'userAvatar'>) => ActivityLogEntry | null;
  /** Get the most recent action for a given entity */
  lastActionFor: (entityType: string, entityId: string) => ActivityLogEntry | null;
  /** Get the most recent action of a given verb */
  lastActionByVerb: (action: ActionVerb) => ActivityLogEntry | null;
  /** Get recent actions */
  recentActions: (limit?: number) => ActivityLogEntry[];
  /** Get actions by category */
  actionsByCategory: (category: ActionCategory, limit?: number) => ActivityLogEntry[];
  /** Get actions by user */
  actionsByUser: (userId: string, limit?: number) => ActivityLogEntry[];
  /** All log entries (reactive — updated after each log call) */
  entries: ActivityLogEntry[];
  /** Force a re-read from the API */
  refresh: () => void;
  /** Whether the initial load is still in progress */
  loading: boolean;
}

const ActivityLogContext = createContext<ActivityLogContextValue>({
  log: () => null,
  lastActionFor: () => null,
  lastActionByVerb: () => null,
  recentActions: () => [],
  actionsByCategory: () => [],
  actionsByUser: () => [],
  entries: [],
  refresh: () => {},
  loading: true,
});

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const { localUser } = useTenant();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch audit log entries from the real API
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-log?limit=200');
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.entries && Array.isArray(data.entries)) {
        // Merge with any client-side entries logged in the current session
        // (in-memory only, these will be in the DB on next fetch)
        const localEntries = readLog();
        const dbIds = new Set(data.entries.map((e: ActivityLogEntry) => e.id));
        const uniqueLocal = localEntries.filter((e) => !dbIds.has(e.id));
        // Show DB entries first (newest), then any local-only entries
        setEntries([...data.entries, ...uniqueLocal]);
      }
    } catch (err) {
      console.warn('[ActivityLogProvider] API fetch failed, falling back to localStorage', err);
      // Fallback to localStorage if API is unavailable
      setEntries(readLog());
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchEntries();
  }, [fetchEntries]);

  const log = useCallback(
    (params: Omit<LogActionParams, 'userId' | 'userName' | 'userRole' | 'userAvatar'>) => {
      if (!localUser) return null;
      const entry = _logAction({
        ...params,
        userId: localUser.id,
        userName: localUser.name,
        userRole: localUser.role,
        userAvatar: localUser.avatar ?? undefined,
      });
      // Add to reactive state immediately for instant UI feedback
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [localUser]
  );

  const lastActionFor = useCallback(
    (entityType: string, entityId: string) =>
      entries.find((e) => e.entityType === entityType && e.entityId === entityId) ?? null,
    [entries]
  );

  const lastActionByVerb = useCallback(
    (action: ActionVerb) =>
      entries.find((e) => e.action === action) ?? null,
    [entries]
  );

  const recentActions = useCallback(
    (limit = 20) => entries.slice(0, limit),
    [entries]
  );

  const actionsByCategory = useCallback(
    (category: ActionCategory, limit = 50) =>
      entries.filter((e) => e.category === category).slice(0, limit),
    [entries]
  );

  const actionsByUser = useCallback(
    (userId: string, limit = 50) =>
      entries.filter((e) => e.userId === userId).slice(0, limit),
    [entries]
  );

  return (
    <ActivityLogContext.Provider
      value={{
        log,
        lastActionFor,
        lastActionByVerb,
        recentActions,
        actionsByCategory,
        actionsByUser,
        entries,
        refresh,
        loading,
      }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useActivityLog() {
  return useContext(ActivityLogContext);
}
