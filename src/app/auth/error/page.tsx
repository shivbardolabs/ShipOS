'use client';

/* eslint-disable @next/next/no-html-link-for-pages */

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    access_denied: 'Access was denied. You may not have permission to access this application.',
    login_required: 'Your session has expired. Please sign in again.',
    consent_required: 'Additional consent is required to continue.',
    interaction_required: 'Additional interaction is required. Please try signing in again.',
    invalid_request: 'The authentication request was invalid. Please try again.',
    unauthorized: 'You are not authorized to access this resource.',
  };

  const message = error
    ? errorMessages[error] || 'An unexpected error occurred during authentication.'
    : 'An unexpected error occurred during authentication.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shipos-logo-mark.svg"
            alt="ShipOS"
            width={48}
            height={48}
            className="mb-4 rounded-xl"
          />
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold text-surface-100">Ship</span>
            <span className="text-2xl font-bold text-primary-500">OS</span>
          </div>
        </div>

        {/* Error card */}
        <div className="glass-card p-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-200">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>

          <h1 className="text-lg font-semibold text-surface-100 mb-2">
            Authentication Error
          </h1>
          <p className="text-sm text-surface-400 mb-6">
            {message}
          </p>

          {error && (
            <p className="text-xs text-surface-600 mb-6 font-mono bg-surface-900 rounded-lg px-3 py-2">
              Error code: {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <a
              href="/api/auth/login"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </a>
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-surface-400 hover:text-surface-200 transition-colors"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </a>
          </div>
        </div>

        <p className="text-xs text-surface-600 mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="h-8 w-8 animate-spin text-primary-600">
          <svg viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
