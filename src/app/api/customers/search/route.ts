import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers/search?q=xxx&mode=pmb|name|phone|company&limit=10
 *
 * Searches active customers within the current tenant.
 * Used by the Package Check-In wizard (Step 1) to replace mock data
 * with real database queries.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const mode = searchParams.get('mode') || 'pmb';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    // Build where clause based on search mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId: user.tenantId,
      status: 'active',
      deletedAt: null,
    };

    if (query) {
      switch (mode) {
        case 'pmb':
          where.pmbNumber = { contains: query, mode: 'insensitive' };
          break;
        case 'name':
          where.OR = [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ];
          break;
        case 'phone':
          where.phone = { contains: query.replace(/[^0-9]/g, '') };
          break;
        case 'company':
          where.businessName = { contains: query, mode: 'insensitive' };
          break;
        default:
          // General search across all fields
          where.OR = [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { pmbNumber: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { businessName: { contains: query, mode: 'insensitive' } },
          ];
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        businessName: true,
        pmbNumber: true,
        platform: true,
        status: true,
        notifyEmail: true,
        notifySms: true,
        _count: {
          select: {
            packages: { where: { status: { in: ['checked_in', 'notified', 'ready'] } } },
          },
        },
      },
      orderBy: [{ pmbNumber: 'asc' }],
      take: limit,
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        businessName: c.businessName,
        pmbNumber: c.pmbNumber,
        platform: c.platform,
        status: c.status,
        notifyEmail: c.notifyEmail,
        notifySms: c.notifySms,
        activePackageCount: c._count.packages,
      })),
    });
  } catch (err) {
    console.error('[GET /api/customers/search]', err);
    return NextResponse.json(
      { error: 'Failed to search customers' },
      { status: 500 },
    );
  }
}
