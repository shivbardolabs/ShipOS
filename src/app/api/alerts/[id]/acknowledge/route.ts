/**
 * BAR-263 + BAR-265: Alert Acknowledgement
 *
 * PATCH /api/alerts/:id/acknowledge
 *
 * Body: { action: 'skip' | 'snooze' | 'dismiss', snoozedUntil?: ISO string, userId: string }
 *
 * - "skip": Hides for current session (reappears on next login if unresolved)
 * - "snooze": Hides until snoozedUntil timestamp
 * - "dismiss": Permanent dismiss (only for non-urgent_important alerts)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const VALID_ACTIONS = ['skip', 'snooze', 'dismiss'] as const;
type AckAction = (typeof VALID_ACTIONS)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, snoozedUntil, userId } = body as {
      action: AckAction;
      snoozedUntil?: string;
      userId?: string;
    };

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Urgent & Important alerts cannot be permanently dismissed
    if (action === 'dismiss' && alert.priority === 'urgent_important') {
      return NextResponse.json(
        { error: 'Urgent & Important alerts cannot be permanently dismissed. Use skip or snooze.' },
        { status: 422 }
      );
    }

    // Build update data
    const now = new Date();
    const updateData: Record<string, unknown> = {
      acknowledgedAt: now,
      acknowledgedBy: userId || 'unknown',
      acknowledgementAction: action,
    };

    if (action === 'snooze') {
      if (!snoozedUntil) {
        return NextResponse.json(
          { error: 'snoozedUntil is required for snooze action' },
          { status: 400 }
        );
      }
      updateData.snoozedUntil = new Date(snoozedUntil);
    }

    if (action === 'dismiss') {
      // Mark as resolved for non-urgent alerts
      updateData.resolvedAt = now;
    }

    if (action === 'skip') {
      // Skip = snooze until end of current day (will reappear on next login)
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      updateData.snoozedUntil = endOfDay;
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: updateData,
    });

    // Create audit log entry
    try {
      const systemUser = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (systemUser) {
        await prisma.auditLog.create({
          data: {
            action: `alert.${action}`,
            entityType: 'alert',
            entityId: id,
            userId: userId || systemUser.id,
            details: JSON.stringify({
              alertTitle: alert.title,
              alertPriority: alert.priority,
              acknowledgementAction: action,
              snoozedUntil: updateData.snoozedUntil || null,
            }),
          },
        });
      }
    } catch {
      console.error('[alerts] Audit log write failed');
    }

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error('[alerts] PATCH acknowledge error:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}
