import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  generateInvoiceForCustomer,
  generateBatchInvoices,
  getInvoiceSummary,
} from '@/lib/invoice-service';

/**
 * GET /api/invoices
 *
 * List invoices for the tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { tenantId: user.tenantId };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          lineItems: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Enrich with customer info
    const customerIds = [...new Set(invoices.map(i => i.customerId).filter(Boolean))] as string[];
    const customers = customerIds.length > 0
      ? await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true },
        })
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const enriched = invoices.map(inv => ({
      ...inv,
      customer: inv.customerId ? customerMap.get(inv.customerId) || null : null,
    }));

    const summary = await getInvoiceSummary(user.tenantId);

    return NextResponse.json({
      invoices: enriched,
      total,
      limit,
      offset,
      summary,
    });
  } catch (err) {
    console.error('[GET /api/invoices]', err);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/invoices
 *
 * Generate invoices.
 *
 * Body:
 *   - action: 'generate_single' | 'generate_batch'
 *   - customerId: string (for generate_single)
 *   - periodStart?: string (ISO)
 *   - periodEnd?: string (ISO)
 *   - autoSend?: boolean
 *   - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, customerId, periodStart, periodEnd, autoSend, notes } = body;

    if (action === 'generate_single') {
      if (!customerId) {
        return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
      }

      const result = await generateInvoiceForCustomer(user.tenantId, customerId, {
        periodStart: periodStart ? new Date(periodStart) : undefined,
        periodEnd: periodEnd ? new Date(periodEnd) : undefined,
        autoSend,
        notes,
      });

      if (!result) {
        return NextResponse.json(
          { error: 'No pending charges found for this customer' },
          { status: 404 },
        );
      }

      return NextResponse.json({ result }, { status: 201 });
    }

    if (action === 'generate_batch') {
      const result = await generateBatchInvoices(user.tenantId, {
        periodStart: periodStart ? new Date(periodStart) : undefined,
        periodEnd: periodEnd ? new Date(periodEnd) : undefined,
        autoSend,
      });

      return NextResponse.json({ result }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/invoices]', err);
    return NextResponse.json(
      { error: 'Failed to generate invoices', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
