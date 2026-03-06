import { withApiHandler, validateQuery, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/packages
 * List packages with search, filtering, and pagination.
 * Query params: search?, status?, carrier?, page?, limit?
 */

const QuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.string().optional(),
  carrier: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApiHandler(async (request, { user }) => {
  const query = validateQuery(request, QuerySchema);
  const { search, status, carrier, page, limit } = query;
  const skip = (page - 1) * limit;

  const tenantScope = user.role !== 'superadmin' && user.tenantId
    ? { customer: { tenantId: user.tenantId } }
    : {};

  const where: Prisma.PackageWhereInput = { ...tenantScope };
  if (status) where.status = status;
  if (carrier) where.carrier = carrier;
  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      orderBy: { checkedInAt: 'desc' },
      skip,
      take: limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    }),
    prisma.package.count({ where }),
  ]);

  const serialized = packages.map((p) => ({
    ...p,
    checkedInAt: p.checkedInAt?.toISOString() ?? null,
    notifiedAt: p.notifiedAt?.toISOString() ?? null,
    releasedAt: p.releasedAt?.toISOString() ?? null,
    holdDeadline: p.holdDeadline?.toISOString() ?? null,
    carrierUploadedAt: p.carrierUploadedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return ok({ packages: serialized, total, page, limit });
});
