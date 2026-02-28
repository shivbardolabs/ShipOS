import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/packages/check-tracking?tracking=xxx
 *
 * Checks if a tracking number already exists in the inventory.
 * Used by Package Check-In Step 3 (BAR-245) to prevent duplicates.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
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
}
