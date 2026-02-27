import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  calculateFees,
  buildLineItems,
  DEFAULT_FEE_CONFIG,
} from '@/lib/checkout/fees';
import type { FeeConfig, PackageForFees } from '@/lib/checkout/fees';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/checkout/calculate-fees                                */
/*  BAR-98: Fee Calculation Engine                                            */
/*                                                                            */
/*  Body:                                                                     */
/*    packageIds  — string[]  (selected packages to calculate fees for)       */
/*    customerId  — string    (customer ID for quota lookup)                  */
/*    tenantId    — string    (tenant for fee config)                         */
/*    addOnTotal  — number?   (optional add-on service total)                 */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageIds, customerId, tenantId, addOnTotal = 0 } = body;

    if (!packageIds?.length || !customerId) {
      return NextResponse.json(
        { error: 'packageIds and customerId are required' },
        { status: 400 },
      );
    }

    // Load packages
    const packages = await prisma.package.findMany({
      where: {
        id: { in: packageIds },
        customerId,
        status: { in: ['checked_in', 'notified', 'ready'] },
      },
    });

    if (packages.length === 0) {
      return NextResponse.json(
        { error: 'No eligible packages found' },
        { status: 404 },
      );
    }

    // Load tenant fee configuration
    let feeConfig: FeeConfig = { ...DEFAULT_FEE_CONFIG };

    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          storageRate: true,
          storageFreedays: true,
          storageCountWeekends: true,
          receivingFeeRate: true,
          packageQuota: true,
          packageQuotaOverage: true,
          taxRate: true,
        },
      });

      if (tenant) {
        feeConfig = {
          storageRate: tenant.storageRate,
          storageFreedays: tenant.storageFreedays,
          storageCountWeekends: tenant.storageCountWeekends,
          receivingFeeRate: tenant.receivingFeeRate,
          packageQuota: tenant.packageQuota,
          packageQuotaOverage: tenant.packageQuotaOverage,
          taxRate: tenant.taxRate,
        };
      }
    }

    // Count packages already received this month (for quota)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCount = await prisma.package.count({
      where: {
        customerId,
        checkedInAt: { gte: monthStart },
      },
    });

    // Calculate fees
    const pkgsForFees: PackageForFees[] = packages.map((p) => ({
      id: p.id,
      checkedInAt: p.checkedInAt,
      receivingFee: p.receivingFee,
      carrier: p.carrier,
      trackingNumber: p.trackingNumber,
      packageType: p.packageType,
      storageFee: p.storageFee,
    }));

    const result = calculateFees(pkgsForFees, feeConfig, monthlyCount - packages.length, addOnTotal, now);
    const lineItems = buildLineItems(result);

    return NextResponse.json({
      ...result,
      lineItems,
      config: feeConfig,
    });
  } catch (error) {
    console.error('[checkout/calculate-fees] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate fees' },
      { status: 500 },
    );
  }
}
