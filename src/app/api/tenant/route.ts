import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/tenant
 * Returns the current user's tenant (store information).
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 404 });

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    return NextResponse.json(tenant);
  } catch (err) {
    console.error('[GET /api/tenant]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});

/**
 * PUT /api/tenant
 * Updates the current user's tenant settings.
 * Only admins can update tenant settings.
 */
export const PUT = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 404 });

    const body = await request.json();

    // Only allow safe fields
    const allowedFields = [
      'name', 'address', 'city', 'state', 'zipCode', 'country',
      'phone', 'email', 'timezone', 'businessHours', 'taxRate', 'logoUrl',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) data[key] = body[key];
    }

    const tenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data,
    });

    return NextResponse.json(tenant);
  } catch (err) {
    console.error('[PUT /api/tenant]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
