import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  GET /api/packages/checkout/lookup                                         */
/*  BAR-103: Customer/PMB Lookup & Package Inventory Retrieval                */
/*                                                                            */
/*  Query params:                                                             */
/*    pmb       — PMB number (exact or partial match)                         */
/*    name      — Customer name (fuzzy search)                                */
/*    tracking  — Tracking number lookup                                      */
/*    tenantId  — Required for multi-tenant filtering                         */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pmb = searchParams.get('pmb');
    const name = searchParams.get('name');
    const tracking = searchParams.get('tracking');
    const tenantId = searchParams.get('tenantId');

    if (!pmb && !name && !tracking) {
      return NextResponse.json(
        { error: 'Provide at least one of: pmb, name, or tracking' },
        { status: 400 },
      );
    }

    /* -------------------------------------------------------------------- */
    /*  Tracking number lookup — find package → resolve customer            */
    /* -------------------------------------------------------------------- */
    if (tracking) {
      const pkg = await prisma.package.findFirst({
        where: {
          trackingNumber: { contains: tracking, mode: 'insensitive' },
          status: { in: ['checked_in', 'notified', 'ready'] },
          ...(tenantId ? { customer: { store: { tenantId } } } : {}),
        },
        include: { customer: true },
      });

      if (!pkg || !pkg.customer) {
        return NextResponse.json(
          { error: 'No unreleased package found with that tracking number' },
          { status: 404 },
        );
      }

      // Return full customer + all their held packages
      const allPackages = await prisma.package.findMany({
        where: {
          customerId: pkg.customer.id,
          status: { in: ['checked_in', 'notified', 'ready'] },
        },
        orderBy: { checkedInAt: 'desc' },
      });

      return NextResponse.json({
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
          ...(tenantId ? { store: { tenantId } } : {}),
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: `No active customer found for PMB "${pmb}"` },
          { status: 404 },
        );
      }

      const packages = await prisma.package.findMany({
        where: {
          customerId: customer.id,
          status: { in: ['checked_in', 'notified', 'ready'] },
        },
        orderBy: { checkedInAt: 'desc' },
      });

      return NextResponse.json({
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
          ...(tenantId ? { store: { tenantId } } : {}),
        },
        take: 10,
        orderBy: { lastName: 'asc' },
      });

      if (customers.length === 0) {
        return NextResponse.json(
          { error: `No customer found matching "${name}"` },
          { status: 404 },
        );
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

        return NextResponse.json({
          customer: customers[0],
          packages,
          packageCount: packages.length,
        });
      }

      // Multiple matches — return list for user to pick
      return NextResponse.json({
        customers,
        matchCount: customers.length,
      });
    }

    return NextResponse.json(
      { error: 'Name search requires at least 2 characters' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[checkout/lookup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to look up customer' },
      { status: 500 },
    );
  }
}
