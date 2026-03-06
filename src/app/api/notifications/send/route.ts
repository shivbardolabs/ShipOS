import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, created, badRequest } from '@/lib/api-utils';
import { sendNotification } from '@/lib/notifications';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const SendNotificationBodySchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(['package_arrival', 'pickup_reminder', 'storage_warning', 'renewal', 'custom']),
  channel: z.enum(['email', 'sms', 'push', 'in_app']),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/notifications/send
 * Send a notification to a customer.
 *
 * SECURITY FIX: Now requires authentication.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, SendNotificationBodySchema);

  const result = await sendNotification({
    tenantId: user.tenantId!,
    customerId: body.customerId,
    type: body.type,
    channel: body.channel,
    message: body.message,
    metadata: body.metadata,
    sentById: user.id,
  });

  if (!result.success) {
    return badRequest(result.error ?? 'Failed to send notification');
  }

  return created({ notification: result });
});
