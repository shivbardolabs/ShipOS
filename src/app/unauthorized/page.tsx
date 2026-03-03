'use client';

import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';

/* eslint-disable @next/next/no-html-link-for-pages */

/**
 * Unauthorized page — shown when a non-@bardolabs.ai user attempts to access
 * the Platform Console at platform.shipospro.com.
 *
 * Provides a clear message and links to log out or return to the main app.
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4 relative overflow-hidden">
      {/* Ambient background orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
        style={{ background: 'rgba(225, 29, 72, 0.04)', filter: 'blur(100px)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
        style={{ background: 'rgba(225, 29, 72, 0.03)', filter: 'blur(80px)' }}
      />

      <div className="relative max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(225, 29, 72, 0.1)' }}
          >
            <ShieldX className="h-10 w-10 text-red-500" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-surface-100 mb-3">Access Denied</h1>
        <p className="text-surface-400 mb-2">
          The Platform Console is restricted to authorized Bardo Labs team members.
        </p>
        <p className="text-surface-500 text-sm mb-8">
          If you believe you should have access, contact your administrator.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://app.shipospro.com/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-surface-200 border border-surface-700 hover:bg-surface-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Dashboard
          </a>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </a>
        </div>
      </div>
    </div>
  );
}
