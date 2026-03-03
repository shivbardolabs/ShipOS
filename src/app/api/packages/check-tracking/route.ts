import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/packages/check-tracking?tracking=xxx
 *
 * Checks if a tracking number already exists in the inventory.
 * Used by Package Check-In Step 3 (BAR-245) to prevent duplicates.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {

    const { searchParams } = new URL(request.url);
    const tracking = searchParams.get('tracking')?.trim();

    if (!tracking) {
      return NextResponse.json({ exists: false });
    }

    const existingPackage = await prisma.package.findFirst({
      where: {
        trackingNumber: tracking,
        customer: { tenantId: user.tenantId },
        status: { notIn: ['released', 'returned'] }, // Only check active inventory
      },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        status: true,
        checkedInAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pmbNumber: true,
          },
        },
      },
    });

    if (existingPackage) {
      return NextResponse.json({
        exists: true,
        package: {
          id: existingPackage.id,
          trackingNumber: existingPackage.trackingNumber,
          carrier: existingPackage.carrier,
          status: existingPackage.status,
          checkedInAt: existingPackage.checkedInAt.toISOString(),
          customerName: `${existingPackage.customer.firstName} ${existingPackage.customer.lastName}`,
          customerPmb: existingPackage.customer.pmbNumber,
        },
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error('[GET /api/packages/check-tracking]', err);
    return NextResponse.json(
      { error: 'Failed to check tracking number' },
      { status: 500 },
    );
  }
});
