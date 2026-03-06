import { withApiHandler, ok, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/sessions
 * Returns recent login sessions across all users. Superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
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

  return ok(result);
});
