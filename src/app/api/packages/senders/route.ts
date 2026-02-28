import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/packages/senders?q=xxx&limit=8
 *
 * Returns distinct sender names from previously checked-in packages
 * for the current tenant. Used for sender name autocomplete in
 * Package Check-In Step 2 (BAR-239).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 20);

    // Get distinct sender names from packages in this tenant's stores
    const senders = await prisma.package.findMany({
      where: {
        senderName: query
          ? { contains: query, mode: 'insensitive', not: null }
          : { not: null },
        customer: { tenantId: user.tenantId },
      },
      select: { senderName: true },
      distinct: ['senderName'],
      orderBy: { checkedInAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      senders: senders
        .map((s) => s.senderName)
        .filter((name): name is string => !!name),
    });
  } catch (err) {
    console.error('[GET /api/packages/senders]', err);
    return NextResponse.json(
      { error: 'Failed to fetch sender history' },
      { status: 500 },
    );
  }
}
