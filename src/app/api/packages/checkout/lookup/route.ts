import { withApiHandler, validateQuery, ok, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*  GET /api/packages/checkout/lookup                                         */
/*  BAR-103: Customer/PMB Lookup & Package Inventory Retrieval                */
/* -------------------------------------------------------------------------- */

const LookupQuerySchema = z.object({
  pmb: z.string().optional(),
  name: z.string().optional(),
  tracking: z.string().optional(),
});

export const GET = withApiHandler(async (request, { user }) => {
  const { pmb, name, tracking } = validateQuery(request, LookupQuerySchema);

  if (!pmb && !name && !tracking) {
    badRequest('Provide at least one of: pmb, name, or tracking');
  }

  const tenantId = user.tenantId!;

  /* -------------------------------------------------------------------- */
  /*  Tracking number lookup — find package → resolve customer            */
  /* -------------------------------------------------------------------- */
  if (tracking) {
    const pkg = await prisma.package.findFirst({
      where: {
        trackingNumber: { contains: tracking, mode: 'insensitive' },
        status: { in: ['checked_in', 'notified', 'ready'] },
        customer: { tenantId },
      },
      include: { customer: true },
    });

    if (!pkg || !pkg.customer) {
      notFound('No unreleased package found with that tracking number');
    }

    // Return full customer + all their held packages
    const allPackages = await prisma.package.findMany({
      where: {
        customerId: pkg.customer.id,
        status: { in: ['checked_in', 'notified', 'ready'] },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    return ok({
      customer: pkg.customer,
      packages: allPackages,
      packageCount: allPackages.length,
      matchedTrackingId: pkg.id,
    });
  }

  /* -------------------------------------------------------------------- */
  /*  PMB lookup — exact or suffix match                                  */
  /* -------------------------------------------------------------------- */
  if (pmb) {
    const normalized = pmb.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { pmbNumber: { equals: pmb.trim(), mode: 'insensitive' } },
          { pmbNumber: { endsWith: normalized, mode: 'insensitive' } },
        ],
        status: { not: 'closed' },
        tenantId,
      },
    });

    if (!customer) {
      notFound(`No active customer found for PMB "${pmb}"`);
    }

    const packages = await prisma.package.findMany({
      where: {
        customerId: customer.id,
        status: { in: ['checked_in', 'notified', 'ready'] },
      },
      orderBy: { checkedInAt: 'desc' },
    });

    return ok({
      customer,
      packages,
      packageCount: packages.length,
    });
  }

  /* -------------------------------------------------------------------- */
  /*  Name search — fuzzy on first/last/business name                     */
  /* -------------------------------------------------------------------- */
  if (name && name.trim().length >= 2) {
    const q = name.trim();

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { businessName: { contains: q, mode: 'insensitive' } },
        ],
        status: { not: 'closed' },
        tenantId,
      },
      take: 10,
      orderBy: { lastName: 'asc' },
    });

    if (customers.length === 0) {
      notFound(`No customer found matching "${name}"`);
    }

    // If exactly one match, also return their packages
    if (customers.length === 1) {
      const packages = await prisma.package.findMany({
        where: {
          customerId: customers[0].id,
          status: { in: ['checked_in', 'notified', 'ready'] },
        },
        orderBy: { checkedInAt: 'desc' },
      });

      return ok({
        customer: customers[0],
        packages,
        packageCount: packages.length,
      });
    }

    // Multiple matches — return list for user to pick
    return ok({
      customers,
      matchCount: customers.length,
    });
  }

  badRequest('Name search requires at least 2 characters');
});
