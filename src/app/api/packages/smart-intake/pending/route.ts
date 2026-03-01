import { withApiHandler, validateQuery, validateBody, ok, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  GET /api/packages/smart-intake/pending                                    */
/*  List pending Smart Intake items with optional status / search filters.    */
/* -------------------------------------------------------------------------- */

const PendingQuerySchema = z.object({
  countOnly: z.enum(['true', 'false']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().max(200).optional(),
  batchId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApiHandler(async (request, { user }) => {
  const query = validateQuery(request, PendingQuerySchema);

  // BAR-337: Fast path for sidebar badge — just return the pending count
  if (query.countOnly === 'true') {
    const pendingCount = await prisma.smartIntakePending.count({
      where: {
        status: 'pending',
        ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });
    return ok({ count: pendingCount });
  }

  const { status, search, batchId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.SmartIntakePendingWhereInput = {};

  // Tenant scope
  if (user.role !== 'superadmin' && user.tenantId) {
    where.tenantId = user.tenantId;
  }

  if (status) where.status = status;
  if (batchId) where.batchId = batchId;

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: 'insensitive' } },
      { recipientName: { contains: search, mode: 'insensitive' } },
      { senderName: { contains: search, mode: 'insensitive' } },
      { carrier: { contains: search, mode: 'insensitive' } },
      { pmbNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.smartIntakePending.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.smartIntakePending.count({ where }),
  ]);

  // Serialize dates
  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
  }));

  // Compute status counts for filters
  const counts = await prisma.smartIntakePending.groupBy({
    by: ['status'],
    _count: { id: true },
    where: user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {},
  });

  const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const c of counts) {
    statusCounts[c.status] = c._count.id;
  }

  return ok({
    items: serialized,
    total,
    page,
    limit,
    statusCounts,
  });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/smart-intake/pending                                   */
/*  Create one or more pending items from a Smart Intake scan.                */
/* -------------------------------------------------------------------------- */

const PendingItemSchema = z.object({
  trackingNumber: z.string().optional(),
  carrier: z.string().default('other'),
  senderName: z.string().optional(),
  senderAddress: z.string().optional(),
  recipientName: z.string().optional(),
  pmbNumber: z.string().optional(),
  packageSize: z.string().optional(),
  serviceType: z.string().optional(),
  confidence: z.number().optional(),
  carrierConfidence: z.string().optional(),
  trackingNumberValid: z.boolean().optional(),
  recipientIsBusiness: z.boolean().optional(),
  labelImageUrl: z.string().optional(),
  rawExtraction: z.string().optional(),
});

const PendingCreateSchema = z.object({
  items: z.array(PendingItemSchema).min(1, 'No items provided'),
  batchId: z.string().optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  const { items, batchId } = await validateBody(request, PendingCreateSchema);

  const resolvedBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const created = await prisma.$transaction(
    items.map((item) =>
      prisma.smartIntakePending.create({
        data: {
          trackingNumber: item.trackingNumber || null,
          carrier: item.carrier || 'other',
          senderName: item.senderName || null,
          senderAddress: item.senderAddress || null,
          recipientName: item.recipientName || null,
          pmbNumber: item.pmbNumber || null,
          packageSize: item.packageSize || 'medium',
          serviceType: item.serviceType || null,
          confidence: item.confidence ?? 0,
          carrierConfidence: item.carrierConfidence || null,
          trackingNumberValid: item.trackingNumberValid ?? false,
          recipientIsBusiness: item.recipientIsBusiness ?? false,
          labelImageUrl: item.labelImageUrl || null,
          rawExtraction: item.rawExtraction || null,
          batchId: resolvedBatchId,
          tenantId: user.tenantId || null,
          status: 'pending',
        },
      })
    )
  );

  return ok({
    success: true,
    count: created.length,
    batchId: resolvedBatchId,
    items: created.map((c) => ({ id: c.id, status: c.status })),
  });
});
