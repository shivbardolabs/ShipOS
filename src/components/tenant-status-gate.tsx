'use client';

/**
 * Tenant Status Gate — Blocks access for paused/disabled tenants
 *
 * When a tenant is paused or disabled by the superadmin, this component
 * shows a full-screen message instead of the dashboard content.
 * Active and trial tenants pass through normally.
 */

import { useTenant } from '@/components/tenant-provider';
import { AlertTriangle, PauseCircle, XCircle, Mail } from 'lucide-react';

export function TenantStatusGate({ children }: { children: React.ReactNode }) {
  const { localUser, loading } = useTenant();

  // Don't block while loading
  if (loading || !localUser) return <>{children}</>;

  // Superadmin always has access (needs to manage tenants)
  if (localUser.role === 'superadmin') return <>{children}</>;

  const tenantStatus = localUser.tenant?.status ?? 'active';

  // Active and trial tenants pass through
  if (tenantStatus === 'active' || tenantStatus === 'trial') {
    return <>{children}</>;
  }

  // Paused tenant — show warning
  if (tenantStatus === 'paused') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
              <PauseCircle className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-surface-100 mb-3">Account Paused</h1>
          <p className="text-surface-400 mb-6">
            Your account has been temporarily paused. This may be due to a billing issue or
            an administrative action. Your data is safe and will be available once the account
            is reactivated.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Contact your administrator or support to reactivate your account.</span>
            </div>
          </div>
          <a
            href="mailto:support@bardolabs.ai"
            className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  // Disabled tenant — show error
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-surface-100 mb-3">Account Disabled</h1>
        <p className="text-surface-400 mb-6">
          Your account has been disabled. Access to the dashboard and all features is
          currently unavailable. If you believe this is an error, please contact support.
        </p>
        <a
          href="mailto:support@bardolabs.ai"
          className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-400 text-sm font-medium transition-colors"
        >
          <Mail className="h-4 w-4" />
          Contact Support
        </a>
      </div>
    </div>
  );
}
