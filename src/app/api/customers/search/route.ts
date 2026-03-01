import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers/search?q=xxx&mode=pmb|name|phone|company|name_company&limit=10&includeInactive=true
 *
 * Searches customers within the current tenant.
 * BAR-38: Returns all statuses (active, suspended, closed) with smart ranking.
 * Used by the Package Check-In wizard (Step 1) with unified auto-detect search (BAR-324).
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
    const includeInactive = searchParams.get('includeInactive') !== 'false';

    // Build where clause based on search mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId: user.tenantId,
      deletedAt: null,
    };

    // BAR-38: Include all statuses by default for check-in lookup
    if (!includeInactive) {
      where.status = 'active';
    }

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
        case 'name_company':
          where.OR = [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { businessName: { contains: query, mode: 'insensitive' } },
          ];
          break;
        default:
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

    // Fetch extra results for ranking (up to 3x limit to ensure good coverage)
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
        photoUrl: true,
        _count: {
          select: {
            packages: { where: { status: { in: ['checked_in', 'notified', 'ready'] } } },
          },
        },
      },
      orderBy: [{ pmbNumber: 'asc' }],
      take: Math.min(limit * 3, 150),
    });

    // BAR-38: Smart result ranking
    const statusOrder: Record<string, number> = { active: 0, suspended: 1, closed: 2 };

    const ranked = customers
      .map((c) => {
        let matchTier = 6; // default: lowest (fuzzy)
        const q = query.toLowerCase();
        const pmb = (c.pmbNumber || '').toLowerCase();
        const firstName = (c.firstName || '').toLowerCase();
        const lastName = (c.lastName || '').toLowerCase();
        const phone = (c.phone || '').replace(/[^0-9]/g, '');
        const biz = (c.businessName || '').toLowerCase();
        const qDigits = q.replace(/[^0-9]/g, '');

        if (q) {
          // Tier 1: Exact PMB match
          if (pmb === q || pmb === q.replace(/^pmb[-\s]?/i, '')) {
            matchTier = 1;
          }
          // Tier 2: PMB starts-with
          else if (pmb.startsWith(q) || pmb.startsWith(q.replace(/^pmb[-\s]?/i, ''))) {
            matchTier = 2;
          }
          // Tier 3: Name starts-with
          else if (firstName.startsWith(q) || lastName.startsWith(q)) {
            matchTier = 3;
          }
          // Tier 4: Phone match (full or last 4)
          else if (qDigits && (phone === qDigits || phone.endsWith(qDigits))) {
            matchTier = 4;
          }
          // Tier 5: Business name contains
          else if (biz.includes(q)) {
            matchTier = 5;
          }
        }

        return {
          ...c,
          _matchTier: matchTier,
          _statusOrder: statusOrder[c.status] ?? 3,
        };
      })
      .sort((a, b) => {
        // Sort by match tier first, then by status (active > suspended > closed)
        if (a._matchTier !== b._matchTier) return a._matchTier - b._matchTier;
        return a._statusOrder - b._statusOrder;
      })
      .slice(0, limit);

    return NextResponse.json({
      customers: ranked.map((c) => ({
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
        photoUrl: c.photoUrl,
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
