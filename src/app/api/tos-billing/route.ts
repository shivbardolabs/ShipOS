import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  processImmediateCharge,
  processDeferredCharge,
  processChargeViaTos,
  retryFailedCharge,
} from '@/lib/tos-billing-service';

/**
 * GET /api/tos-billing
 *
 * List TOS charges for the tenant with filtering.
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
    const mode = searchParams.get('mode');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { tenantId: user.tenantId };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (mode) where.mode = mode;

    const [charges, total] = await Promise.all([
      prisma.tosCharge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.tosCharge.count({ where }),
    ]);

    // Summary stats
    const summary = await prisma.tosCharge.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { total: true },
      _count: true,
    });

    const pendingDeferred = await prisma.tosCharge.aggregate({
      where: { tenantId: user.tenantId, mode: 'deferred', status: 'pending' },
      _sum: { total: true },
      _count: true,
    });

    const paidImmediate = await prisma.tosCharge.aggregate({
      where: { tenantId: user.tenantId, mode: 'immediate', status: 'paid' },
      _sum: { total: true },
      _count: true,
    });

    return NextResponse.json({
      charges,
      total,
      limit,
      offset,
      summary: {
        totalCharges: summary._count,
        totalAmount: summary._sum.total ?? 0,
        pendingDeferredCount: pendingDeferred._count,
        pendingDeferredAmount: pendingDeferred._sum.total ?? 0,
        paidImmediateCount: paidImmediate._count,
        paidImmediateAmount: paidImmediate._sum.total ?? 0,
      },
    });
  } catch (err) {
    console.error('[GET /api/tos-billing]', err);
    return NextResponse.json(
      { error: 'Failed to fetch TOS charges', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tos-billing
 *
 * Create a new TOS charge. Automatically routes to immediate or deferred path.
 *
 * Body:
 *   - customerId: string (required)
 *   - description: string (required)
 *   - amount: number (required)
 *   - tax?: number
 *   - mode?: 'immediate' | 'deferred' | 'auto' (default: auto)
 *   - serviceType?: string
 *   - chargeEventId?: string
 *   - paymentMethodId?: string (for immediate)
 *   - referenceType?: string
 *   - referenceId?: string
 *   - action?: 'retry' (to retry a failed charge)
 *   - tosChargeId?: string (for retry)
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
    const { action } = body;

    // Handle retry
    if (action === 'retry' && body.tosChargeId) {
      const result = await retryFailedCharge(body.tosChargeId);
      return NextResponse.json({ result }, { status: 200 });
    }

    const { customerId, description, amount, tax, mode, serviceType, chargeEventId, paymentMethodId, referenceType, referenceId } = body;

    if (!customerId || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, description, amount' },
        { status: 400 },
      );
    }

    // Validate customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (mode === 'immediate') {
      const result = await processImmediateCharge({
        tenantId: user.tenantId,
        customerId,
        description,
        amount,
        tax,
        serviceType,
        chargeEventId,
        paymentMethodId,
        referenceType,
        referenceId,
      });
      return NextResponse.json({ result }, { status: 201 });
    }

    if (mode === 'deferred') {
      const result = await processDeferredCharge({
        tenantId: user.tenantId,
        customerId,
        description,
        amount,
        tax,
        serviceType,
        chargeEventId,
        referenceType,
        referenceId,
      });
      return NextResponse.json({ result }, { status: 201 });
    }

    // Auto mode — let the service decide
    const result = await processChargeViaTos({
      tenantId: user.tenantId,
      customerId,
      description,
      amount,
      tax,
      serviceType,
      chargeEventId,
      referenceType,
      referenceId,
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tos-billing]', err);
    return NextResponse.json(
      { error: 'Failed to process TOS charge', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
