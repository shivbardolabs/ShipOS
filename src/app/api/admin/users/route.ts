import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/users
 * Returns ALL users across ALL tenants. Superadmin only.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { lastLoginAt: { sort: 'desc', nulls: 'last' } },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { loginSessions: true },
        },
      },
    });

    const result = users.map((u) => ({
      id: u.id,
      auth0Id: u.auth0Id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      loginCount: u.loginCount,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      tenant: u.tenant
        ? { id: u.tenant.id, name: u.tenant.name, slug: u.tenant.slug }
        : null,
      sessionCount: u._count.loginSessions,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role and/or tenant assignment. Superadmin only.
 * Body: { userId: string, role?: string, tenantId?: string | null }
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { userId, role, tenantId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Validate the target user exists
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build update payload
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

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { loginSessions: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      auth0Id: updated.auth0Id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.avatar,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      loginCount: updated.loginCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      tenant: updated.tenant
        ? { id: updated.tenant.id, name: updated.tenant.name, slug: updated.tenant.slug }
        : null,
      sessionCount: updated._count.loginSessions,
    });
  } catch (err) {
    console.error('[PATCH /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
