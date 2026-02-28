import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/packages/rts/[id]
 * Fetch a single RTS record with full details.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;

    const rts = await prisma.returnToSender.findFirst({
      where: {
        id,
        ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });

    if (!rts) return NextResponse.json({ error: 'RTS record not found' }, { status: 404 });

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

    return NextResponse.json({
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
  } catch (err) {
    console.error('[GET /api/packages/rts/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch RTS record' }, { status: 500 });
  }
}

/**
 * PATCH /api/packages/rts/[id]
 *
 * Advance the RTS processing step or cancel.
 *
 * Body: {
 *   action: 'print_label' | 'carrier_handoff' | 'complete' | 'cancel',
 *   returnTrackingNumber?: string,   // for carrier_handoff or complete
 *   carrierNotes?: string,           // carrier-specific notes
 *   cancelReason?: string,           // required when action = 'cancel'
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action, returnTrackingNumber, carrierNotes, cancelReason } = body;

    const validActions = ['print_label', 'carrier_handoff', 'complete', 'cancel'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    const rts = await prisma.returnToSender.findFirst({
      where: {
        id,
        ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });
    if (!rts) return NextResponse.json({ error: 'RTS record not found' }, { status: 404 });

    // Validate step transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      initiated: ['print_label', 'carrier_handoff', 'cancel'],
      label_printed: ['carrier_handoff', 'cancel'],
      carrier_handoff: ['complete', 'cancel'],
      completed: [],
      cancelled: [],
    };

    if (!VALID_TRANSITIONS[rts.step]?.includes(action)) {
      return NextResponse.json(
        { error: `Cannot perform "${action}" on an RTS record with step "${rts.step}".` },
        { status: 409 },
      );
    }

    if (action === 'cancel' && !cancelReason?.trim()) {
      return NextResponse.json({ error: 'cancelReason is required when cancelling.' }, { status: 400 });
    }

    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
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

    return NextResponse.json({ success: true, rts: updated });
  } catch (err) {
    console.error('[PATCH /api/packages/rts/[id]]', err);
    return NextResponse.json({ error: 'Failed to update RTS record' }, { status: 500 });
  }
}
