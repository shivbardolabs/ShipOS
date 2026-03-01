import { withApiHandler, ok, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/alerts/[id]
 * Get a single alert by ID.
 *
 * SECURITY FIX: Now requires authentication and scopes to tenant.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const { id } = await params;

  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: user.tenantId! },
  });

  if (!alert) return notFound('Alert not found');

  return ok({ alert });
});
