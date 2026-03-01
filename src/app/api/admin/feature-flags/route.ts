import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { FEATURE_FLAG_DEFINITIONS } from '@/lib/feature-flag-definitions';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const PatchFlagSchema = z.object({
  flagId: z.string().min(1),
  defaultEnabled: z.boolean(),
});

/**
 * GET /api/admin/feature-flags
 *
 * Returns all feature flags with their overrides, plus tenant & user lists
 * for the override UI. Superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
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

  return ok({ flags, tenants, users });
});

/**
 * PATCH /api/admin/feature-flags
 *
 * Update a flag's default state.
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const { flagId, defaultEnabled } = await validateBody(request, PatchFlagSchema);

  const flag = await prisma.featureFlag.update({
    where: { id: flagId },
    data: { defaultEnabled },
  });

  return ok(flag);
});

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
