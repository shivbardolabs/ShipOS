'use client';

/**
 * BAR-204: Offline Provider
 *
 * - Registers the service worker
 * - Tracks online/offline status
 * - Replays queued mutations on reconnect
 * - Shows offline banner
 */

import { useEffect, useState, createContext, useContext } from 'react';

interface OfflineContextType {
  isOnline: boolean;
  isOfflineCapable: boolean;
  pendingActions: number;
  replayQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isOfflineCapable: false,
  pendingActions: 0,
  replayQueue: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineCapable, setIsOfflineCapable] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline
    const goOnline = () => {
      setIsOnline(true);
      // Auto-replay queue on reconnect
      replayQueue();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setIsOfflineCapable(true);
          console.log('[Offline] Service worker registered:', reg.scope);
        })
        .catch((err) => {
          console.log('[Offline] SW registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replayQueue = async () => {
    if (!navigator.serviceWorker?.controller) return;

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data?.type === 'REPLAY_COMPLETE') {
        const results = event.data.results || [];
        setPendingActions(0);
        if (results.length > 0) {
          console.log(`[Offline] Replayed ${results.length} queued actions`);
        }
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'REPLAY_OFFLINE_QUEUE' },
      [channel.port2]
    );
  };

  return (
    <OfflineContext.Provider value={{ isOnline, isOfflineCapable, pendingActions, replayQueue }}>
      {children}
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 text-center py-2 text-sm font-medium z-50 shadow-lg">
          📡 You&apos;re offline — changes will sync when you reconnect
          {pendingActions > 0 && ` (${pendingActions} pending)`}
        </div>
      )}
    </OfflineContext.Provider>
  );
}
