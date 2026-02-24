import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { FEATURE_FLAG_DEFINITIONS } from '@/lib/feature-flag-definitions';

/**
 * GET /api/admin/feature-flags
 *
 * Returns all feature flags with their overrides, plus tenant & user lists
 * for the override UI. Superadmin only.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    // Auto-seed any missing flags from definitions
    await seedMissingFlags();

    // Fetch all flags with overrides
    const flags = await prisma.featureFlag.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        overrides: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Also fetch tenants and users for the override UI
    const [tenants, users] = await Promise.all([
      prisma.tenant.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
      prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tenant: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({ flags, tenants, users });
  } catch (err) {
    console.error('[GET /api/admin/feature-flags]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/feature-flags
 *
 * Update a flag's default state. Body: { flagId, defaultEnabled }
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { flagId, defaultEnabled } = await req.json();
    if (!flagId || typeof defaultEnabled !== 'boolean') {
      return NextResponse.json({ error: 'flagId and defaultEnabled required' }, { status: 400 });
    }

    const flag = await prisma.featureFlag.update({
      where: { id: flagId },
      data: { defaultEnabled },
    });

    return NextResponse.json(flag);
  } catch (err) {
    console.error('[PATCH /api/admin/feature-flags]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/* ── Auto-seed missing flags ─────────────────────────────────────────────── */

async function seedMissingFlags() {
  const existing = await prisma.featureFlag.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((f) => f.key));

  const missing = FEATURE_FLAG_DEFINITIONS.filter((d) => !existingKeys.has(d.key));
  if (missing.length === 0) return;

  await prisma.featureFlag.createMany({
    data: missing.map((d) => ({
      key: d.key,
      name: d.name,
      description: d.description,
      category: d.category,
      defaultEnabled: d.defaultEnabled,
    })),
    skipDuplicates: true,
  });
}
