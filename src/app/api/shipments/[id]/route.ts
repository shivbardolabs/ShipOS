import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/shipments/[id]
 * Get a single shipment with full details.
 */
export const GET = withApiHandler(async (request, { user, params }) => {
  try {

    const shipment = await prisma.shipment.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pmbNumber: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...shipment,
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
      shippedAt: shipment.shippedAt?.toISOString() ?? null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[GET /api/shipments/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch shipment' }, { status: 500 });
  }
});

/**
 * PATCH /api/shipments/[id]
 * Update shipment status, payment status, tracking, etc.
 * BAR-16: Full status workflow support.
 */
export const PATCH = withApiHandler(async (request, { user, params }) => {
  try {

    const body = await request.json();
    const {
      status,
      paymentStatus,
      trackingNumber,
      carrier,
      service,
      destination,
      weight,
      dimensions,
      wholesaleCost,
      retailPrice,
      insuranceCost,
      packingCost,
      internationalFlag,
      harmonizedCode,
    } = body;

    // Build update data — only include provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'shipped') updateData.shippedAt = new Date();
      if (status === 'delivered') updateData.deliveredAt = new Date();
    }
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (service !== undefined) updateData.service = service;
    if (destination !== undefined) updateData.destination = destination;
    if (weight !== undefined) updateData.weight = weight;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (wholesaleCost !== undefined) updateData.wholesaleCost = wholesaleCost;
    if (retailPrice !== undefined) updateData.retailPrice = retailPrice;
    if (insuranceCost !== undefined) updateData.insuranceCost = insuranceCost;
    if (packingCost !== undefined) updateData.packingCost = packingCost;
    if (internationalFlag !== undefined) updateData.internationalFlag = internationalFlag;
    if (harmonizedCode !== undefined) updateData.harmonizedCode = harmonizedCode;

    const shipment = await prisma.shipment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    });

    return NextResponse.json({
      ...shipment,
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
      shippedAt: shipment.shippedAt?.toISOString() ?? null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[PATCH /api/shipments/[id]]', err);
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
  }
});
