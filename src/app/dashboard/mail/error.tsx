'use client';

import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-error-50 border border-status-error-200 mb-4">
        <AlertTriangle className="h-7 w-7 text-status-error-600" />
      </div>
      <h2 className="text-lg font-semibold text-surface-100 mb-2">Something went wrong</h2>
      <p className="text-sm text-surface-400 mb-6 text-center max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="text-xs text-surface-600 mb-4 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <a href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-200 border border-surface-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

