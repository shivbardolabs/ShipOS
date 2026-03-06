import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, ok, badRequest } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { isDemoMode } from '@/lib/payment-mode';
import { DemoPaymentProcessor } from '@/lib/demo-payment';

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

  // Map real payment records to invoice response
  const invoices = payments.map((p) => ({
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
  }));

  // In demo mode, if no real records exist, populate with realistic demo data
  if (isDemoMode() && invoices.length === 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId! },
      select: { name: true },
    });

    const demoInvoices = DemoPaymentProcessor.generateDemoInvoices(
      tenant?.name || 'Demo Store',
      6,
    );

    return ok({
      invoices: demoInvoices.map((inv) => ({
        id: inv.id,
        amount: inv.total,
        currency: inv.currency,
        status: inv.status === 'paid' ? 'succeeded' : 'pending',
        method: 'demo',
        description: inv.description,
        invoiceUrl: inv.receiptUrl,
        billingPeriod: inv.billingPeriod,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        createdAt: inv.createdAt,
        lineItems: inv.lineItems,
        transactionId: inv.transactionId,
      })),
      demo: true,
    });
  }

  return ok({ invoices, demo: isDemoMode() });
});
