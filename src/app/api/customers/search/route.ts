import { withApiHandler, validateQuery, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/customers/search?q=xxx&mode=pmb|name|phone|company|name_company&limit=10
 *
 * Searches active customers within the current tenant.
 * Used by the Package Check-In wizard (Step 1) with unified auto-detect search (BAR-324).
 * The `name_company` mode searches first name, last name, and business name simultaneously.
 */

const SearchQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
  mode: z.enum(['pmb', 'name', 'phone', 'company', 'name_company', 'general']).optional().default('pmb'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const GET = withApiHandler(async (request, { user }) => {
  const { q: rawQuery, mode, limit } = validateQuery(request, SearchQuerySchema);
  const query = rawQuery.trim();

  // Build where clause based on search mode
  const where: Prisma.CustomerWhereInput = {
    tenantId: user.tenantId!,
    status: 'active',
    deletedAt: null,
  };

  if (query) {
    switch (mode) {
      case 'pmb':
        where.pmbNumber = { contains: query, mode: 'insensitive' };
        break;
      case 'name':
        where.OR = [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ];
        break;
      case 'phone':
        where.phone = { contains: query.replace(/[^0-9]/g, '') };
        break;
      case 'company':
        where.businessName = { contains: query, mode: 'insensitive' };
        break;
      case 'name_company':
        // BAR-324: Unified search — Name + Company simultaneously
        where.OR = [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { businessName: { contains: query, mode: 'insensitive' } },
        ];
        break;
      default:
        // General search across all fields
        where.OR = [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { pmbNumber: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { businessName: { contains: query, mode: 'insensitive' } },
        ];
    }
  }

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      businessName: true,
      pmbNumber: true,
      platform: true,
      status: true,
      notifyEmail: true,
      notifySms: true,
      _count: {
        select: {
          packages: { where: { status: { in: ['checked_in', 'notified', 'ready'] } } },
        },
      },
    },
    orderBy: [{ pmbNumber: 'asc' }],
    take: limit,
  });

  return ok({
    customers: customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      businessName: c.businessName,
      pmbNumber: c.pmbNumber,
      platform: c.platform,
      status: c.status,
      notifyEmail: c.notifyEmail,
      notifySms: c.notifySms,
      activePackageCount: c._count.packages,
    })),
  });
});
