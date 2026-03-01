import { withApiHandler, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/security/sessions
 * Returns login session history for the current user.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  const sessions = await prisma.loginSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return ok({ sessions });
});
