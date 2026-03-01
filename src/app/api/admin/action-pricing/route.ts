import { withApiHandler, validateBody, ok, created, notFound, badRequest, forbidden, ApiError } from '@/lib/api-utils';
import { z } from 'zod';
import {
  getActionPrices,
  createActionPrice,
  updateActionPrice,
  deleteActionPrice,
} from '@/lib/action-pricing-db';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const CreateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  retailPrice: z.number().optional(),
  unitLabel: z.string().optional(),
  hasTieredPricing: z.boolean().optional(),
  firstUnitPrice: z.number().optional(),
  additionalUnitPrice: z.number().optional(),
  cogs: z.number().optional(),
  cogsFirstUnit: z.number().optional(),
  cogsAdditionalUnit: z.number().optional(),
});

const PatchSchema = z.object({
  id: z.string().min(1),
}).passthrough();

const DeleteSchema = z.object({
  id: z.string().min(1),
});

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function requireAdminRole(role: string) {
  if (role !== 'admin' && role !== 'superadmin') {
    forbidden('Superadmin access required');
  }
}

/**
 * GET /api/admin/action-pricing
 *
 * Returns all action prices for the user's tenant with overrides.
 * Admin / superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  requireAdminRole(user.role);
  if (!user.tenantId) badRequest('No tenant associated');

  const prices = await getActionPrices(user.tenantId!);

  // Also fetch customers for the override UI
  const { default: prisma } = await import('@/lib/prisma');
  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId!, status: 'active' },
    orderBy: { lastName: 'asc' },
    select: { id: true, firstName: true, lastName: true, pmbNumber: true, platform: true },
  });

  return ok({ prices, customers });
});

/**
 * POST /api/admin/action-pricing
 *
 * Create a new action price.
 */
export const POST = withApiHandler(async (request, { user }) => {
  requireAdminRole(user.role);
  if (!user.tenantId) badRequest('No tenant associated');

  const body = await validateBody(request, CreateSchema);

  try {
    const price = await createActionPrice(user.tenantId!, body);
    return created(price);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      throw new ApiError('An action with this key already exists', 409);
    }
    throw err;
  }
});

/**
 * PATCH /api/admin/action-pricing
 *
 * Update an existing action price.
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  requireAdminRole(user.role);
  if (!user.tenantId) badRequest('No tenant associated');

  const { id, ...data } = await validateBody(request, PatchSchema);

  const updated = await updateActionPrice(id, user.tenantId!, data);
  if (!updated) notFound('Not found or no changes');

  return ok(updated);
});

/**
 * DELETE /api/admin/action-pricing
 *
 * Delete an action price (cascades to overrides).
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  requireAdminRole(user.role);
  if (!user.tenantId) badRequest('No tenant associated');

  const { id } = await validateBody(request, DeleteSchema);

  const deleted = await deleteActionPrice(id, user.tenantId!);
  if (!deleted) notFound('Not found');

  return ok({ success: true });
});
