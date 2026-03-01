import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import {
  generateInvoiceForCustomer,
  generateBatchInvoices,
  getInvoiceSummary,
} from '@/lib/invoicing-service';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetInvoicesQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const CreateInvoiceBodySchema = z.object({
  action: z.enum(['generate_single', 'generate_batch']),
  customerId: z.string().optional(),
  period: z.string().optional(), // YYYY-MM
  includeUnbilled: z.boolean().optional().default(true),
});

/**
 * GET /api/invoices
 * List invoices with filtering, pagination, customer enrichment, and summary.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetInvoicesQuerySchema);
  const tenantId = user.tenantId!;
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.InvoiceWhereInput = { tenantId };
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;
  if (query.dateFrom || query.dateTo) {
    where.issuedAt = {};
    if (query.dateFrom) (where.issuedAt as Prisma.DateTimeFilter).gte = new Date(query.dateFrom);
    if (query.dateTo) (where.issuedAt as Prisma.DateTimeFilter).lte = new Date(query.dateTo);
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true },
        },
        lineItems: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const summary = await getInvoiceSummary(tenantId);

  return ok({ invoices, total, page: query.page, limit: query.limit, summary });
});

/**
 * POST /api/invoices
 * Generate invoices — single customer or batch for all with unbilled events.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const body = await validateBody(request, CreateInvoiceBodySchema);
  const tenantId = user.tenantId!;

  if (body.action === 'generate_single') {
    if (!body.customerId) return badRequest('customerId required for generate_single');

    const invoice = await generateInvoiceForCustomer({
      tenantId,
      customerId: body.customerId,
      period: body.period,
      includeUnbilled: body.includeUnbilled ?? true,
      createdById: user.id,
    });

    return created({ invoice });
  }

  // generate_batch
  const result = await generateBatchInvoices({
    tenantId,
    period: body.period,
    includeUnbilled: body.includeUnbilled ?? true,
    createdById: user.id,
  });

  return created({
    generated: result.generated,
    skipped: result.skipped,
    errors: result.errors,
    invoiceIds: result.invoiceIds,
  });
});
