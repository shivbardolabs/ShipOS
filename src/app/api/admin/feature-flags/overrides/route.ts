import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/admin/feature-flags/overrides
 *
 * Create or update an override for a flag.
 * Body: { flagId, targetType: 'user'|'tenant', targetId, enabled }
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { flagId, targetType, targetId, enabled } = await req.json();

    if (!flagId || !targetType || !targetId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'flagId, targetType, targetId, and enabled are required' },
        { status: 400 },
      );
    }

    if (!['user', 'tenant'].includes(targetType)) {
      return NextResponse.json({ error: 'targetType must be "user" or "tenant"' }, { status: 400 });
    }

    // Upsert: create or update the override
    const override = await prisma.featureFlagOverride.upsert({
      where: {
        flagId_targetType_targetId: { flagId, targetType, targetId },
      },
      update: { enabled },
      create: { flagId, targetType, targetId, enabled },
    });

    return NextResponse.json(override);
  } catch (err) {
    console.error('[POST /api/admin/feature-flags/overrides]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/feature-flags/overrides
 *
 * Remove an override. Body: { overrideId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { overrideId } = await req.json();
    if (!overrideId) {
      return NextResponse.json({ error: 'overrideId required' }, { status: 400 });
    }

    await prisma.featureFlagOverride.delete({ where: { id: overrideId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/feature-flags/overrides]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
