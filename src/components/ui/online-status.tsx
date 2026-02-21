'use client';

import { useState, useEffect } from 'react';

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Don't render during SSR to avoid hydration mismatch
  if (!mounted) return null;

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
      <span className="hidden sm:inline">
        {isOnline ? 'Connected' : 'Offline — changes will sync'}
      </span>
    </div>
  );
}
