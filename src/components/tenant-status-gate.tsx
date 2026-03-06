'use client';

/**
 * Tenant Status Gate — BAR-399
 *
 * Blocks dashboard access for tenants that are not in an operational state.
 * Only `active` and `trial` tenants pass through to the dashboard.
 * All other statuses show a full-screen message explaining the situation.
 */

import { useTenant } from '@/components/tenant-provider';
import {
  AlertTriangle,
  PauseCircle,
  XCircle,
  Mail,
  Clock,
  ShieldAlert,
  Lock,
} from 'lucide-react';

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

  // Pending approval — show "under review" message
  if (tenantStatus === 'pending_approval') {
    return (
      <StatusScreen
        icon={Clock}
        iconBg="color-mix(in srgb, var(--color-primary-500) 10%, transparent)"
        iconColor="text-primary-500"
        title="Application Under Review"
        description="Thank you for signing up! Your application is being reviewed by our team. You&rsquo;ll receive an email once your account is approved and ready to use."
        hint="This usually takes less than 24 hours."
        hintIcon={Clock}
        hintColor="text-primary-400"
      />
    );
  }

  // Paused tenant — show warning
  if (tenantStatus === 'paused') {
    return (
      <StatusScreen
        icon={PauseCircle}
        iconBg="color-mix(in srgb, var(--color-status-warning-500) 10%, transparent)"
        iconColor="text-status-warning-500"
        title="Account Paused"
        description="Your account has been temporarily paused. This may be due to a billing issue or an administrative action. Your data is safe and will be available once the account is reactivated."
        hint="Contact your administrator or support to reactivate your account."
        hintIcon={AlertTriangle}
        hintColor="text-status-warning-400"
      />
    );
  }

  // Suspended — STAFF-initiated hold
  if (tenantStatus === 'suspended') {
    return (
      <StatusScreen
        icon={ShieldAlert}
        iconBg="color-mix(in srgb, var(--color-status-error-500) 10%, transparent)"
        iconColor="text-status-error-500"
        title="Account Suspended"
        description="Your account has been suspended by our team pending review. Access to the dashboard and all features is temporarily unavailable."
        hint="If you believe this is an error, please contact support immediately."
        hintIcon={AlertTriangle}
        hintColor="text-status-error-400"
      />
    );
  }

  // Closed — permanently closed
  if (tenantStatus === 'closed') {
    return (
      <StatusScreen
        icon={Lock}
        iconBg="color-mix(in srgb, var(--color-surface-500) 10%, transparent)"
        iconColor="text-surface-400"
        title="Account Closed"
        description="This account has been permanently closed. If you need to access your data or have questions about your account, please contact support."
        hint={null}
        hintIcon={null}
        hintColor={null}
      />
    );
  }

  // Disabled (payment failed) or any other non-active status — show error
  return (
    <StatusScreen
      icon={XCircle}
      iconBg="color-mix(in srgb, var(--color-status-error-500) 10%, transparent)"
      iconColor="text-status-error-500"
      title="Account Disabled"
      description="Your account has been disabled. Access to the dashboard and all features is currently unavailable. If you believe this is an error, please contact support."
      hint={null}
      hintIcon={null}
      hintColor={null}
    />
  );
}

/* ── Shared Status Screen ─────────────────────────────────────────────────── */

function StatusScreen({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  hint,
  hintIcon: HintIcon,
  hintColor,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  hint: string | null;
  hintIcon: React.ElementType | null;
  hintColor: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: iconBg }}
          >
            <Icon className={`h-10 w-10 ${iconColor}`} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-surface-100 mb-3">{title}</h1>
        <p className="text-surface-400 mb-6">{description}</p>
        {hint && HintIcon && hintColor && (
          <div className="rounded-xl border border-surface-700/50 bg-surface-900/50 p-4 mb-6">
            <div className={`flex items-center gap-2 text-sm ${hintColor}`}>
              <HintIcon className="h-4 w-4 shrink-0" />
              <span>{hint}</span>
            </div>
          </div>
        )}
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
