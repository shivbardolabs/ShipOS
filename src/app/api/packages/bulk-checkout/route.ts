import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { calculateStorageFee } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * POST /api/packages/bulk-checkout
 * Bulk checkout multiple packages for the same customer.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const {
      packageIds,
      delegateName,
      delegateIdType,
      delegateIdNumber,
    } = await req.json();

    if (!packageIds || !Array.isArray(packageIds) || packageIds.length === 0) {
      return NextResponse.json({ error: 'packageIds array is required' }, { status: 400 });
    }

    // Fetch packages and verify they belong to tenant
    const packages = await prisma.package.findMany({
      where: {
        id: { in: packageIds },
        status: { in: ['checked_in', 'notified', 'ready'] },
        customer: { tenantId: user.tenantId },
      },
      include: { customer: true },
    });

    if (packages.length === 0) {
      return NextResponse.json({ error: 'No eligible packages found' }, { status: 404 });
    }

    // Get tenant storage rate settings
    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;
    const storageRate = tenant?.storageRate ?? 1.0;
    const freeDays = tenant?.storageFreedays ?? 30;

    const now = new Date();
    const results = [];

    for (const pkg of packages) {
      // Calculate storage fee
      const { fee, daysStored, billableDays } = calculateStorageFee(
        pkg.checkedInAt,
        storageRate,
        freeDays,
      );

      // Update package
      await prisma.package.update({
        where: { id: pkg.id },
        data: {
          status: 'released',
          releasedAt: now,
          checkedOutById: user.id,
          storageFee: fee,
          ...(delegateName && {
            delegateName,
            delegateIdType: delegateIdType || null,
            delegateIdNumber: delegateIdNumber || null,
          }),
        },
      });

      results.push({
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        daysStored,
        billableDays,
        storageFee: fee,
        customerName: `${pkg.customer.firstName} ${pkg.customer.lastName}`,
        isDelegate: !!delegateName,
      });
    }

    // Calculate totals for receipt
    const totalStorageFees = results.reduce((sum, r) => sum + r.storageFee, 0);
    const totalReceivingFees = packages.reduce((sum, p) => sum + p.receivingFee, 0);

    return NextResponse.json({
      released: results,
      summary: {
        packageCount: results.length,
        totalStorageFees: Math.round(totalStorageFees * 100) / 100,
        totalReceivingFees: Math.round(totalReceivingFees * 100) / 100,
        grandTotal: Math.round((totalStorageFees + totalReceivingFees) * 100) / 100,
        releasedAt: now.toISOString(),
        releasedBy: user.name,
        delegate: delegateName || null,
      },
    });
  } catch (err) {
    console.error('[POST /api/packages/bulk-checkout]', err);
    return NextResponse.json({ error: 'Failed to process bulk checkout' }, { status: 500 });
  }
}
