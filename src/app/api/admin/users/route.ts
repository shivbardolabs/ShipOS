import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/* ── Shared serializer ──────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeUser(u: any) {
  return {
    id: u.id,
    auth0Id: u.auth0Id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status ?? 'active',
    avatar: u.avatar,
    deletedAt: u.deletedAt?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    loginCount: u.loginCount,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    tenant: u.tenant
      ? { id: u.tenant.id, name: u.tenant.name, slug: u.tenant.slug }
      : null,
    sessionCount: u._count?.loginSessions ?? 0,
  };
}

const USER_INCLUDE = {
  tenant: { select: { id: true, name: true, slug: true } },
  _count: { select: { loginSessions: true } },
} as const;

/**
 * GET /api/admin/users
 * Returns ALL users across ALL tenants. Superadmin only.
 *
 * Query params:
 *   includeDeleted — if "true", includes soft-deleted users (default: false)
 *   status         — filter by status: active | inactive | suspended
 */
export async function GET(request: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const statusFilter = searchParams.get('status');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // By default, filter out soft-deleted users unless includeDeleted=true
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Optional status filter
    if (statusFilter) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (validStatuses.includes(statusFilter)) {
        where.status = statusFilter;
      }
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { lastLoginAt: { sort: 'desc', nulls: 'last' } },
      include: USER_INCLUDE,
    });

    return NextResponse.json(users.map(serializeUser));
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role, tenant, status, or perform soft-delete/restore.
 * Superadmin only.
 *
 * Body:
 *   { userId: string, role?: string, tenantId?: string | null, status?: string }
 *   { userId: string, action: 'soft-delete' }
 *   { userId: string, action: 'restore' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, role, tenantId, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Validate the target user exists
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Handle soft-delete action ──────────────────────────────────────────
    if (action === 'soft-delete') {
      if (target.id === me.id) {
        return NextResponse.json({ error: 'Cannot soft-delete yourself' }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          status: 'inactive',
        },
        include: USER_INCLUDE,
      });

      return NextResponse.json(serializeUser(updated));
    }

    // ── Handle restore action ──────────────────────────────────────────────
    if (action === 'restore') {
      if (!target.deletedAt) {
        return NextResponse.json({ error: 'User is not deleted' }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: null,
          status: 'active',
        },
        include: USER_INCLUDE,
      });

      return NextResponse.json(serializeUser(updated));
    }

    // ── Standard update (role, tenantId, status) ───────────────────────────
    const data: Record<string, unknown> = {};

    // Role update
    if (role !== undefined) {
      const validRoles = ['superadmin', 'admin', 'manager', 'employee'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      data.role = role;
    }

    // Tenant assignment (null = unassign)
    if (tenantId !== undefined) {
      if (tenantId !== null) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }
      }
      data.tenantId = tenantId;
    }

    // Status update
    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status. Must be: active, inactive, or suspended' }, { status: 400 });
      }
      // Prevent self-deactivation
      if (target.id === me.id && status !== 'active') {
        return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: USER_INCLUDE,
    });

    return NextResponse.json(serializeUser(updated));
  } catch (err) {
    console.error('[PATCH /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
