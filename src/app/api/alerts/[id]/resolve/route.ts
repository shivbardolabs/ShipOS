import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const ResolveBodySchema = z.object({
  resolution: z.string().optional(),
});

/**
 * PATCH /api/alerts/[id]/resolve
 * Resolve an alert.
 *
 * SECURITY FIX: Now requires authentication, derives userId from session,
 * and scopes alert lookup to tenant.
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user, params }) => {
  const { id } = await params;
  const body = await validateBody(request, ResolveBodySchema);

  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: user.tenantId! },
  });

  if (!alert) return notFound('Alert not found');

  const updated = await prisma.alert.update({
    where: { id },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      acknowledgedBy: alert.acknowledgedBy ?? user.id,
      resolution: body.resolution ?? null,
    },
  });

  return ok({ alert: updated });
});
