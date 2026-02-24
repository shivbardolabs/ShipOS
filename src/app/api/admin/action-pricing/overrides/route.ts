import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import { upsertOverride, deleteOverride } from '@/lib/action-pricing-db';

/**
 * POST /api/admin/action-pricing/overrides
 *
 * Upsert a price override (segment or customer level).
 * Body: { actionPriceId, targetType, targetValue, targetLabel?,
 *         retailPrice?, firstUnitPrice?, additionalUnitPrice?,
 *         cogs?, cogsFirstUnit?, cogsAdditionalUnit? }
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.actionPriceId || !body.targetType || !body.targetValue) {
      return NextResponse.json(
        { error: 'actionPriceId, targetType, and targetValue are required' },
        { status: 400 },
      );
    }

    const override = await upsertOverride(body.actionPriceId, body);
    return NextResponse.json(override);
  } catch (err) {
    console.error('[POST /api/admin/action-pricing/overrides]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/action-pricing/overrides
 *
 * Delete a price override.
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteOverride(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/action-pricing/overrides]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
