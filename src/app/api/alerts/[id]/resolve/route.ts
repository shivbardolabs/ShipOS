/**
 * BAR-265: Alert System — Resolve Alert
 *
 * PATCH /api/alerts/:id/resolve
 *
 * Body: { userId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (alert.resolvedAt) {
      return NextResponse.json({ alert, alreadyResolved: true });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        acknowledgedBy: userId || alert.acknowledgedBy || 'system',
        acknowledgementAction: 'resolve',
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error('[alerts] PATCH resolve error:', error);
    return NextResponse.json({ error: 'Failed to resolve alert' }, { status: 500 });
  }
}
