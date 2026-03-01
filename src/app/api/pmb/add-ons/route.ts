import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const CreateAddOnBodySchema = z.object({
  // Admin creating a new add-on definition
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  priceMonthly: z.number().optional(),
  priceAnnual: z.number().optional(),
  category: z.string().optional(),

  // Customer activation
  customerId: z.string().optional(),
  addOnId: z.string().optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
});

/**
 * GET /api/pmb/add-ons
 * List PMB add-ons for the tenant. Seeds defaults if none exist.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  const tenantId = user.tenantId!;

  let addOns = await prisma.pmbAddOn.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // Seed defaults if none exist
  if (addOns.length === 0) {
    const defaults = [
      { name: 'Package Notification SMS', slug: 'sms_notify', priceMonthly: 5, priceAnnual: 50, category: 'notifications' },
      { name: 'Mail Scanning', slug: 'mail_scan', priceMonthly: 15, priceAnnual: 150, category: 'mail' },
      { name: 'Package Forwarding', slug: 'pkg_forward', priceMonthly: 10, priceAnnual: 100, category: 'packages' },
      { name: 'Mail Shredding', slug: 'mail_shred', priceMonthly: 8, priceAnnual: 80, category: 'mail' },
    ];

    await prisma.pmbAddOn.createMany({
      data: defaults.map((d, i) => ({ ...d, tenantId, sortOrder: i })),
    });

    addOns = await prisma.pmbAddOn.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  return ok({ addOns });
});

/**
 * POST /api/pmb/add-ons
 * Create a new add-on definition (admin) or activate an add-on for a customer.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, CreateAddOnBodySchema);
  const tenantId = user.tenantId!;

  // Customer activation
  if (body.customerId && body.addOnId) {
    const addOn = await prisma.pmbAddOn.findFirst({
      where: { id: body.addOnId, tenantId },
    });
    if (!addOn) return badRequest('Add-on not found');

    // Calculate proration
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate();
    const price = body.billingCycle === 'annual' ? addOn.priceAnnual : addOn.priceMonthly;
    const proratedAmount = body.billingCycle === 'annual'
      ? price
      : parseFloat(((price / daysInMonth) * remainingDays).toFixed(2));

    const activation = await prisma.pmbAddOnActivation.create({
      data: {
        tenantId,
        customerId: body.customerId,
        addOnId: body.addOnId,
        billingCycle: body.billingCycle ?? 'monthly',
        price,
        proratedAmount,
        status: 'active',
        activatedAt: now,
      },
    });

    return created({ activation, proratedAmount });
  }

  // Admin creating a new add-on definition
  if (!['admin', 'superadmin'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  if (!body.name || !body.slug) {
    return badRequest('name and slug are required for creating an add-on');
  }

  const addOn = await prisma.pmbAddOn.create({
    data: {
      tenantId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      priceMonthly: body.priceMonthly ?? 0,
      priceAnnual: body.priceAnnual ?? 0,
      category: body.category ?? 'general',
    },
  });

  return created({ addOn });
});
