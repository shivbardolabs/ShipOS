import { withApiHandler, validateBody, ok, notFound, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import { upsertOverride, deleteOverride } from '@/lib/action-pricing-db';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const UpsertOverrideSchema = z.object({
  actionPriceId: z.string().min(1),
  targetType: z.string().min(1),
  targetValue: z.string().min(1),
  targetLabel: z.string().optional(),
  retailPrice: z.number().optional(),
  firstUnitPrice: z.number().optional(),
  additionalUnitPrice: z.number().optional(),
  cogs: z.number().optional(),
  cogsFirstUnit: z.number().optional(),
  cogsAdditionalUnit: z.number().optional(),
});

const DeleteOverrideSchema = z.object({
  id: z.string().min(1),
});

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function requireAdminRole(role: string) {
  if (role !== 'admin' && role !== 'superadmin') {
    forbidden('Superadmin access required');
  }
}

/**
 * POST /api/admin/action-pricing/overrides
 *
 * Upsert a price override (segment or customer level).
 */
export const POST = withApiHandler(async (request, { user }) => {
  requireAdminRole(user.role);

  const body = await validateBody(request, UpsertOverrideSchema);
  const override = await upsertOverride(body.actionPriceId, body);

  return ok(override);
});

/**
 * DELETE /api/admin/action-pricing/overrides
 *
 * Delete a price override.
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  requireAdminRole(user.role);

  const { id } = await validateBody(request, DeleteOverrideSchema);

  const deleted = await deleteOverride(id);
  if (!deleted) notFound('Not found');

  return ok({ success: true });
});
