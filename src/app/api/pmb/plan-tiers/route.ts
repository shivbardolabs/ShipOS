import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { DEFAULT_PMB_TIERS } from '@/lib/pmb-billing/plan-tiers';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const PlanTierBodySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  priceMonthly: z.number().optional().default(0),
  priceAnnual: z.number().optional().default(0),
  annualDiscountPct: z.number().optional().default(0),
  includedMailItems: z.number().optional().default(0),
  includedScans: z.number().optional().default(0),
  freeStorageDays: z.number().optional().default(30),
  includedForwarding: z.number().optional().default(0),
  includedShredding: z.number().optional().default(0),
  maxRecipients: z.number().optional().default(1),
  maxPackagesPerMonth: z.number().optional().default(0),
  overageMailRate: z.number().optional().default(0),
  overageScanRate: z.number().optional().default(0),
  overageStorageRate: z.number().optional().default(0),
  overageForwardingRate: z.number().optional().default(0),
  overagePackageRate: z.number().optional().default(0),
  sortOrder: z.number().optional().default(0),
});

const DeleteTierBodySchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/pmb/plan-tiers
 * List all PMB plan tiers for the current tenant.
 * Seeds defaults if none exist.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  let tiers = await prisma.pmbPlanTier.findMany({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // Seed defaults if none exist
  if (tiers.length === 0) {
    await prisma.pmbPlanTier.createMany({
      data: DEFAULT_PMB_TIERS.map((t, i) => ({
        tenantId: user.tenantId!,
        name: t.name,
        slug: t.slug,
        priceMonthly: t.priceMonthly,
        priceAnnual: t.priceAnnual,
        annualDiscountPct: t.annualDiscountPct,
        includedMailItems: t.includedMailItems,
        includedScans: t.includedScans,
        freeStorageDays: t.freeStorageDays,
        includedForwarding: t.includedForwarding,
        includedShredding: t.includedShredding,
        maxRecipients: t.maxRecipients,
        maxPackagesPerMonth: t.maxPackagesPerMonth,
        overageMailRate: t.overageMailRate,
        overageScanRate: t.overageScanRate,
        overageStorageRate: t.overageStorageRate,
        overageForwardingRate: t.overageForwardingRate,
        overagePackageRate: t.overagePackageRate,
        sortOrder: i,
      })),
    });
    tiers = await prisma.pmbPlanTier.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  return ok({ tiers });
});

/**
 * POST /api/pmb/plan-tiers
 * Create or update a PMB plan tier.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return forbidden('Forbidden');
  }
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, PlanTierBodySchema);

  const data = {
    tenantId: user.tenantId,
    name: body.name,
    slug: body.slug,
    description: body.description ?? null,
    priceMonthly: body.priceMonthly,
    priceAnnual: body.priceAnnual,
    annualDiscountPct: body.annualDiscountPct,
    includedMailItems: body.includedMailItems,
    includedScans: body.includedScans,
    freeStorageDays: body.freeStorageDays,
    includedForwarding: body.includedForwarding,
    includedShredding: body.includedShredding,
    maxRecipients: body.maxRecipients,
    maxPackagesPerMonth: body.maxPackagesPerMonth,
    overageMailRate: body.overageMailRate,
    overageScanRate: body.overageScanRate,
    overageStorageRate: body.overageStorageRate,
    overageForwardingRate: body.overageForwardingRate,
    overagePackageRate: body.overagePackageRate,
    sortOrder: body.sortOrder,
  };

  let tier;
  if (body.id) {
    tier = await prisma.pmbPlanTier.update({ where: { id: body.id }, data });
  } else {
    tier = await prisma.pmbPlanTier.create({ data });
  }

  return ok({ tier });
});

/**
 * DELETE /api/pmb/plan-tiers
 * Soft-delete a plan tier (set isActive = false).
 */
export const DELETE = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return forbidden('Forbidden');
  }

  const body = await validateBody(request, DeleteTierBodySchema);

  await prisma.pmbPlanTier.update({
    where: { id: body.id },
    data: { isActive: false },
  });

  return ok({ success: true });
});
