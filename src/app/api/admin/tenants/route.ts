import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/tenants
 * Returns ALL tenants. Superadmin only.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { users: true },
        },
      },
    });

    const result = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      userCount: t._count.users,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/admin/tenants]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
