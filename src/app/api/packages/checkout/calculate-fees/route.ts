import { withApiHandler, validateBody, ok, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import {
  calculateFees,
  buildLineItems,
  DEFAULT_FEE_CONFIG,
} from '@/lib/checkout/fees';
import type { FeeConfig, PackageForFees } from '@/lib/checkout/fees';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/checkout/calculate-fees                                */
/*  BAR-98: Fee Calculation Engine                                            */
/* -------------------------------------------------------------------------- */

const CalculateFeesSchema = z.object({
  packageIds: z.array(z.string()).min(1, 'packageIds is required'),
  customerId: z.string().min(1, 'customerId is required'),
  addOnTotal: z.number().default(0),
});

export const POST = withApiHandler(async (request, { user }) => {
  const { packageIds, customerId, addOnTotal } =
    await validateBody(request, CalculateFeesSchema);

  // Load packages scoped to tenant
  const packages = await prisma.package.findMany({
    where: {
      id: { in: packageIds },
      customerId,
      status: { in: ['checked_in', 'notified', 'ready'] },
      customer: { tenantId: user.tenantId! },
    },
  });

  if (packages.length === 0) {
    notFound('No eligible packages found');
  }

  // Load tenant fee configuration
  let feeConfig: FeeConfig = { ...DEFAULT_FEE_CONFIG };

  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
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

  return ok({
    ...result,
    lineItems,
    config: feeConfig,
  });
});
