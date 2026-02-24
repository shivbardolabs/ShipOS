import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/invoices
 * Returns payment history for the current tenant.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const payments = await prisma.paymentRecord.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      invoices: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        description: p.description,
        invoiceUrl: p.invoiceUrl,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[GET /api/billing/invoices]', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
