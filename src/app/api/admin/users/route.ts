import { NextResponse } from 'next/server';
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
