import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/audit-log
 *
 * Returns real AuditLog entries from Postgres, mapped to the
 * ActivityLogEntry shape the front-end expects.
 *
 * Query params:
 *   limit   – max rows (default 100, max 500)
 *   offset  – pagination offset
 *   category – filter by entity type (package, customer, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get('limit') || '100', 10))
    );
    const offset = Math.max(
      0,
      parseInt(searchParams.get('offset') || '0', 10)
    );
    const category = searchParams.get('category');

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const where: any = {};
    if (category) {
      where.entityType = category;
    }

    // Scope to same tenant (unless superadmin)
    if (user.role !== 'superadmin' && user.tenantId) {
      where.user = { tenantId: user.tenantId };
    }

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Map DB rows → ActivityLogEntry shape
    const entries = rows.map((row) => {
      const details = safeJsonParse(row.details);
      const oldData = safeJsonParse(row.oldData);
      const newData = safeJsonParse(row.newData);

      // Build human-readable description from details
      const description =
        details?.description ||
        buildDescription(row.action, row.entityType, details);

      // Build entity label
      const entityLabel =
        details?.trackingNumber ||
        details?.pmbNumber ||
        details?.alertTitle ||
        details?.program ||
        row.entityId;

      // Map DB action to UI ActionVerb format (underscore → dot)
      const action = normalizeAction(row.action);

      // Derive category from action or entityType
      const actionCategory = deriveCategoryFromAction(action, row.entityType);

      const metadata: Record<string, unknown> = { ...details };
      if (oldData) metadata.oldData = oldData;
      if (newData) metadata.newData = newData;
      // Remove description from metadata since it's a top-level field
      delete metadata.description;

      return {
        id: row.id,
        action,
        category: actionCategory,
        entityType: row.entityType,
        entityId: row.entityId,
        entityLabel,
        description,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        userId: row.user?.id || row.userId,
        userName: row.user?.name || 'System',
        userRole: row.user?.role || 'employee',
        userAvatar: row.user?.avatar || undefined,
        timestamp: row.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ entries, total, limit, offset });
  } catch (err) {
    console.error('[GET /api/audit-log]', err);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function safeJsonParse(str: string | null | undefined): Record<string, unknown> | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/** Normalize DB action strings to dot-separated ActionVerb format */
function normalizeAction(raw: string): string {
  // Already dot-separated (e.g. "package.release")
  if (raw.includes('.')) return raw;
  // Underscore-separated (e.g. "package_checkin" → "package.checkin")
  const idx = raw.indexOf('_');
  if (idx > 0) return raw.slice(0, idx) + '.' + raw.slice(idx + 1);
  // Fallback
  return raw;
}

/** Derive UI category from action or entityType */
function deriveCategoryFromAction(action: string, entityType: string): string {
  const prefix = action.split('.')[0];
  const validCategories = [
    'package', 'customer', 'mail', 'shipment', 'notification',
    'settings', 'user', 'loyalty', 'compliance', 'invoice',
    'report', 'auth', 'carrier_program', 'alert', 'sms',
  ];
  if (validCategories.includes(prefix)) return prefix;

  // Map entityType
  const entityMap: Record<string, string> = {
    package: 'package',
    customer: 'customer',
    mail: 'mail',
    shipment: 'shipment',
    notification: 'notification',
    tenant: 'settings',
    user: 'user',
    alert: 'notification',
    sms: 'notification',
    carrier_program_checkout: 'package',
    carrier_program_enrollment: 'settings',
    checkout_transaction: 'package',
    migration: 'settings',
  };
  return entityMap[entityType] || 'settings';
}

/** Build a human-readable description for actions without one */
function buildDescription(
  action: string,
  entityType: string,
  details: Record<string, unknown> | null
): string {
  const ACTION_DESCRIPTIONS: Record<string, (d: Record<string, unknown> | null) => string> = {
    package_checkin: (d) =>
      d?.customerName
        ? `Checked in ${d.carrier || ''} package for ${d.customerName} (${d.customerPmb || ''})`
        : 'Checked in package',
    'package.release': (d) =>
      d?.description as string || 'Released package(s)',
    'package.checkout_release': (d) =>
      d?.customerName
        ? `Released ${d.packageCount || ''} package(s) to ${d.customerName} (${d.pmbNumber || ''})`
        : 'Released package(s) via checkout',
    customer_provisioned: (d) =>
      d?.pmbNumber
        ? `Provisioned new customer ${d.pmbNumber}`
        : 'Provisioned new customer',
    branding_updated: () => 'Updated store branding settings',
    'settings.payment_methods_updated': () => 'Updated payment method settings',
    email_change_requested: (d) =>
      d?.newEmail
        ? `Requested email change to ${d.newEmail}`
        : 'Requested email change',
    email_changed: (d) =>
      d?.newEmail
        ? `Changed email to ${d.newEmail}`
        : 'Changed email address',
    LEGACY_MIGRATION: (d) =>
      d?.description as string || 'Imported legacy data',
    'carrier_program.package_intake': (d) =>
      d?.trackingNumber
        ? `Received ${d.carrierProgram || 'carrier program'} package ${d.trackingNumber}`
        : 'Received carrier program package',
    'carrier_program.package_checkout': (d) =>
      d?.trackingNumber
        ? `Checked out ${d.carrierProgram || 'carrier program'} package ${d.trackingNumber}`
        : 'Checked out carrier program package',
    'carrier_program.enrollment_updated': (d) =>
      d?.program
        ? `Updated ${d.program} enrollment: ${d.enabled ? 'enabled' : 'disabled'}`
        : 'Updated carrier program enrollment',
    'carrier_program.upload_batch': (d) =>
      `Uploaded batch: ${d?.uploaded || 0} succeeded, ${d?.failed || 0} failed`,
  };

  const fn = ACTION_DESCRIPTIONS[action];
  if (fn) return fn(details);

  // Fallback: humanize the action string
  const humanized = action
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${humanized} (${entityType})`;
}
