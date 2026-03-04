import { NextRequest, NextResponse } from 'next/server';
import {
  getActionPrices,
  createActionPrice,
  updateActionPrice,
  deleteActionPrice,
} from '@/lib/action-pricing-db';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/admin/action-pricing
 *
 * Returns all action prices for the user's tenant with overrides.
 * Superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const prices = await getActionPrices(user.tenantId);

    // Also fetch customers for the override UI
    const { default: prisma } = await import('@/lib/prisma');
    const customers = await prisma.customer.findMany({
      where: { tenantId: user.tenantId, status: 'active' },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, pmbNumber: true, platform: true },
    });

    return NextResponse.json({ prices, customers });
  } catch (err) {
    console.error('[GET /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});

/**
 * POST /api/admin/action-pricing
 *
 * Create a new action price.
 * Body: { key, name, description?, category?, retailPrice?, unitLabel?,
 *         hasTieredPricing?, firstUnitPrice?, additionalUnitPrice?,
 *         cogs?, cogsFirstUnit?, cogsAdditionalUnit? }
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const body = await request.json();
    if (!body.key || !body.name) {
      return NextResponse.json({ error: 'key and name are required' }, { status: 400 });
    }

    const price = await createActionPrice(user.tenantId, body);
    return NextResponse.json(price, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'An action with this key already exists' }, { status: 409 });
    }
    console.error('[POST /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});

/**
 * PATCH /api/admin/action-pricing
 *
 * Update an existing action price.
 * Body: { id, ...fields }
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id, ...data } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updated = await updateActionPrice(id, user.tenantId, data);
    if (!updated) {
      return NextResponse.json({ error: 'Not found or no changes' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});

/**
 * DELETE /api/admin/action-pricing
 *
 * Delete an action price (cascades to overrides).
 * Body: { id }
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteActionPrice(id, user.tenantId);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
