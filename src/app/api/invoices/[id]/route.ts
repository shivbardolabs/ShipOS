import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  recordInvoicePayment,
  sendInvoice,
  voidInvoice,
} from '@/lib/invoice-service';

/**
 * GET /api/invoices/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get customer info
    let customer = null;
    if (invoice.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: invoice.customerId },
        select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true, phone: true },
      });
    }

    return NextResponse.json({ invoice: { ...invoice, customer } });
  } catch (err) {
    console.error('[GET /api/invoices/[id]]', err);
    return NextResponse.json(
      { error: 'Failed to fetch invoice', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/invoices/[id]
 *
 * Update invoice: send, void, or record payment.
 *
 * Body:
 *   - action: 'send' | 'void' | 'record_payment'
 *   - via?: 'email' | 'in_app' | 'print' (for send)
 *   - amount?: number (for record_payment)
 *   - paymentMethodId?: string
 *   - paymentRef?: string
 *   - method?: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Verify invoice belongs to tenant
    const existing = await prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    switch (action) {
      case 'send': {
        await sendInvoice(id, body.via || 'email');
        return NextResponse.json({ success: true, message: 'Invoice sent' });
      }
      case 'void': {
        await voidInvoice(id);
        return NextResponse.json({ success: true, message: 'Invoice voided' });
      }
      case 'record_payment': {
        if (!body.amount || body.amount <= 0) {
          return NextResponse.json({ error: 'Payment amount is required' }, { status: 400 });
        }
        const result = await recordInvoicePayment(id, {
          amount: body.amount,
          paymentMethodId: body.paymentMethodId,
          paymentRef: body.paymentRef,
          method: body.method,
        });
        return NextResponse.json({ result });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[PATCH /api/invoices/[id]]', err);
    return NextResponse.json(
      { error: 'Failed to update invoice', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
