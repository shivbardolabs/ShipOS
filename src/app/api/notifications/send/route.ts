import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';
import type { NotificationType, NotificationChannel } from '@/lib/notifications';

/**
 * POST /api/notifications/send
 *
 * Send a notification to a customer via email, SMS, or both.
 *
 * Body:
 *   type:       NotificationType (required)
 *   customerId: string (required)
 *   channel?:   'email' | 'sms' | 'both' (optional — defaults to customer prefs)
 *   subject?:   string (required for 'custom' type)
 *   body?:      string (required for 'custom' type)
 *   data?:      Record<string, unknown> (template-specific data)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, customerId' },
        { status: 400 }
      );
    }

    const validTypes: NotificationType[] = [
      'package_arrival',
      'package_reminder',
      'mail_received',
      'id_expiring',
      'renewal_reminder',
      'shipment_update',
      'welcome',
      'custom',
    ];

    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.type === 'custom' && (!body.subject || !body.body)) {
      return NextResponse.json(
        { error: 'Custom notifications require both subject and body' },
        { status: 400 }
      );
    }

    if (body.channel && !['email', 'sms', 'both'].includes(body.channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be: email, sms, or both' },
        { status: 400 }
      );
    }

    const result = await sendNotification({
      type: body.type as NotificationType,
      customerId: body.customerId,
      channel: body.channel as NotificationChannel | undefined,
      subject: body.subject,
      body: body.body,
      data: body.data,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 207, // 207 = partial success
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[API] Notification send error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
