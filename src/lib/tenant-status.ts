/**
 * Tenant Status Constants & Helpers — BAR-399
 *
 * Centralised definitions for the tenant lifecycle state machine.
 *
 * State transitions:
 *   pending_approval → active (manual approve) or rejected
 *   pending_approval → trial  (auto-approve with trial)
 *   trial            → active (trial converts)
 *   active          ↔ paused  (voluntary / billing)
 *   active           → suspended (STAFF hold)
 *   active           → disabled  (payment failed, grace expired)
 *   paused           → active  (reactivated)
 *   suspended        → active  (STAFF lifts hold)
 *   disabled         → active  (payment resolved)
 *   any              → closed  (permanent)
 */

/* ── Status Enum ──────────────────────────────────────────────────────────── */

export const TENANT_STATUSES = [
  'pending_approval',
  'active',
  'trial',
  'paused',
  'suspended',
  'disabled',
  'closed',
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

/* ── Labels & Metadata ────────────────────────────────────────────────────── */

export const TENANT_STATUS_META: Record<
  TenantStatus,
  { label: string; color: string; description: string; badgeVariant: string }
> = {
  pending_approval: {
    label: 'Pending Approval',
    color: '#F59E0B',
    description: 'Sign-up submitted, awaiting activation',
    badgeVariant: 'warning',
  },
  active: {
    label: 'Active',
    color: '#10B981',
    description: 'Fully operational, billing current',
    badgeVariant: 'success',
  },
  trial: {
    label: 'Trial',
    color: '#6366F1',
    description: 'In free trial period',
    badgeVariant: 'info',
  },
  paused: {
    label: 'Paused',
    color: '#F59E0B',
    description: 'Temporarily suspended (voluntary or payment), data preserved',
    badgeVariant: 'warning',
  },
  suspended: {
    label: 'Suspended',
    color: '#EF4444',
    description: 'STAFF-initiated hold (compliance, investigation)',
    badgeVariant: 'error',
  },
  disabled: {
    label: 'Disabled',
    color: '#EF4444',
    description: 'Payment failed, grace period expired',
    badgeVariant: 'error',
  },
  closed: {
    label: 'Closed',
    color: '#6B7280',
    description: 'Account permanently closed',
    badgeVariant: 'muted',
  },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Statuses that allow normal dashboard access */
export const ACTIVE_STATUSES: TenantStatus[] = ['active', 'trial'];

/** Statuses visible in the approval queue */
export const PENDING_STATUSES: TenantStatus[] = ['pending_approval'];

/** Returns true if the tenant can access the dashboard normally */
export function isTenantOperational(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as TenantStatus);
}

/** Returns true if this is a valid tenant status value */
export function isValidTenantStatus(status: string): status is TenantStatus {
  return TENANT_STATUSES.includes(status as TenantStatus);
}
