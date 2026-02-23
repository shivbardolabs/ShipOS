import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/users
 * Lists all users in the current tenant.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!me.tenantId) return NextResponse.json([], { status: 200 });

    const users = await prisma.user.findMany({
      where: { tenantId: me.tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PUT /api/users  (body: { userId, role })
 * Updates a user's role. Admin only.
 */
export async function PUT(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'admin' && me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    const { userId, role } = await req.json();

    if (!['admin', 'manager', 'employee'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Ensure target user belongs to same tenant
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.tenantId !== me.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
