import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import {
  getActionPrices,
  createActionPrice,
  updateActionPrice,
  deleteActionPrice,
} from '@/lib/action-pricing-db';

/**
 * GET /api/admin/action-pricing
 *
 * Returns all action prices for the user's tenant with overrides.
 * Superadmin only.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!me.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const prices = await getActionPrices(me.tenantId);

    // Also fetch customers for the override UI
    const { default: prisma } = await import('@/lib/prisma');
    const customers = await prisma.customer.findMany({
      where: { tenantId: me.tenantId, status: 'active' },
      orderBy: { lastName: 'asc' },
      select: { id: true, firstName: true, lastName: true, pmbNumber: true, platform: true },
    });

    return NextResponse.json({ prices, customers });
  } catch (err) {
    console.error('[GET /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/action-pricing
 *
 * Create a new action price.
 * Body: { key, name, description?, category?, retailPrice?, unitLabel?,
 *         hasTieredPricing?, firstUnitPrice?, additionalUnitPrice?,
 *         cogs?, cogsFirstUnit?, cogsAdditionalUnit? }
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!me.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const body = await req.json();
    if (!body.key || !body.name) {
      return NextResponse.json({ error: 'key and name are required' }, { status: 400 });
    }

    const price = await createActionPrice(me.tenantId, body);
    return NextResponse.json(price, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'An action with this key already exists' }, { status: 409 });
    }
    console.error('[POST /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/action-pricing
 *
 * Update an existing action price.
 * Body: { id, ...fields }
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!me.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id, ...data } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updated = await updateActionPrice(id, me.tenantId, data);
    if (!updated) {
      return NextResponse.json({ error: 'Not found or no changes' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/action-pricing
 *
 * Delete an action price (cascades to overrides).
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    if (!me.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 400 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteActionPrice(id, me.tenantId);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/action-pricing]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
