import { withApiHandler, validateBody, ok, notFound, badRequest, ApiError } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/packages/rts/[id]
 * Fetch a single RTS record with full details.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const id = params?.id;
  if (!id) badRequest('Missing id');

  const rts = await prisma.returnToSender.findFirst({
    where: {
      id,
      ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
    },
  });

  if (!rts) notFound('RTS record not found');

  // Enrich with package / mail info
  let packageInfo = null;
  let mailInfo = null;

  if (rts.packageId) {
    packageInfo = await prisma.package.findUnique({
      where: { id: rts.packageId },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        packageType: true,
        senderName: true,
        storageLocation: true,
        checkedInAt: true,
        customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true, email: true } },
      },
    });
  }

  if (rts.mailPieceId) {
    mailInfo = await prisma.mailPiece.findUnique({
      where: { id: rts.mailPieceId },
      select: { id: true, type: true, sender: true, receivedAt: true },
    });
  }

  return ok({
    ...rts,
    initiatedAt: rts.initiatedAt.toISOString(),
    labelPrintedAt: rts.labelPrintedAt?.toISOString() ?? null,
    carrierHandoffAt: rts.carrierHandoffAt?.toISOString() ?? null,
    completedAt: rts.completedAt?.toISOString() ?? null,
    cancelledAt: rts.cancelledAt?.toISOString() ?? null,
    createdAt: rts.createdAt.toISOString(),
    updatedAt: rts.updatedAt.toISOString(),
    package: packageInfo,
    mailPiece: mailInfo,
  });
});

/**
 * PATCH /api/packages/rts/[id]
 *
 * Advance the RTS processing step or cancel.
 */

const RtsActions = ['print_label', 'carrier_handoff', 'complete', 'cancel'] as const;

const RtsPatchSchema = z.object({
  action: z.enum(RtsActions),
  returnTrackingNumber: z.string().optional(),
  carrierNotes: z.string().optional(),
  cancelReason: z.string().optional(),
});

export const PATCH = withApiHandler(async (request, { user, params }) => {
  const id = params?.id;
  if (!id) badRequest('Missing id');

  const { action, returnTrackingNumber, carrierNotes, cancelReason } =
    await validateBody(request, RtsPatchSchema);

  const rts = await prisma.returnToSender.findFirst({
    where: {
      id,
      ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
    },
  });
  if (!rts) notFound('RTS record not found');

  // Validate step transitions
  const VALID_TRANSITIONS: Record<string, string[]> = {
    initiated: ['print_label', 'carrier_handoff', 'cancel'],
    label_printed: ['carrier_handoff', 'cancel'],
    carrier_handoff: ['complete', 'cancel'],
    completed: [],
    cancelled: [],
  };

  if (!VALID_TRANSITIONS[rts.step]?.includes(action)) {
    throw new ApiError(
      `Cannot perform "${action}" on an RTS record with step "${rts.step}".`,
      409,
    );
  }

  if (action === 'cancel' && !cancelReason?.trim()) {
    badRequest('cancelReason is required when cancelling.');
  }

  const now = new Date();

  const updateData: Prisma.ReturnToSenderUpdateInput = {};
  let newStep = rts.step;
  let auditAction = '';
  let packageStatus = '';

  switch (action) {
    case 'print_label':
      newStep = 'label_printed';
      updateData.step = 'label_printed';
      updateData.labelPrintedAt = now;
      updateData.labelPrintedById = user.id;
      auditAction = 'rts.label_printed';
      packageStatus = 'rts_labeled';
      break;

    case 'carrier_handoff':
      newStep = 'carrier_handoff';
      updateData.step = 'carrier_handoff';
      updateData.carrierHandoffAt = now;
      updateData.carrierHandoffById = user.id;
      if (returnTrackingNumber) updateData.returnTrackingNumber = returnTrackingNumber.trim();
      if (carrierNotes) updateData.carrierNotes = carrierNotes.trim();
      auditAction = 'rts.carrier_handoff';
      packageStatus = 'rts_labeled'; // stays at rts_labeled until completed
      break;

    case 'complete':
      newStep = 'completed';
      updateData.step = 'completed';
      updateData.completedAt = now;
      updateData.completedById = user.id;
      if (returnTrackingNumber) updateData.returnTrackingNumber = returnTrackingNumber.trim();
      auditAction = 'rts.completed';
      packageStatus = 'rts_completed';
      break;

    case 'cancel':
      newStep = 'cancelled';
      updateData.step = 'cancelled';
      updateData.cancelledAt = now;
      updateData.cancelledById = user.id;
      updateData.cancelReason = cancelReason!.trim();
      auditAction = 'rts.cancelled';
      packageStatus = 'checked_in'; // revert to checked_in
      break;
  }

  const updated = await prisma.returnToSender.update({
    where: { id },
    data: updateData,
  });

  // Update package status if applicable
  if (rts.packageId && packageStatus) {
    await prisma.package.update({
      where: { id: rts.packageId },
      data: { status: packageStatus },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: auditAction,
      entityType: rts.packageId ? 'package' : 'mail',
      entityId: rts.packageId || rts.mailPieceId || rts.id,
      details: JSON.stringify({
        rtsId: rts.id,
        previousStep: rts.step,
        newStep,
        returnTrackingNumber: returnTrackingNumber || null,
        carrierNotes: carrierNotes || null,
        cancelReason: cancelReason || null,
        carrier: rts.carrier,
        pmbNumber: rts.pmbNumber,
        description: action === 'cancel'
          ? `RTS cancelled: ${cancelReason}`
          : `RTS advanced to ${newStep}${returnTrackingNumber ? ` (tracking: ${returnTrackingNumber})` : ''}`,
      }),
      userId: user.id,
    },
  });

  return ok({ success: true, rts: updated });
});
