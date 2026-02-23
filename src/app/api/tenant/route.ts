import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/tenant
 * Returns the current user's tenant (store information).
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 404 });

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    return NextResponse.json(tenant);
  } catch (err) {
    console.error('[GET /api/tenant]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PUT /api/tenant
 * Updates the current user's tenant settings.
 * Only admins can update tenant settings.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 404 });

    const body = await req.json();

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
}
