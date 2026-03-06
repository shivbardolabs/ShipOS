import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, notFound, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const AcknowledgeBodySchema = z.object({
  action: z.enum(['skip', 'snooze', 'dismiss']),
  snoozeUntil: z.string().datetime().optional(),
});

/**
 * PATCH /api/alerts/[id]/acknowledge
 * Acknowledge an alert with an action (skip, snooze, or dismiss).
 *
 * SECURITY FIX: Now requires authentication, derives userId from session,
 * and scopes alert lookup to tenant.
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user, params }) => {
  const { id } = await params;
  const body = await validateBody(request, AcknowledgeBodySchema);

  const alert = await prisma.alert.findFirst({
    where: { id, tenantId: user.tenantId! },
  });

  if (!alert) return notFound('Alert not found');

  // Urgent + important alerts cannot be dismissed — only skipped or snoozed
  if (alert.priority === 'urgent_important' && body.action === 'dismiss') {
    return badRequest('Urgent & important alerts cannot be dismissed');
  }

  const updateData: Record<string, unknown> = {
    acknowledgedAt: new Date(),
    acknowledgedBy: user.id,
    acknowledgeAction: body.action,
  };

  if (body.action === 'dismiss') {
    updateData.status = 'dismissed';
  } else if (body.action === 'snooze' && body.snoozeUntil) {
    updateData.snoozedUntil = new Date(body.snoozeUntil);
    updateData.status = 'snoozed';
  } else {
    updateData.status = 'acknowledged';
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: updateData,
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: `alert.${body.action}`,
      entityType: 'alert',
      entityId: id,
      userId: user.id,
      details: JSON.stringify({
        alertTitle: alert.title,
        priority: alert.priority,
        action: body.action,
      }),
    },
  });

  return ok({ alert: updated });
});
