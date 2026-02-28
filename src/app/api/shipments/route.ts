import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onShipmentCreated } from '@/lib/charge-event-service';

/**
 * GET /api/shipments
 * List shipments with search, filtering, and pagination.
 * Query params: search?, status?, paymentStatus?, page?, limit?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { customer: { tenantId: user.tenantId } }
      : {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { ...tenantScope };
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, pmbNumber: true },
          },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = shipments.map((s: any) => ({
      ...s,
      shippedAt: s.shippedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ shipments: serialized, total, page, limit });
  } catch (err) {
    console.error('[GET /api/shipments]', err);
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
}

/**
 * POST /api/shipments
 * Create a new shipment and auto-generate a shipping charge event (BAR-308).
 * Body: { customerId, carrier, service?, trackingNumber?, destination?,
 *         weight?, dimensions?, wholesaleCost?, retailPrice?, insuranceCost?, packingCost? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant found' }, { status: 400 });

    const body = await request.json();
    const {
      customerId,
      carrier,
      service,
      trackingNumber,
      destination,
      weight,
      dimensions,
      wholesaleCost = 0,
      retailPrice = 0,
      insuranceCost = 0,
      packingCost = 0,
    } = body;

    if (!customerId || !carrier) {
      return NextResponse.json(
        { error: 'customerId and carrier are required' },
        { status: 400 },
      );
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: { id: true, pmbNumber: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const shipment = await prisma.shipment.create({
      data: {
        customerId,
        carrier,
        service: service || null,
        trackingNumber: trackingNumber || null,
        destination: destination || null,
        weight: weight ?? null,
        dimensions: dimensions || null,
        wholesaleCost,
        retailPrice,
        insuranceCost,
        packingCost,
        status: 'label_created',
        paymentStatus: 'unpaid',
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    });

    // --- BAR-308: Auto-generate shipping charge event ---
    let chargeEvent: { chargeEventId: string; totalCharge: number } | null = null;
    if (retailPrice > 0) {
      try {
        chargeEvent = await onShipmentCreated({
          tenantId: user.tenantId,
          customerId,
          pmbNumber: customer.pmbNumber,
          shipmentId: shipment.id,
          carrier,
          service,
          retailPrice,
          wholesaleCost,
          createdById: user.id,
        });
      } catch (err) {
        console.error('[shipments] Charge event generation failed:', err);
      }
    }

    return NextResponse.json({
      shipment: {
        ...shipment,
        createdAt: shipment.createdAt.toISOString(),
        updatedAt: shipment.updatedAt.toISOString(),
        shippedAt: shipment.shippedAt?.toISOString() ?? null,
        deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
      },
      ...(chargeEvent && { chargeEvent }),
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/shipments]', err);
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
  }
}
