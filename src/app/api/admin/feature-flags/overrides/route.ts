import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * POST /api/admin/feature-flags/overrides
 *
 * Create or update an override for a flag.
 * Body: { flagId, targetType: 'user'|'tenant', targetId, enabled }
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { flagId, targetType, targetId, enabled } = await request.json();

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
});

/**
 * DELETE /api/admin/feature-flags/overrides
 *
 * Remove an override. Body: { overrideId }
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { overrideId } = await request.json();
    if (!overrideId) {
      return NextResponse.json({ error: 'overrideId required' }, { status: 400 });
    }

    await prisma.featureFlagOverride.delete({ where: { id: overrideId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/feature-flags/overrides]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
