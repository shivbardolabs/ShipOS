import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const GetNotificationsQuerySchema = z.object({
  customerId: z.string().optional(),
  channel: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * GET /api/notifications
 * List notifications for the tenant with filtering and pagination.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetNotificationsQuerySchema);
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.NotificationWhereInput = {
    customer: { tenantId: user.tenantId! },
  };
  if (query.customerId) where.customerId = query.customerId;
  if (query.channel) where.channel = query.channel;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return ok({ notifications, total, page: query.page, limit: query.limit });
});
