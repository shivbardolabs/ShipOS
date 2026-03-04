'use client';

/**
 * BAR-204: Online/Offline status indicator (header pill).
 *
 * When the OfflineProvider is active (offline_mode flag enabled), this
 * component reads from the shared context and shows pending-action count.
 * Otherwise it falls back to a standalone navigator.onLine listener.
 */

import { useState, useEffect } from 'react';
import { useOffline } from '@/components/offline-provider';

export function OnlineStatus() {
  // ── Try to consume the OfflineProvider context ───────────────────────
  // If the provider isn't mounted the defaults (isOnline:true, pendingActions:0,
  // isOfflineCapable:false) are safe — we just layer local detection on top.
  const offline = useOffline();

  const [localOnline, setLocalOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLocalOnline(navigator.onLine);

    const goOnline = () => setLocalOnline(true);
    const goOffline = () => setLocalOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Don't render during SSR to avoid hydration mismatch
  if (!mounted) return null;

  // Prefer context value when the provider is active
  const isOnline = offline.isOfflineCapable ? offline.isOnline : localOnline;
  const pending = offline.pendingActions;

  const label = isOnline
    ? 'Connected'
    : pending > 0
      ? `Offline — ${pending} pending`
      : 'Offline — changes will sync';

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-500 ${
        isOnline
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-amber-50 text-amber-600'
      }`}
      style={{
        border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
          }`}
          style={{ animationDuration: '2s' }}
        />
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            isOnline ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
