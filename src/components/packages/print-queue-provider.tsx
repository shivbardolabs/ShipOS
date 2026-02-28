'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { QueuedLabel, PrintMode } from '@/components/packages/label-print-queue';

/* -------------------------------------------------------------------------- */
/*  BAR-329: Print Queue Context                                              */
/*                                                                            */
/*  Shared state for the label print queue across dashboard pages.            */
/*  The check-in page syncs its local queue here so other pages (e.g.         */
/*  Package Management) can display a pending-labels indicator.               */
/*  Persists to sessionStorage so the count survives page navigations.        */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'shipos_print_queue';

interface PrintQueueContextValue {
  /** Current queued labels */
  queue: QueuedLabel[];
  /** Current print mode */
  printMode: PrintMode;
  /** Number of labels pending in the queue */
  pendingCount: number;
  /** Sync queue state from the check-in page */
  syncQueue: (labels: QueuedLabel[], mode: PrintMode) => void;
  /** Clear the queue (after batch print or session end) */
  clearQueue: () => void;
}

const PrintQueueContext = createContext<PrintQueueContextValue>({
  queue: [],
  printMode: 'per-package',
  pendingCount: 0,
  syncQueue: () => {},
  clearQueue: () => {},
});

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export function PrintQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedLabel[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>('per-package');

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.queue)) setQueue(parsed.queue);
        if (parsed.printMode) setPrintMode(parsed.printMode);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to sessionStorage on changes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ queue, printMode })
      );
    } catch {
      // Ignore quota errors
    }
  }, [queue, printMode]);

  const syncQueue = useCallback(
    (labels: QueuedLabel[], mode: PrintMode) => {
      setQueue(labels);
      setPrintMode(mode);
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <PrintQueueContext.Provider
      value={{
        queue,
        printMode,
        pendingCount: queue.length,
        syncQueue,
        clearQueue,
      }}
    >
      {children}
    </PrintQueueContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function usePrintQueue() {
  return useContext(PrintQueueContext);
}
