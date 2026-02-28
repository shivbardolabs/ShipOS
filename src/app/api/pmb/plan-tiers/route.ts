import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { DEFAULT_PMB_TIERS } from '@/lib/pmb-billing/plan-tiers';

/**
 * GET /api/pmb/plan-tiers
 * List all PMB plan tiers for the current tenant.
 * Seeds defaults if none exist.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

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

    return NextResponse.json({ tiers });
  } catch (err) {
    console.error('[GET /api/pmb/plan-tiers]', err);
    return NextResponse.json({ error: 'Failed to fetch plan tiers' }, { status: 500 });
  }
}

/**
 * POST /api/pmb/plan-tiers
 * Create or update a PMB plan tier.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const body = await req.json();
    const {
      id, name, slug, description, priceMonthly, priceAnnual, annualDiscountPct,
      includedMailItems, includedScans, freeStorageDays, includedForwarding,
      includedShredding, maxRecipients, maxPackagesPerMonth,
      overageMailRate, overageScanRate, overageStorageRate, overageForwardingRate,
      overagePackageRate, sortOrder,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const data = {
      tenantId: user.tenantId,
      name,
      slug,
      description: description ?? null,
      priceMonthly: priceMonthly ?? 0,
      priceAnnual: priceAnnual ?? 0,
      annualDiscountPct: annualDiscountPct ?? 0,
      includedMailItems: includedMailItems ?? 0,
      includedScans: includedScans ?? 0,
      freeStorageDays: freeStorageDays ?? 30,
      includedForwarding: includedForwarding ?? 0,
      includedShredding: includedShredding ?? 0,
      maxRecipients: maxRecipients ?? 1,
      maxPackagesPerMonth: maxPackagesPerMonth ?? 0,
      overageMailRate: overageMailRate ?? 0,
      overageScanRate: overageScanRate ?? 0,
      overageStorageRate: overageStorageRate ?? 0,
      overageForwardingRate: overageForwardingRate ?? 0,
      overagePackageRate: overagePackageRate ?? 0,
      sortOrder: sortOrder ?? 0,
    };

    let tier;
    if (id) {
      tier = await prisma.pmbPlanTier.update({ where: { id }, data });
    } else {
      tier = await prisma.pmbPlanTier.create({ data });
    }

    return NextResponse.json({ tier });
  } catch (err) {
    console.error('[POST /api/pmb/plan-tiers]', err);
    return NextResponse.json({ error: 'Failed to save plan tier' }, { status: 500 });
  }
}

/**
 * DELETE /api/pmb/plan-tiers
 * Soft-delete a plan tier (set isActive = false).
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.pmbPlanTier.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/pmb/plan-tiers]', err);
    return NextResponse.json({ error: 'Failed to delete tier' }, { status: 500 });
  }
}
