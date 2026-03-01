import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import {
  recordInvoicePayment,
  sendInvoice,
  voidInvoice,
} from '@/lib/invoicing-service';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const PatchInvoiceBodySchema = z.object({
  action: z.enum(['send', 'void', 'record_payment']),
  amount: z.number().optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/invoices/[id]
 * Get a single invoice with line items and customer info.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true },
      },
      lineItems: true,
    },
  });

  if (!invoice) return notFound('Invoice not found');

  return ok({ invoice });
});

/**
 * PATCH /api/invoices/[id]
 * Perform an action on an invoice: send, void, or record_payment.
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user, params }) => {
  if (!['admin', 'superadmin', 'manager'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const { id } = await params;
  const body = await validateBody(request, PatchInvoiceBodySchema);

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: user.tenantId! },
  });

  if (!invoice) return notFound('Invoice not found');

  if (body.action === 'send') {
    const result = await sendInvoice(id, user.id);
    return ok({ invoice: result });
  }

  if (body.action === 'void') {
    if (invoice.status === 'voided') {
      return badRequest('Invoice is already voided');
    }
    const result = await voidInvoice(id, user.id, body.notes);
    return ok({ invoice: result });
  }

  if (body.action === 'record_payment') {
    if (!body.amount) return badRequest('amount is required for record_payment');

    const result = await recordInvoicePayment(id, {
      amount: body.amount,
      method: body.method ?? 'cash',
      reference: body.reference,
      recordedById: user.id,
    });
    return ok({ invoice: result });
  }

  return badRequest('Unknown action');
});
