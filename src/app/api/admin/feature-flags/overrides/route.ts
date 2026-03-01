import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const CreateOverrideSchema = z.object({
  flagId: z.string().min(1),
  targetType: z.enum(['user', 'tenant']),
  targetId: z.string().min(1),
  enabled: z.boolean(),
});

const DeleteOverrideSchema = z.object({
  overrideId: z.string().min(1),
});

/**
 * POST /api/admin/feature-flags/overrides
 *
 * Create or update an override for a flag.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const { flagId, targetType, targetId, enabled } = await validateBody(request, CreateOverrideSchema);

  // Upsert: create or update the override
  const override = await prisma.featureFlagOverride.upsert({
    where: {
      flagId_targetType_targetId: { flagId, targetType, targetId },
    },
    update: { enabled },
    create: { flagId, targetType, targetId, enabled },
  });

  return ok(override);
});

/**
 * DELETE /api/admin/feature-flags/overrides
 *
 * Remove an override.
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const { overrideId } = await validateBody(request, DeleteOverrideSchema);

  await prisma.featureFlagOverride.delete({ where: { id: overrideId } });

  return ok({ success: true });
});
