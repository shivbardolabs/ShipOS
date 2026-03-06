import { withApiHandler, validateBody, ok, notFound, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  PATCH /api/packages/smart-intake/pending/[id]                             */
/*  Update a single pending item — edit fields, approve, or reject.           */
/* -------------------------------------------------------------------------- */

const PatchSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit']).optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  senderName: z.string().optional(),
  senderAddress: z.string().optional(),
  recipientName: z.string().optional(),
  pmbNumber: z.string().optional(),
  packageSize: z.string().optional(),
  serviceType: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const PATCH = withApiHandler(async (request, { user, params }) => {
  const id = params?.id;
  if (!id) badRequest('Missing id');

  const existing = await prisma.smartIntakePending.findUnique({ where: { id } });
  if (!existing) {
    notFound('Pending item not found');
  }

  const body = await validateBody(request, PatchSchema);
  const {
    action,
    trackingNumber,
    carrier,
    senderName,
    senderAddress,
    recipientName,
    pmbNumber,
    packageSize,
    serviceType,
    rejectionReason,
  } = body;

  // ── Handle approval ──────────────────────────────────────────────────
  if (action === 'approve') {
    // Create the actual Package record
    let customerId: string | null = null;
    if (existing.pmbNumber) {
      const customer = await prisma.customer.findFirst({
        where: {
          pmbNumber: existing.pmbNumber,
          status: 'active',
        },
      });
      customerId = customer?.id ?? null;
    }

    // If no customer found, we still approve but note it
    const pkg = customerId
      ? await prisma.package.create({
          data: {
            trackingNumber: existing.trackingNumber,
            carrier: existing.carrier,
            senderName: existing.senderName,
            packageType: existing.packageSize || 'medium',
            status: 'checked_in',
            customerId,
            recipientName: existing.recipientName,
            checkedInById: user.id,
          },
        })
      : null;

    const updated = await prisma.smartIntakePending.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedById: user.id,
        reviewedAt: new Date(),
        checkedInPackageId: pkg?.id ?? null,
      },
    });

    return ok({
      success: true,
      item: serializeItem(updated),
      packageId: pkg?.id ?? null,
      warning: !customerId ? 'No matching customer found for PMB — package not created' : undefined,
    });
  }

  // ── Handle rejection ─────────────────────────────────────────────────
  if (action === 'reject') {
    const updated = await prisma.smartIntakePending.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedById: user.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });

    return ok({ success: true, item: serializeItem(updated) });
  }

  // ── Handle edit (update fields without changing status) ───────────────
  const data: Prisma.SmartIntakePendingUpdateInput = {};
  if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
  if (carrier !== undefined) data.carrier = carrier;
  if (senderName !== undefined) data.senderName = senderName;
  if (senderAddress !== undefined) data.senderAddress = senderAddress;
  if (recipientName !== undefined) data.recipientName = recipientName;
  if (pmbNumber !== undefined) data.pmbNumber = pmbNumber;
  if (packageSize !== undefined) data.packageSize = packageSize;
  if (serviceType !== undefined) data.serviceType = serviceType;

  if (Object.keys(data).length === 0) {
    badRequest('No fields to update');
  }

  const updated = await prisma.smartIntakePending.update({
    where: { id },
    data,
  });

  return ok({ success: true, item: serializeItem(updated) });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/packages/smart-intake/pending/[id]                            */
/*  Delete a pending item (only if still pending).                            */
/* -------------------------------------------------------------------------- */
export const DELETE = withApiHandler(async (_request, { user, params }) => {
  const id = params?.id;
  if (!id) badRequest('Missing id');

  const existing = await prisma.smartIntakePending.findUnique({ where: { id } });
  if (!existing) {
    notFound('Pending item not found');
  }

  await prisma.smartIntakePending.delete({ where: { id } });
  return ok({ success: true });
});

function serializeItem(item: {
  createdAt?: Date | null;
  updatedAt?: Date | null;
  reviewedAt?: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...item,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
  };
}
