import { withApiHandler, validateQuery, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/customers
 * List customers with search, filtering, and pagination.
 * Query params: search?, status?, platform?, page?, limit?
 */

const QuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: z.string().optional(),
  platform: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApiHandler(async (request, { user }) => {
  const { search, status, platform, page, limit } = validateQuery(request, QuerySchema);
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
    deletedAt: null,
  };
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { pmbNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { businessName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { _count: { select: { packages: true, mailPieces: true, shipments: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  const serialized = customers.map((c) => ({
    ...c,
    dateOpened: c.dateOpened?.toISOString() ?? null,
    dateClosed: c.dateClosed?.toISOString() ?? null,
    renewalDate: c.renewalDate?.toISOString() ?? null,
    idExpiration: c.idExpiration?.toISOString() ?? null,
    passportExpiration: c.passportExpiration?.toISOString() ?? null,
    form1583Date: c.form1583Date?.toISOString() ?? null,
    lastRenewalNotice: c.lastRenewalNotice?.toISOString() ?? null,
    agreementSignedAt: c.agreementSignedAt?.toISOString() ?? null,
    smsConsentAt: c.smsConsentAt?.toISOString() ?? null,
    smsOptOutAt: c.smsOptOutAt?.toISOString() ?? null,
    crdUploadDate: c.crdUploadDate?.toISOString() ?? null,
    proofOfAddressDateOfIssue: c.proofOfAddressDateOfIssue?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    deletedAt: null,
    packageCount: c._count.packages,
    mailCount: c._count.mailPieces,
    shipmentCount: c._count.shipments,
    _count: undefined,
  }));

  return ok({ customers: serialized, total, page, limit });
});
