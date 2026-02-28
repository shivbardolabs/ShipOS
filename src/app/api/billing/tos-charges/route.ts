import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/tos-charges
 *
 * Returns time-of-service charges.
 * Query params: ?customerId=xxx&status=pending&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const charges = await prisma.tosCharge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    // Calculate summary
    const pendingTotal = charges
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.total, 0);

    return NextResponse.json({
      charges: charges.map((c) => ({
        id: c.id,
        customerId: c.customerId,
        description: c.description,
        amount: c.amount,
        tax: c.tax,
        total: c.total,
        status: c.status,
        mode: c.mode,
        paymentMethod: c.paymentMethod,
        paymentRef: c.paymentRef,
        paidAt: c.paidAt?.toISOString() ?? null,
        dueDate: c.dueDate?.toISOString() ?? null,
        referenceType: c.referenceType,
        referenceId: c.referenceId,
        createdAt: c.createdAt.toISOString(),
      })),
      summary: {
        total: charges.length,
        pendingTotal: Math.round(pendingTotal * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[GET /api/billing/tos-charges]', err);
    return NextResponse.json({ error: 'Failed to fetch ToS charges' }, { status: 500 });
  }
}

/**
 * POST /api/billing/tos-charges
 *
 * Create a time-of-service charge.
 * Body: { customerId, description, amount, tax?, mode?, paymentMethod?, referenceType?, referenceId? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await req.json();
    const { customerId, description, amount, tax = 0, mode, paymentMethod, referenceType, referenceId } = body;

    if (!customerId || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'customerId, description, and amount are required' },
        { status: 400 },
      );
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Determine mode from customer profile or tenant config
    let chargeMode = mode;
    if (!chargeMode) {
      const profile = await prisma.customerBillingProfile.findUnique({
        where: { customerId },
      });
      if (profile?.tosMode) {
        chargeMode = profile.tosMode;
      } else {
        const config = await prisma.billingModelConfig.findUnique({
          where: { tenantId: user.tenantId },
        });
        chargeMode = config?.tosDefaultMode || 'immediate';
      }
    }

    const total = Math.round((amount + tax) * 100) / 100;
    const isImmediate = chargeMode === 'immediate' && paymentMethod;

    // Calculate due date for deferred charges
    let dueDate: Date | null = null;
    if (chargeMode === 'deferred') {
      const profile = await prisma.customerBillingProfile.findUnique({
        where: { customerId },
      });
      const config = await prisma.billingModelConfig.findUnique({
        where: { tenantId: user.tenantId },
      });
      const paymentDays = profile?.paymentTermDays ?? config?.tosPaymentWindow ?? 30;
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + paymentDays);

      // Check credit limit
      if (profile && profile.creditLimit > 0) {
        const outstandingCharges = await prisma.tosCharge.aggregate({
          where: { customerId, status: { in: ['pending', 'invoiced'] } },
          _sum: { total: true },
        });
        const outstanding = outstandingCharges._sum.total ?? 0;
        if (outstanding + total > profile.creditLimit) {
          return NextResponse.json(
            {
              error: 'Credit limit exceeded',
              outstanding,
              creditLimit: profile.creditLimit,
              chargeAmount: total,
            },
            { status: 422 },
          );
        }
      }

      // Update account balance
      if (profile) {
        await prisma.customerBillingProfile.update({
          where: { customerId },
          data: { accountBalance: { increment: total } },
        });
      }
    }

    const charge = await prisma.tosCharge.create({
      data: {
        tenantId: user.tenantId,
        customerId,
        description,
        amount,
        tax,
        total,
        status: isImmediate ? 'paid' : 'pending',
        mode: chargeMode,
        paymentMethod: isImmediate ? paymentMethod : null,
        paidAt: isImmediate ? new Date() : null,
        dueDate,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
      },
    });

    return NextResponse.json({
      charge: {
        id: charge.id,
        description: charge.description,
        total: charge.total,
        status: charge.status,
        mode: charge.mode,
        createdAt: charge.createdAt.toISOString(),
        dueDate: charge.dueDate?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[POST /api/billing/tos-charges]', err);
    return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 });
  }
}
