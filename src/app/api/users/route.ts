import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, type UserRole } from '@/lib/permissions';

/**
 * GET /api/users
 * Lists all active (non-deleted) users in the current tenant.
 * Includes status field for user lifecycle management.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!me.tenantId) return NextResponse.json([], { status: 200 });

    const users = await prisma.user.findMany({
      where: {
        tenantId: me.tenantId,
        deletedAt: null, // Filter out soft-deleted users
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
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
 * PUT /api/users  (body: { userId, role?, status? })
 * Updates a user's role and/or status. Admin only.
 */
export async function PUT(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // RBAC permission check — manage_users required for role/status changes
    if (!hasPermission(me.role as UserRole, 'manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId, role, status } = await req.json();

    // Validate role if provided
    if (role && !['admin', 'manager', 'employee'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Ensure target user belongs to same tenant and is not deleted
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.tenantId !== me.tenantId || target.deletedAt !== null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-deactivation
    if (userId === me.id && status && status !== 'active') {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
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

/**
 * DELETE /api/users  (body: { userId })
 * Soft-deletes a user (sets deletedAt). Admin only.
 * User is filtered from all queries but data is preserved.
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // RBAC permission check — deactivate_users required for soft delete
    if (!hasPermission(me.role as UserRole, 'deactivate_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId } = await req.json();

    // Cannot soft-delete yourself
    if (userId === me.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Ensure target user belongs to same tenant
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.tenantId !== me.tenantId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft delete — set deletedAt and mark as inactive
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'inactive',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/users]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
