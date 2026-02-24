'use client';

/**
 * usePermission — Client-side RBAC hook
 *
 * Checks if the current user has a specific permission based on their role.
 * Uses the centralized permission matrix from `src/lib/permissions.ts`.
 *
 * @example
 * ```tsx
 * const canManageUsers = usePermission('manage_users');
 * const { allowed, role } = usePermissionInfo('manage_users');
 * ```
 */

import { useTenant } from '@/components/tenant-provider';
import { hasPermission, type PermissionAction, type UserRole } from '@/lib/permissions';

/**
 * Returns true if the current user has the specified permission.
 */
export function usePermission(action: PermissionAction): boolean {
  const { localUser } = useTenant();
  if (!localUser?.role) return false;
  return hasPermission(localUser.role as UserRole, action);
}

/**
 * Returns detailed permission info including the user's role.
 */
export function usePermissionInfo(action: PermissionAction): {
  allowed: boolean;
  role: UserRole | null;
  loading: boolean;
} {
  const { localUser, loading } = useTenant();
  const role = (localUser?.role as UserRole) ?? null;
  const allowed = role ? hasPermission(role, action) : false;
  return { allowed, role, loading };
}
