/**
 * Activity Log Service — Tracks all user actions across ShipOS
 *
 * Persists to localStorage so actions survive page reloads.
 * In production this would write to the DB (AuditLog model).
 */

export type ActionCategory =
  | 'package'
  | 'customer'
  | 'mail'
  | 'shipment'
  | 'notification'
  | 'settings'
  | 'user'
  | 'loyalty'
  | 'compliance'
  | 'invoice'
  | 'report'
  | 'auth';

export type ActionVerb =
  // Package
  | 'package.check_in'
  | 'package.release'
  | 'package.update'
  | 'package.return'
  | 'package.labels_printed'
  // Customer
  | 'customer.create'
  | 'customer.update'
  | 'customer.suspend'
  | 'customer.reactivate'
  | 'customer.close'
  // Mail
  | 'mail.receive'
  | 'mail.insert'
  | 'mail.scan'
  | 'mail.forward'
  | 'mail.hold'
  | 'mail.discard'
  // Shipment
  | 'shipment.create'
  | 'shipment.ship'
  | 'shipment.deliver'
  | 'shipment.cancel'
  // Notification
  | 'notification.send'
  | 'notification.resend'
  // Settings
  | 'settings.update'
  | 'settings.carrier_rate_update'
  | 'settings.notification_config'
  // User
  | 'user.invite'
  | 'user.update_role'
  | 'user.deactivate'
  // Loyalty
  | 'loyalty.configure'
  | 'loyalty.reward_redeem'
  | 'loyalty.points_adjust'
  // Compliance
  | 'compliance.form1583_update'
  | 'compliance.id_verified'
  // Invoice
  | 'invoice.create'
  | 'invoice.send'
  | 'invoice.void'
  // Report
  | 'report.generate'
  | 'report.export'
  // Auth
  | 'auth.login'
  | 'auth.logout';

export interface ActivityLogEntry {
  id: string;
  /** Action verb, e.g. "package.check_in" */
  action: ActionVerb;
  /** High-level category for filtering */
  category: ActionCategory;
  /** Type of entity affected */
  entityType: string;
  /** ID of the entity affected */
  entityId: string;
  /** Human-readable label for the entity (e.g. "PKG TBA00000001" or "PMB-0003") */
  entityLabel?: string;
  /** Human-readable description of what happened */
  description: string;
  /** JSON-serializable metadata (old/new values, etc.) */
  metadata?: Record<string, unknown>;
  /** User who performed the action */
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  /** ISO timestamp */
  timestamp: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'shipos_activity_log';
const MAX_ENTRIES = 500; // Keep last 500 entries in localStorage

let _idCounter = 0;

function generateId(): string {
  _idCounter += 1;
  return `act_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

function categoryFromAction(action: ActionVerb): ActionCategory {
  return action.split('.')[0] as ActionCategory;
}

/* -------------------------------------------------------------------------- */
/*  Read / Write                                                              */
/* -------------------------------------------------------------------------- */

export function readLog(): ActivityLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLog(entries: ActivityLogEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only the most recent MAX_ENTRIES
    const trimmed = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — silently fail
  }
}

/* -------------------------------------------------------------------------- */
/*  Core API                                                                  */
/* -------------------------------------------------------------------------- */

export interface LogActionParams {
  action: ActionVerb;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  description: string;
  metadata?: Record<string, unknown>;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
}

/** Append a new action to the log and return the entry */
export function logAction(params: LogActionParams): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    id: generateId(),
    action: params.action,
    category: categoryFromAction(params.action),
    entityType: params.entityType,
    entityId: params.entityId,
    entityLabel: params.entityLabel,
    description: params.description,
    metadata: params.metadata,
    userId: params.userId,
    userName: params.userName,
    userRole: params.userRole,
    userAvatar: params.userAvatar,
    timestamp: new Date().toISOString(),
  };

  const existing = readLog();
  existing.unshift(entry); // newest first
  writeLog(existing);

  return entry;
}

/** Get the last action for a specific entity */
export function getLastActionForEntity(
  entityType: string,
  entityId: string
): ActivityLogEntry | null {
  const entries = readLog();
  return entries.find((e) => e.entityType === entityType && e.entityId === entityId) ?? null;
}

/** Get the last action matching a specific action verb */
export function getLastActionByVerb(action: ActionVerb): ActivityLogEntry | null {
  const entries = readLog();
  return entries.find((e) => e.action === action) ?? null;
}

/** Get all actions for a specific category */
export function getActionsByCategory(
  category: ActionCategory,
  limit = 50
): ActivityLogEntry[] {
  return readLog()
    .filter((e) => e.category === category)
    .slice(0, limit);
}

/** Get all actions by a specific user */
export function getActionsByUser(userId: string, limit = 50): ActivityLogEntry[] {
  return readLog()
    .filter((e) => e.userId === userId)
    .slice(0, limit);
}

/** Get all recent actions */
export function getRecentActions(limit = 20): ActivityLogEntry[] {
  return readLog().slice(0, limit);
}

/** Clear all log entries (for testing) */
export function clearLog() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/* -------------------------------------------------------------------------- */
/*  Human-friendly labels                                                     */
/* -------------------------------------------------------------------------- */

export const ACTION_LABELS: Record<ActionVerb, string> = {
  'package.check_in': 'Checked in package',
  'package.release': 'Released package',
  'package.update': 'Updated package',
  'package.return': 'Returned package',
  'package.labels_printed': 'Printed label batch',
  'customer.create': 'Created customer',
  'customer.update': 'Updated customer',
  'customer.suspend': 'Suspended customer',
  'customer.reactivate': 'Reactivated customer',
  'customer.close': 'Closed customer account',
  'mail.receive': 'Received mail',
  'mail.insert': 'Inserted mail',
  'mail.scan': 'Scanned mail',
  'mail.forward': 'Forwarded mail',
  'mail.hold': 'Held mail',
  'mail.discard': 'Discarded mail',
  'shipment.create': 'Created shipment',
  'shipment.ship': 'Shipped package',
  'shipment.deliver': 'Marked delivered',
  'shipment.cancel': 'Cancelled shipment',
  'notification.send': 'Sent notification',
  'notification.resend': 'Resent notification',
  'settings.update': 'Updated settings',
  'settings.carrier_rate_update': 'Updated carrier rates',
  'settings.notification_config': 'Updated notification config',
  'user.invite': 'Invited user',
  'user.update_role': 'Updated user role',
  'user.deactivate': 'Deactivated user',
  'loyalty.configure': 'Configured loyalty program',
  'loyalty.reward_redeem': 'Redeemed loyalty reward',
  'loyalty.points_adjust': 'Adjusted loyalty points',
  'compliance.form1583_update': 'Updated Form 1583',
  'compliance.id_verified': 'Verified customer ID',
  'invoice.create': 'Created invoice',
  'invoice.send': 'Sent invoice',
  'invoice.void': 'Voided invoice',
  'report.generate': 'Generated report',
  'report.export': 'Exported report',
  'auth.login': 'Logged in',
  'auth.logout': 'Logged out',
};

export const CATEGORY_LABELS: Record<ActionCategory, string> = {
  package: 'Packages',
  customer: 'Customers',
  mail: 'Mail',
  shipment: 'Shipping',
  notification: 'Notifications',
  settings: 'Settings',
  user: 'Users',
  loyalty: 'Loyalty',
  compliance: 'Compliance',
  invoice: 'Invoicing',
  report: 'Reports',
  auth: 'Authentication',
};
