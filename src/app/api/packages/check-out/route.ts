import { withApiHandler, validateBody, ok, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/check-out                                              */
/*  BAR-12: Release packages to customer — update status, record signature    */
/* -------------------------------------------------------------------------- */

const CheckOutSchema = z.object({
  packageIds: z.array(z.string()).min(1, 'packageIds must not be empty'),
  customerId: z.string().min(1, 'customerId is required'),
  releaseSignature: z.string().optional(),       // Base64 data URL
  delegateName: z.string().optional(),            // If someone else is picking up
  delegateIdType: z.string().optional(),
  delegateIdNumber: z.string().optional(),
  receiptMethod: z.enum(['email', 'sms', 'print', 'none']).optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  const body = await validateBody(request, CheckOutSchema);

  // Verify customer exists and belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: body.customerId, tenantId: user.tenantId! },
  });

  if (!customer) {
    notFound('Customer not found');
  }

  // Verify all packages belong to customer and are checked in
  const packages = await prisma.package.findMany({
    where: {
      id: { in: body.packageIds },
      customerId: body.customerId,
      status: { in: ['checked_in', 'notified', 'ready'] },
      customer: { tenantId: user.tenantId! },
    },
  });

  if (packages.length === 0) {
    notFound('No eligible packages found for release');
  }

  const releasedIds = packages.map((p) => p.id);
  const now = new Date();

  // Batch update all packages to released
  await prisma.package.updateMany({
    where: { id: { in: releasedIds } },
    data: {
      status: 'released',
      releasedAt: now,
      releaseSignature: body.releaseSignature || null,
      delegateName: body.delegateName || null,
      delegateIdType: body.delegateIdType || null,
      delegateIdNumber: body.delegateIdNumber || null,
    },
  });

  // Create audit log entry
  try {
    await prisma.auditLog.create({
      data: {
        action: 'package.release',
        entityType: 'package',
        entityId: releasedIds.join(','),
        userId: user.id,
        details: JSON.stringify({
          description: `Released ${releasedIds.length} package(s) to ${customer.firstName} ${customer.lastName} (${customer.pmbNumber})${body.delegateName ? ` via delegate: ${body.delegateName}` : ''}`,
          packageIds: releasedIds,
          customerId: customer.id,
          pmbNumber: customer.pmbNumber,
          hasSignature: !!body.releaseSignature,
          delegateName: body.delegateName || null,
          receiptMethod: body.receiptMethod || 'none',
        }),
      },
    });
  } catch {
    // Audit log failure should not block the release
    console.error('[check-out] Audit log write failed');
  }

  return ok({
    success: true,
    released: releasedIds.length,
    skipped: body.packageIds.length - releasedIds.length,
    packages: releasedIds.map((id) => ({ id, status: 'released', releasedAt: now })),
  });
});
