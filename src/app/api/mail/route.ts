import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
