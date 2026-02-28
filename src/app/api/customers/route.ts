import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers
 * List customers with search, filtering, and pagination.
 * Query params: search?, status?, platform?, page?, limit?
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
      deletedAt: null,
    };
    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { pmbNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { _count: { select: { packages: true, mailPieces: true, shipments: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialized = customers.map((c: any) => ({
      ...c,
      dateOpened: c.dateOpened?.toISOString() ?? null,
      dateClosed: c.dateClosed?.toISOString() ?? null,
      renewalDate: c.renewalDate?.toISOString() ?? null,
      idExpiration: c.idExpiration?.toISOString() ?? null,
      passportExpiration: c.passportExpiration?.toISOString() ?? null,
      form1583Date: c.form1583Date?.toISOString() ?? null,
      lastRenewalNotice: c.lastRenewalNotice?.toISOString() ?? null,
      agreementSignedAt: c.agreementSignedAt?.toISOString() ?? null,
      smsConsentAt: c.smsConsentAt?.toISOString() ?? null,
      smsOptOutAt: c.smsOptOutAt?.toISOString() ?? null,
      crdUploadDate: c.crdUploadDate?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      deletedAt: null,
      packageCount: c._count.packages,
      mailCount: c._count.mailPieces,
      shipmentCount: c._count.shipments,
      _count: undefined,
    }));

    return NextResponse.json({ customers: serialized, total, page, limit });
  } catch (err) {
    console.error('[GET /api/customers]', err);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
