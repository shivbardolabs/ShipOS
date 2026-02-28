import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  GET /api/packages/smart-intake/pending                                    */
/*  List pending Smart Intake items with optional status / search filters.    */
/* -------------------------------------------------------------------------- */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // BAR-337: Fast path for sidebar badge — just return the pending count
    if (searchParams.get('countOnly') === 'true') {
      const pendingCount = await prisma.smartIntakePending.count({
        where: {
          status: 'pending',
          ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
        },
      });
      return NextResponse.json({ count: pendingCount });
    }

    const status = searchParams.get('status'); // pending | approved | rejected
    const search = searchParams.get('search');
    const batchId = searchParams.get('batchId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    // Tenant scope
    if (user.role !== 'superadmin' && user.tenantId) {
      where.tenantId = user.tenantId;
    }

    if (status) where.status = status;
    if (batchId) where.batchId = batchId;

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { carrier: { contains: search, mode: 'insensitive' } },
        { pmbNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.smartIntakePending.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.smartIntakePending.count({ where }),
    ]);

    // Serialize dates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = items.map((item: any) => ({
      ...item,
      createdAt: item.createdAt?.toISOString() ?? null,
      updatedAt: item.updatedAt?.toISOString() ?? null,
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
    }));

    // Compute status counts for filters
    const counts = await prisma.smartIntakePending.groupBy({
      by: ['status'],
      _count: { id: true },
      where: user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {},
    });

    const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const c of counts) {
      statusCounts[c.status] = c._count.id;
    }

    return NextResponse.json({
      items: serialized,
      total,
      page,
      limit,
      statusCounts,
    });
  } catch (err) {
    console.error('GET /api/packages/smart-intake/pending error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/smart-intake/pending                                   */
/*  Create one or more pending items from a Smart Intake scan.                */
/* -------------------------------------------------------------------------- */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { items, batchId } = body as {
      items: Array<{
        trackingNumber?: string;
        carrier: string;
        senderName?: string;
        senderAddress?: string;
        recipientName?: string;
        pmbNumber?: string;
        packageSize?: string;
        serviceType?: string;
        confidence?: number;
        carrierConfidence?: string;
        trackingNumberValid?: boolean;
        recipientIsBusiness?: boolean;
        labelImageUrl?: string;
        rawExtraction?: string;
      }>;
      batchId?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const resolvedBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.smartIntakePending.create({
          data: {
            trackingNumber: item.trackingNumber || null,
            carrier: item.carrier || 'other',
            senderName: item.senderName || null,
            senderAddress: item.senderAddress || null,
            recipientName: item.recipientName || null,
            pmbNumber: item.pmbNumber || null,
            packageSize: item.packageSize || 'medium',
            serviceType: item.serviceType || null,
            confidence: item.confidence ?? 0,
            carrierConfidence: item.carrierConfidence || null,
            trackingNumberValid: item.trackingNumberValid ?? false,
            recipientIsBusiness: item.recipientIsBusiness ?? false,
            labelImageUrl: item.labelImageUrl || null,
            rawExtraction: item.rawExtraction || null,
            batchId: resolvedBatchId,
            tenantId: user.tenantId || null,
            status: 'pending',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: created.length,
      batchId: resolvedBatchId,
      items: created.map((c) => ({ id: c.id, status: c.status })),
    });
  } catch (err) {
    console.error('POST /api/packages/smart-intake/pending error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
