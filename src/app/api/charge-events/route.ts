import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/charge-events
 *
 * Returns charge events for the authenticated tenant.
 *
 * Query params:
 *   - customerId: filter by customer
 *   - status: filter by status (pending, posted, invoiced, paid, void, disputed)
 *   - serviceType: filter by service type
 *   - from: ISO date — start of date range
 *   - to: ISO date — end of date range
 *   - limit: number (defaults to 50, max 200)
 *   - offset: number (defaults to 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const serviceType = searchParams.get('serviceType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      tenantId: user.tenantId,
    };

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [chargeEvents, total] = await Promise.all([
      prisma.chargeEvent.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              pmbNumber: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.chargeEvent.count({ where }),
    ]);

    // Calculate summary totals
    const summary = await prisma.chargeEvent.aggregate({
      where,
      _sum: {
        totalCharge: true,
        costBasis: true,
        markup: true,
      },
      _count: true,
    });

    return NextResponse.json({
      chargeEvents,
      total,
      limit,
      offset,
      summary: {
        count: summary._count,
        totalCharge: summary._sum.totalCharge || 0,
        totalCost: summary._sum.costBasis || 0,
        totalMarkup: summary._sum.markup || 0,
      },
    });
  } catch (err) {
    console.error('[GET /api/charge-events]', err);
    return NextResponse.json(
      { error: 'Failed to fetch charge events', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/charge-events
 *
 * Create a new charge event. Requires admin or superadmin role.
 *
 * Body:
 *   - customerId: string (required)
 *   - serviceType: enum string (required)
 *   - description: string (required)
 *   - quantity: number (defaults to 1)
 *   - unitRate: number (defaults to 0)
 *   - costBasis: number (defaults to 0)
 *   - markup: number (defaults to 0)
 *   - packageId?: string
 *   - shipmentId?: string
 *   - mailPieceId?: string
 *   - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Require admin or superadmin to create charges
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      customerId,
      serviceType,
      description,
      quantity = 1,
      unitRate = 0,
      costBasis = 0,
      markup = 0,
      packageId,
      shipmentId,
      mailPieceId,
      notes,
    } = body;

    // Validate required fields
    if (!customerId || !serviceType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, serviceType, description' },
        { status: 400 },
      );
    }

    // Validate service type
    const validServiceTypes = [
      'receiving', 'storage', 'forwarding', 'scanning',
      'pickup', 'disposal', 'shipping', 'custom',
    ];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: `Invalid serviceType. Must be one of: ${validServiceTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Look up the customer to get pmbNumber and validate ownership
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: user.tenantId,
      },
      select: { id: true, pmbNumber: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found or does not belong to your tenant' },
        { status: 404 },
      );
    }

    // Calculate totalCharge: costBasis + markup, or quantity * unitRate if those are zero
    const calculatedTotal = costBasis + markup > 0
      ? costBasis + markup
      : quantity * unitRate;

    const chargeEvent = await prisma.chargeEvent.create({
      data: {
        tenantId: user.tenantId,
        customerId,
        pmbNumber: customer.pmbNumber,
        serviceType,
        description,
        quantity,
        unitRate,
        costBasis,
        markup,
        totalCharge: calculatedTotal,
        status: 'pending',
        packageId: packageId || null,
        shipmentId: shipmentId || null,
        mailPieceId: mailPieceId || null,
        createdById: user.id,
        notes: notes || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pmbNumber: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ chargeEvent }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/charge-events]', err);
    return NextResponse.json(
      { error: 'Failed to create charge event', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
