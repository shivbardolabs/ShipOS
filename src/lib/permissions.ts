/**
 * Role-Based Access Control (RBAC) — Permission Matrix
 *
 * Defines which roles can perform which actions across ShipOS.
 * Used by both client-side `usePermission()` hook and server-side
 * `checkPermission()` for API route guards.
 *
 * Roles (highest → lowest):
 *   superadmin → admin → manager → employee
 *
 * Actions follow a `domain:verb` pattern for clarity.
 */

/* ── Action definitions ───────────────────────────────────────────────────── */

export type PermissionAction =
  // User management
  | 'manage_users'
  | 'invite_users'
  | 'deactivate_users'
  | 'update_user_roles'
  // Tenant / settings
  | 'manage_settings'
  | 'manage_billing'
  | 'manage_tenant_status'
  // Customer operations
  | 'view_customers'
  | 'create_customers'
  | 'update_customers'
  | 'delete_customers'
  | 'manage_compliance'
  // Package operations
  | 'view_packages'
  | 'check_in_packages'
  | 'check_out_packages'
  | 'update_packages'
  // Mail operations
  | 'view_mail'
  | 'manage_mail'
  // Shipping
  | 'view_shipping'
  | 'create_shipments'
  | 'manage_shipping'
  // Financial
  | 'view_invoices'
  | 'manage_invoices'
  | 'view_reports'
  | 'export_reports'
  | 'manage_pricing'
  // Notifications
  | 'send_notifications'
  | 'manage_notification_config'
  // Loyalty
  | 'view_loyalty'
  | 'manage_loyalty'
  // Activity / Audit
  | 'view_activity_log'
  // Feature flags (superadmin only)
  | 'manage_feature_flags'
  // Platform admin
  | 'view_admin_panel'
  | 'manage_tenants';

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'employee';

/* ── Permission matrix ────────────────────────────────────────────────────── */

/**
 * Maps each role to the set of actions it is allowed to perform.
 * Superadmin inherits everything from admin, admin from manager, etc.
 * We define them explicitly for clarity and auditability.
 */
const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<PermissionAction>> = {
  superadmin: new Set<PermissionAction>([
    // Everything an admin can do, plus platform-level actions
    'manage_users', 'invite_users', 'deactivate_users', 'update_user_roles',
    'manage_settings', 'manage_billing', 'manage_tenant_status',
    'view_customers', 'create_customers', 'update_customers', 'delete_customers', 'manage_compliance',
    'view_packages', 'check_in_packages', 'check_out_packages', 'update_packages',
    'view_mail', 'manage_mail',
    'view_shipping', 'create_shipments', 'manage_shipping',
    'view_invoices', 'manage_invoices', 'view_reports', 'export_reports', 'manage_pricing',
    'send_notifications', 'manage_notification_config',
    'view_loyalty', 'manage_loyalty',
    'view_activity_log',
    'manage_feature_flags',
    'view_admin_panel', 'manage_tenants',
  ]),

  admin: new Set<PermissionAction>([
    'manage_users', 'invite_users', 'deactivate_users', 'update_user_roles',
    'manage_settings', 'manage_billing',
    'view_customers', 'create_customers', 'update_customers', 'delete_customers', 'manage_compliance',
    'view_packages', 'check_in_packages', 'check_out_packages', 'update_packages',
    'view_mail', 'manage_mail',
    'view_shipping', 'create_shipments', 'manage_shipping',
    'view_invoices', 'manage_invoices', 'view_reports', 'export_reports', 'manage_pricing',
    'send_notifications', 'manage_notification_config',
    'view_loyalty', 'manage_loyalty',
    'view_activity_log',
  ]),

  manager: new Set<PermissionAction>([
    'invite_users',
    'view_customers', 'create_customers', 'update_customers', 'manage_compliance',
    'view_packages', 'check_in_packages', 'check_out_packages', 'update_packages',
    'view_mail', 'manage_mail',
    'view_shipping', 'create_shipments', 'manage_shipping',
    'view_invoices', 'view_reports', 'export_reports',
    'send_notifications',
    'view_loyalty',
    'view_activity_log',
  ]),

  employee: new Set<PermissionAction>([
    'view_customers', 'create_customers', 'update_customers',
    'view_packages', 'check_in_packages', 'check_out_packages',
    'view_mail',
    'view_shipping', 'create_shipments',
    'view_invoices',
    'send_notifications',
    'view_loyalty',
    'view_activity_log',
  ]),
};

/* ── Public API ───────────────────────────────────────────────────────────── */

/**
 * Check if a given role has a specific permission.
 * @param role  — The user's role
 * @param action — The permission action to check
 * @returns true if the role is authorized for this action
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.has(action) : false;
}

/**
 * Get all permissions for a role.
 * Useful for displaying a permissions overview in admin panels.
 */
export function getPermissionsForRole(role: UserRole): PermissionAction[] {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? Array.from(perms) : [];
}

/**
 * Server-side permission check. Throws a structured error if denied.
 * Use in API route handlers.
 *
 * @example
 * ```ts
 * const me = await getOrProvisionUser();
 * checkPermission(me.role, 'manage_users');
 * // If we get here, user is authorized
 * ```
 */
export function checkPermission(role: string | undefined, action: PermissionAction): void {
  if (!role || !hasPermission(role as UserRole, action)) {
    const error = new Error(`Permission denied: ${action}`);
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }
}

/**
 * Human-readable labels for each action — used in admin permission overview.
 */
export const ACTION_LABELS: Record<PermissionAction, string> = {
  manage_users: 'Manage Users',
  invite_users: 'Invite Users',
  deactivate_users: 'Deactivate Users',
  update_user_roles: 'Update User Roles',
  manage_settings: 'Manage Settings',
  manage_billing: 'Manage Billing',
  manage_tenant_status: 'Manage Tenant Status',
  view_customers: 'View Customers',
  create_customers: 'Create Customers',
  update_customers: 'Update Customers',
  delete_customers: 'Delete Customers',
  manage_compliance: 'Manage Compliance',
  view_packages: 'View Packages',
  check_in_packages: 'Check In Packages',
  check_out_packages: 'Check Out Packages',
  update_packages: 'Update Packages',
  view_mail: 'View Mail',
  manage_mail: 'Manage Mail',
  view_shipping: 'View Shipping',
  create_shipments: 'Create Shipments',
  manage_shipping: 'Manage Shipping',
  view_invoices: 'View Invoices',
  manage_invoices: 'Manage Invoices',
  view_reports: 'View Reports',
  export_reports: 'Export Reports',
  manage_pricing: 'Manage Pricing',
  send_notifications: 'Send Notifications',
  manage_notification_config: 'Manage Notification Config',
  view_loyalty: 'View Loyalty',
  manage_loyalty: 'Manage Loyalty',
  view_activity_log: 'View Activity Log',
  manage_feature_flags: 'Manage Feature Flags',
  view_admin_panel: 'View Admin Panel',
  manage_tenants: 'Manage Tenants',
};
