import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/packages
 * List packages with search, filtering, and pagination.
 * Query params: search?, status?, carrier?, page?, limit?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const carrier = searchParams.get('carrier');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { customer: { tenantId: user.tenantId } }
      : {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { ...tenantScope };
    if (status) where.status = status;
    if (carrier) where.carrier = carrier;
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        orderBy: { checkedInAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, pmbNumber: true },
          },
        },
      }),
      prisma.package.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = packages.map((p: any) => ({
      ...p,
      checkedInAt: p.checkedInAt?.toISOString() ?? null,
      notifiedAt: p.notifiedAt?.toISOString() ?? null,
      releasedAt: p.releasedAt?.toISOString() ?? null,
      holdDeadline: p.holdDeadline?.toISOString() ?? null,
      carrierUploadedAt: p.carrierUploadedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ packages: serialized, total, page, limit });
  } catch (err) {
    console.error('[GET /api/packages]', err);
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}
