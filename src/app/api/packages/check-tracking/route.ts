import { withApiHandler, validateQuery, ok } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/**
 * GET /api/packages/check-tracking?tracking=xxx
 *
 * Checks if a tracking number already exists in the inventory.
 * Used by Package Check-In Step 3 (BAR-245) to prevent duplicates.
 */

const QuerySchema = z.object({
  tracking: z.string().optional(),
});

export const GET = withApiHandler(async (request, { user }) => {
  const { tracking } = validateQuery(request, QuerySchema);
  const trimmed = tracking?.trim();

  if (!trimmed) {
    return ok({ exists: false });
  }

  const existingPackage = await prisma.package.findFirst({
    where: {
      trackingNumber: trimmed,
      customer: { tenantId: user.tenantId! },
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
    return ok({
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

  return ok({ exists: false });
});
