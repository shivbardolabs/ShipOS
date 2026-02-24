import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission, type UserRole } from '@/lib/permissions';

/**
 * GET /api/admin/tenants
 * Returns ALL tenants with status info. Superadmin only.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // RBAC permission check — manage_tenants required for status changes
    if (!hasPermission(me.role as UserRole, 'manage_tenants')) {
      return NextResponse.json({ error: 'Insufficient permissions — superadmin required' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscriptionTier: true,
        trialEndsAt: true,
        createdAt: true,
        _count: {
          select: { users: true },
        },
      },
    });

    const result = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      subscriptionTier: t.subscriptionTier,
      trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      userCount: t._count.users,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/admin/tenants]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/tenants  (body: { tenantId, status })
 * Updates a tenant's status. Superadmin only.
 * Valid statuses: active, paused, disabled, trial
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { tenantId, status } = await req.json();

    if (!tenantId || !status) {
      return NextResponse.json({ error: 'tenantId and status are required' }, { status: 400 });
    }

    const validStatuses = ['active', 'paused', 'disabled', 'trial'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscriptionTier: true,
        trialEndsAt: true,
        createdAt: true,
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      subscriptionTier: tenant.subscriptionTier,
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      createdAt: tenant.createdAt.toISOString(),
      userCount: tenant._count.users,
    });
  } catch (err) {
    console.error('[PATCH /api/admin/tenants]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
