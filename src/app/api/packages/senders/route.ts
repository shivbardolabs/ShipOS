import { withApiHandler, validateQuery, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/**
 * GET /api/packages/senders?q=xxx&limit=8
 *
 * Returns distinct sender names from previously checked-in packages
 * for the current tenant. Used for sender name autocomplete in
 * Package Check-In Step 2 (BAR-239).
 */

const QuerySchema = z.object({
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const GET = withApiHandler(async (request, { user }) => {
  const { q, limit } = validateQuery(request, QuerySchema);
  const query = q?.trim() || '';

  // Get distinct sender names from packages in this tenant's stores
  const senders = await prisma.package.findMany({
    where: {
      senderName: query
        ? { contains: query, mode: 'insensitive', not: null }
        : { not: null },
      customer: { tenantId: user.tenantId! },
    },
    select: { senderName: true },
    distinct: ['senderName'],
    orderBy: { checkedInAt: 'desc' },
    take: limit,
  });

  return ok({
    senders: senders
      .map((s) => s.senderName)
      .filter((name): name is string => !!name),
  });
});
