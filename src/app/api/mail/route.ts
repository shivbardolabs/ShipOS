import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { onMailAction } from '@/lib/charge-event-service';

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
