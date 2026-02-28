import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { parsePricingJson } from '@/lib/pmb-billing/franchise-pricing';

/**
 * GET /api/pmb/franchise-pricing
 * Get franchise pricing configuration.
 * SuperAdmin: see all franchises. Admin: see own franchise if linked.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const franchiseId = req.nextUrl.searchParams.get('franchiseId');

    if (user.role === 'superadmin') {
      // SuperAdmin sees all franchises
      if (franchiseId) {
        const franchise = await prisma.franchiseGroup.findUnique({
          where: { id: franchiseId },
          include: {
            locations: true,
            pricingOverrides: { orderBy: { changedAt: 'desc' }, take: 50 },
          },
        });
        if (!franchise) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 });

        return NextResponse.json({
          franchise: {
            ...franchise,
            defaultPricing: parsePricingJson(franchise.defaultPricingJson),
            locations: franchise.locations.map((l) => ({
              ...l,
              customPricing: parsePricingJson(l.customPricingJson),
            })),
          },
        });
      }

      const franchises = await prisma.franchiseGroup.findMany({
        where: { isActive: true },
        include: { _count: { select: { locations: true } } },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        franchises: franchises.map((f) => ({
          id: f.id,
          name: f.name,
          slug: f.slug,
          adminEmail: f.adminEmail,
          adminName: f.adminName,
          locationCount: f._count.locations,
          isActive: f.isActive,
          createdAt: f.createdAt,
        })),
      });
    }

    // Admin: check if their tenant is part of a franchise
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const location = await prisma.franchiseLocation.findUnique({
      where: { tenantId: user.tenantId },
      include: {
        franchise: {
          include: { locations: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ franchise: null });
    }

    return NextResponse.json({
      franchise: {
        id: location.franchise.id,
        name: location.franchise.name,
        defaultPricing: parsePricingJson(location.franchise.defaultPricingJson),
        myLocationPricing: parsePricingJson(location.customPricingJson),
        locationCount: location.franchise.locations.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/pmb/franchise-pricing]', err);
    return NextResponse.json({ error: 'Failed to fetch franchise pricing' }, { status: 500 });
  }
}

/**
 * POST /api/pmb/franchise-pricing
 * Create or update franchise pricing.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Create a new franchise group
    if (body.action === 'create_franchise') {
      if (user.role !== 'superadmin') {
        return NextResponse.json({ error: 'Only superadmin can create franchises' }, { status: 403 });
      }

      const { name, slug, adminEmail, adminName, phone } = body;
      if (!name || !slug) {
        return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
      }

      const franchise = await prisma.franchiseGroup.create({
        data: {
          name,
          slug,
          adminEmail: adminEmail ?? null,
          adminName: adminName ?? null,
          phone: phone ?? null,
        },
      });

      return NextResponse.json({ franchise });
    }

    // Add a location to franchise
    if (body.action === 'add_location') {
      const { franchiseId, tenantId } = body;
      if (!franchiseId || !tenantId) {
        return NextResponse.json({ error: 'franchiseId and tenantId are required' }, { status: 400 });
      }

      const location = await prisma.franchiseLocation.create({
        data: { franchiseId, tenantId },
      });

      return NextResponse.json({ location });
    }

    // Update franchise pricing
    if (body.action === 'update_pricing') {
      const { franchiseId, tenantId, pricingJson, changes } = body;
      if (!franchiseId) {
        return NextResponse.json({ error: 'franchiseId is required' }, { status: 400 });
      }

      if (tenantId) {
        // Location-level override
        await prisma.franchiseLocation.update({
          where: { tenantId },
          data: { customPricingJson: JSON.stringify(pricingJson) },
        });
      } else {
        // Franchise-level default
        await prisma.franchiseGroup.update({
          where: { id: franchiseId },
          data: { defaultPricingJson: JSON.stringify(pricingJson) },
        });
      }

      // Record audit trail
      if (Array.isArray(changes)) {
        await prisma.franchisePricingOverride.createMany({
          data: changes.map((c: { tierSlug: string; field: string; oldValue: string; newValue: string }) => ({
            franchiseId,
            tenantId: tenantId ?? null,
            tierSlug: c.tierSlug,
            field: c.field,
            oldValue: c.oldValue ?? null,
            newValue: c.newValue,
            changedBy: user.id,
          })),
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/pmb/franchise-pricing]', err);
    return NextResponse.json({ error: 'Failed to update franchise pricing' }, { status: 500 });
  }
}
