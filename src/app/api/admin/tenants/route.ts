import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hasPermission, type UserRole } from '@/lib/permissions';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const PatchTenantSchema = z.object({
  tenantId: z.string().min(1),
  status: z.enum(['active', 'paused', 'disabled', 'trial']),
});

/**
 * GET /api/admin/tenants
 * Returns ALL tenants with status info. Requires manage_tenants permission.
 */
export const GET = withApiHandler(async (request, { user }) => {
  // RBAC permission check — manage_tenants required for status changes
  if (!hasPermission(user.role as UserRole, 'manage_tenants')) {
    forbidden('Insufficient permissions — superadmin required');
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscriptionTier: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: { users: true },
      },
    },
  });

  const result = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    subscriptionTier: t.subscriptionTier,
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    userCount: t._count.users,
  }));

  return ok(result);
});

/**
 * PATCH /api/admin/tenants
 * Updates a tenant's status. Superadmin only.
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const { tenantId, status } = await validateBody(request, PatchTenantSchema);

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { status },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscriptionTier: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: { users: true },
      },
    },
  });

  return ok({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    subscriptionTier: tenant.subscriptionTier,
    trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    createdAt: tenant.createdAt.toISOString(),
    userCount: tenant._count.users,
  });
});
