import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { DEFAULT_ADDONS } from '@/lib/pmb-billing/add-ons';
import { calculateAddOnProration } from '@/lib/pmb-billing/add-ons';

/**
 * GET /api/pmb/add-ons
 * List available add-ons and optionally customer's active add-ons.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const customerId = req.nextUrl.searchParams.get('customerId');

    // Get available add-ons
    let addOns = await prisma.pmbAddOn.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Seed defaults if none exist
    if (addOns.length === 0) {
      await prisma.pmbAddOn.createMany({
        data: DEFAULT_ADDONS.map((a, i) => ({
          tenantId: user.tenantId!,
          name: a.name,
          slug: a.slug,
          description: a.description,
          priceMonthly: a.priceMonthly,
          priceAnnual: a.priceAnnual,
          unit: a.unit,
          quotaType: a.quotaType,
          quotaAmount: a.quotaAmount,
          sortOrder: i,
        })),
      });
      addOns = await prisma.pmbAddOn.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // Optionally include customer's active add-ons
    let customerAddOns: { addOnId: string; status: string; activatedAt: Date; price: number }[] = [];
    if (customerId) {
      customerAddOns = await prisma.pmbCustomerAddOn.findMany({
        where: { tenantId: user.tenantId, customerId, status: 'active' },
        select: { addOnId: true, status: true, activatedAt: true, price: true },
      });
    }

    return NextResponse.json({ addOns, customerAddOns });
  } catch (err) {
    console.error('[GET /api/pmb/add-ons]', err);
    return NextResponse.json({ error: 'Failed to fetch add-ons' }, { status: 500 });
  }
}

/**
 * POST /api/pmb/add-ons
 * Create/update an add-on definition, or activate an add-on for a customer.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const body = await req.json();

    // If customerId is provided, this is an activation
    if (body.customerId && body.addOnId) {
      const { customerId, addOnId, planTierId, billingCycle = 'monthly' } = body;

      const addOn = await prisma.pmbAddOn.findUnique({ where: { id: addOnId } });
      if (!addOn) return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });

      // Calculate prorated price for mid-cycle activation
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const proration = calculateAddOnProration(addOn.priceMonthly, now, periodEnd);

      const customerAddOn = await prisma.pmbCustomerAddOn.create({
        data: {
          tenantId: user.tenantId,
          customerId,
          addOnId,
          planTierId: planTierId ?? null,
          billingCycle,
          price: proration.proratedPrice,
          prorated: proration.daysRemaining < proration.daysInPeriod,
          proratedFrom: now,
          status: 'active',
        },
      });

      return NextResponse.json({ customerAddOn, proration });
    }

    // Otherwise, create/update add-on definition (admin)
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, name, slug, description, priceMonthly, priceAnnual, unit, quotaType, quotaAmount, sortOrder } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const data = {
      tenantId: user.tenantId,
      name,
      slug,
      description: description ?? null,
      priceMonthly: priceMonthly ?? 0,
      priceAnnual: priceAnnual ?? null,
      unit: unit ?? 'month',
      quotaType: quotaType ?? null,
      quotaAmount: quotaAmount ?? 0,
      sortOrder: sortOrder ?? 0,
    };

    let addOn;
    if (id) {
      addOn = await prisma.pmbAddOn.update({ where: { id }, data });
    } else {
      addOn = await prisma.pmbAddOn.create({ data });
    }

    return NextResponse.json({ addOn });
  } catch (err) {
    console.error('[POST /api/pmb/add-ons]', err);
    return NextResponse.json({ error: 'Failed to save add-on' }, { status: 500 });
  }
}
