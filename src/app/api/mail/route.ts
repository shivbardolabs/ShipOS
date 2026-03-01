import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onMailAction } from '@/lib/charge-event-service';
import { sendNotification } from '@/lib/notifications/service';

/**
 * GET /api/mail
 * List mail pieces with search, filtering, and pagination.
 * Query params: search?, type?, status?, page?, limit?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { customer: { tenantId: user.tenantId } }
      : {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { ...tenantScope };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { sender: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [mailPieces, total] = await Promise.all([
      prisma.mailPiece.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, pmbNumber: true },
          },
        },
      }),
      prisma.mailPiece.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = mailPieces.map((m: any) => ({
      ...m,
      receivedAt: m.receivedAt?.toISOString() ?? null,
      actionAt: m.actionAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json({ mailPieces: serialized, total, page, limit });
  } catch (err) {
    console.error('[GET /api/mail]', err);
    return NextResponse.json({ error: 'Failed to fetch mail' }, { status: 500 });
  }
}

/**
 * PATCH /api/mail
 * Update a mail piece action and auto-generate charge event (BAR-308).
 * Body: { id, action: 'scan'|'forward'|'discard', scanImage?, notes?, pageCount? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant found' }, { status: 400 });

    const body = await request.json();
    const { id, action, scanImage, notes, pageCount } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    const validActions = ['scan', 'forward', 'discard', 'hold'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    // Find the mail piece and verify tenant ownership
    const mailPiece = await prisma.mailPiece.findFirst({
      where: {
        id,
        customer: { tenantId: user.tenantId },
      },
      include: {
        customer: {
          select: { id: true, pmbNumber: true, tenantId: true },
        },
      },
    });

    if (!mailPiece) {
      return NextResponse.json({ error: 'Mail piece not found' }, { status: 404 });
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      scan: 'scanned',
      forward: 'forwarded',
      discard: 'discarded',
      hold: 'held',
    };

    const updated = await prisma.mailPiece.update({
      where: { id },
      data: {
        action,
        status: statusMap[action] || mailPiece.status,
        scanImage: scanImage || mailPiece.scanImage,
        notes: notes || mailPiece.notes,
        actionAt: new Date(),
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    });

    // --- BAR-308: Auto-generate charge event for billable mail actions ---
    let chargeEvent: { chargeEventId: string; totalCharge: number } | null = null;
    const billableActions = ['scan', 'forward', 'discard'];
    if (billableActions.includes(action) && mailPiece.customer.tenantId) {
      try {
        chargeEvent = await onMailAction({
          tenantId: mailPiece.customer.tenantId,
          customerId: mailPiece.customer.id,
          pmbNumber: mailPiece.customer.pmbNumber,
          mailPieceId: id,
          action: action as 'scan' | 'forward' | 'discard',
          pageCount: pageCount || 1,
          createdById: user.id,
        });
      } catch (err) {
        console.error('[mail] Charge event generation failed:', err);
      }
    }

    return NextResponse.json({
      mailPiece: {
        ...updated,
        receivedAt: updated.receivedAt?.toISOString() ?? null,
        actionAt: updated.actionAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      ...(chargeEvent && { chargeEvent }),
    });
  } catch (err) {
    console.error('[PATCH /api/mail]', err);
    return NextResponse.json({ error: 'Failed to update mail piece' }, { status: 500 });
  }
}

/**
 * POST /api/mail
 * Create a new mail piece (scan & assign to customer).
 * Body: { type, sender?, customerId, scanImage?, scanImageBack?, notes? }
 *
 * Automatically triggers a `mail_received` notification to the customer.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant found' }, { status: 400 });

    const body = await request.json();
    const { type, sender, customerId, scanImage, scanImageBack, notes } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const validTypes = ['letter', 'magazine', 'catalog', 'legal', 'other'];
    const mailType = validTypes.includes(type) ? type : 'letter';

    // Verify the customer exists and belongs to the user's tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: user.tenantId,
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true, pmbNumber: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create the mail piece
    const mailPiece = await prisma.mailPiece.create({
      data: {
        type: mailType,
        sender: sender || null,
        status: 'received',
        scanImage: scanImage || null,
        scanImageBack: scanImageBack || null,
        notes: notes || null,
        customerId: customer.id,
        receivedAt: new Date(),
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    });

    // Auto-trigger mail_received notification (fire and forget)
    try {
      await sendNotification({
        type: 'mail_received',
        customerId: customer.id,
        data: {
          mailType,
          sender: sender || undefined,
        },
      });
    } catch (err) {
      // Don't fail the request if notification fails
      console.error('[POST /api/mail] Notification failed:', err);
    }

    return NextResponse.json({
      mailPiece: {
        ...mailPiece,
        receivedAt: mailPiece.receivedAt?.toISOString() ?? null,
        actionAt: mailPiece.actionAt?.toISOString() ?? null,
        createdAt: mailPiece.createdAt.toISOString(),
        updatedAt: mailPiece.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/mail]', err);
    return NextResponse.json({ error: 'Failed to create mail piece' }, { status: 500 });
  }
}
