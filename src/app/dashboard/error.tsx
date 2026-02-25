'use client';

/**
 * Error boundary for the entire dashboard.
 *
 * Catches unhandled client-side exceptions and displays an actionable
 * error message with details visible in console for PostHog session replay.
 */

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, LogOut } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl mb-6"
        style={{ background: 'rgba(239, 68, 68, 0.1)' }}
      >
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <h2 className="text-xl font-bold text-surface-200 mb-2">
        Something went wrong
      </h2>
      <p className="text-surface-400 max-w-lg mb-6">
        An unexpected error occurred. This may be temporary — try refreshing the
        page or signing back in.
      </p>

      {/* Error details */}
      <details className="w-full max-w-lg mb-6 text-left">
        <summary className="text-xs font-medium text-surface-500 cursor-pointer hover:text-surface-300 transition-colors">
          Error details
        </summary>
        <div className="mt-2 p-3 rounded-lg border border-surface-700 bg-surface-900 overflow-auto max-h-40">
          <p className="text-xs font-mono text-red-400 whitespace-pre-wrap break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-[10px] text-surface-600 mt-1">
              Digest: {error.digest}
            </p>
          )}
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
        <a
          href="/api/auth/logout"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-surface-300 bg-surface-800 hover:bg-surface-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </a>
      </div>
    </div>
  );
}
