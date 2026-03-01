import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { parsePricingJson } from '@/lib/pmb-billing/franchise-pricing';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetFranchiseQuerySchema = z.object({
  franchiseId: z.string().optional(),
});

const FranchisePricingBodySchema = z.object({
  action: z.enum(['create_franchise', 'add_location', 'update_pricing']),
  // create_franchise fields
  name: z.string().optional(),
  slug: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminName: z.string().optional(),
  phone: z.string().optional(),
  // add_location fields
  franchiseId: z.string().optional(),
  tenantId: z.string().optional(),
  // update_pricing fields
  pricingJson: z.unknown().optional(),
  changes: z.array(z.object({
    tierSlug: z.string(),
    field: z.string(),
    oldValue: z.string().optional(),
    newValue: z.string(),
  })).optional(),
});

/**
 * GET /api/pmb/franchise-pricing
 * Get franchise pricing configuration.
 * SuperAdmin: see all franchises. Admin: see own franchise if linked.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetFranchiseQuerySchema);

  if (user.role === 'superadmin') {
    // SuperAdmin sees all franchises
    if (query.franchiseId) {
      const franchise = await prisma.franchiseGroup.findUnique({
        where: { id: query.franchiseId },
        include: {
          locations: true,
          pricingOverrides: { orderBy: { changedAt: 'desc' }, take: 50 },
        },
      });
      if (!franchise) return notFound('Franchise not found');

      return ok({
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

    return ok({
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
  if (!user.tenantId) return badRequest('No tenant');

  const location = await prisma.franchiseLocation.findUnique({
    where: { tenantId: user.tenantId },
    include: {
      franchise: {
        include: { locations: true },
      },
    },
  });

  if (!location) {
    return ok({ franchise: null });
  }

  return ok({
    franchise: {
      id: location.franchise.id,
      name: location.franchise.name,
      defaultPricing: parsePricingJson(location.franchise.defaultPricingJson),
      myLocationPricing: parsePricingJson(location.customPricingJson),
      locationCount: location.franchise.locations.length,
    },
  });
});

/**
 * POST /api/pmb/franchise-pricing
 * Create or update franchise pricing.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return forbidden('Forbidden');
  }

  const body = await validateBody(request, FranchisePricingBodySchema);

  // Create a new franchise group
  if (body.action === 'create_franchise') {
    if (user.role !== 'superadmin') {
      return forbidden('Only superadmin can create franchises');
    }

    if (!body.name || !body.slug) {
      return badRequest('name and slug are required');
    }

    const franchise = await prisma.franchiseGroup.create({
      data: {
        name: body.name,
        slug: body.slug,
        adminEmail: body.adminEmail ?? null,
        adminName: body.adminName ?? null,
        phone: body.phone ?? null,
      },
    });

    return ok({ franchise });
  }

  // Add a location to franchise
  if (body.action === 'add_location') {
    if (!body.franchiseId || !body.tenantId) {
      return badRequest('franchiseId and tenantId are required');
    }

    const location = await prisma.franchiseLocation.create({
      data: { franchiseId: body.franchiseId, tenantId: body.tenantId },
    });

    return ok({ location });
  }

  // Update franchise pricing
  if (body.action === 'update_pricing') {
    if (!body.franchiseId) {
      return badRequest('franchiseId is required');
    }

    if (body.tenantId) {
      // Location-level override
      await prisma.franchiseLocation.update({
        where: { tenantId: body.tenantId },
        data: { customPricingJson: JSON.stringify(body.pricingJson) },
      });
    } else {
      // Franchise-level default
      await prisma.franchiseGroup.update({
        where: { id: body.franchiseId },
        data: { defaultPricingJson: JSON.stringify(body.pricingJson) },
      });
    }

    // Record audit trail
    if (Array.isArray(body.changes)) {
      await prisma.franchisePricingOverride.createMany({
        data: body.changes.map((c) => ({
          franchiseId: body.franchiseId!,
          tenantId: body.tenantId ?? null,
          tierSlug: c.tierSlug,
          field: c.field,
          oldValue: c.oldValue ?? null,
          newValue: c.newValue,
          changedBy: user.id,
        })),
      });
    }

    return ok({ success: true });
  }

  return badRequest('Unknown action');
});
