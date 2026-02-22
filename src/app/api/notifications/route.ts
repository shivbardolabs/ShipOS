import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/notifications
 *
 * List notifications with optional filters.
 *
 * Query params:
 *   status?:     'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
 *   channel?:    'email' | 'sms' | 'both'
 *   type?:       notification type
 *   customerId?: filter by customer
 *   limit?:      number (default 50)
 *   offset?:     number (default 0)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const type = searchParams.get('type');
    const customerId = searchParams.get('customerId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (type) where.type = type;
    if (customerId) where.customerId = customerId;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[API] Notifications list error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
