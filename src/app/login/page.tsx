'use client';

import { useEffect } from 'react';

/* Auth0 routes require full-page redirects — <a> is intentional */
/* eslint-disable @next/next/no-html-link-for-pages */

export default function LoginPage() {
  useEffect(() => {
    // Redirect to Auth0 Universal Login
    window.location.href = '/api/auth/login';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Ambient indigo orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.05)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.03)', filter: 'blur(80px)' }} />

      <div className="relative z-10 w-full max-w-md px-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shipos-logo-mark.svg"
            alt="ShipOS"
            width={56}
            height={56}
            className="mb-4 rounded-2xl"
          />
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-surface-100">Ship</span>
            <span className="text-3xl font-bold text-primary-500">OS</span>
          </div>
          <p className="text-sm text-surface-500 mt-1">Postal Management System</p>
        </div>

        {/* Loading state while redirecting */}
        <div className="rounded-2xl p-8 shadow-2xl shadow-slate-200/30 dark:shadow-slate-900/40 layout-card-surface">
          <div className="flex flex-col items-center gap-4">
            <svg className="h-6 w-6 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-surface-400">Redirecting to sign in…</p>
          </div>
        </div>

        {/* Manual fallback links */}
        <div className="mt-6 space-y-2">
          <a
            href="/api/auth/login"
            className="block text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Click here if not redirected →
          </a>
          <p className="text-xs text-surface-600">
            Don&apos;t have an account?{' '}
            <a href="/api/auth/signup" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
