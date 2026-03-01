import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, ok, badRequest } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/* ── Schema ─────────────────────────────────────────────────────────────────── */

const QuerySchema = z.object({
  all: z.enum(['true', 'false']).optional(),
  tenantId: z.string().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format').optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * GET /api/billing/invoices
 *
 * Returns payment history / invoices.
 *
 * - Super admin: can view all tenants' invoices (pass ?all=true or ?tenantId=xxx)
 * - Client admin: sees only their own tenant's invoices
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const query = validateQuery(request, QuerySchema);
  const isSuperAdmin = user.role === 'superadmin';

  // Build where clause
  const where: Prisma.PaymentRecordWhereInput = {};

  if (isSuperAdmin && query.all === 'true') {
    // Super admin sees all
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }
  } else if (isSuperAdmin && query.tenantId) {
    where.tenantId = query.tenantId;
  } else {
    // Client admin — own tenant only
    where.tenantId = user.tenantId;
  }

  if (query.period) {
    where.billingPeriod = query.period;
  }

  const payments = await prisma.paymentRecord.findMany({
    where,
    include: isSuperAdmin
      ? { tenant: { select: { id: true, name: true, slug: true } } }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
  });

  return ok({
    invoices: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      description: p.description,
      invoiceUrl: p.invoiceUrl,
      billingPeriod: p.billingPeriod,
      periodStart: p.periodStart?.toISOString() ?? null,
      periodEnd: p.periodEnd?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      // Include tenant info for super admin
      ...((p as unknown as Record<string, unknown>).tenant
        ? {
            tenant: (p as unknown as Record<string, { id: string; name: string; slug: string }>)
              .tenant,
          }
        : {}),
    })),
  });
});
