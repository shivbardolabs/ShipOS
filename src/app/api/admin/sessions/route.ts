import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/sessions
 * Returns recent login sessions across all users. Superadmin only.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const sessions = await prisma.loginSession.findMany({
      orderBy: { loginAt: 'desc' },
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            tenant: { select: { name: true } },
          },
        },
      },
    });

    const result = sessions.map((s) => ({
      id: s.id,
      loginAt: s.loginAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      user: {
        id: s.user.id,
        name: s.user.name,
        email: s.user.email,
        role: s.user.role,
        avatar: s.user.avatar,
        tenantName: s.user.tenant?.name ?? null,
      },
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/admin/sessions]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
