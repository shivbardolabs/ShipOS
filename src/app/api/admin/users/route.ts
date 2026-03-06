import { withApiHandler, validateBody, ok, notFound, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const PatchUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['superadmin', 'admin', 'manager', 'employee']).optional(),
  tenantId: z.string().nullable().optional(),
});

/**
 * GET /api/admin/users
 * Returns ALL users across ALL tenants. Superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const users = await prisma.user.findMany({
    orderBy: { lastLoginAt: { sort: 'desc', nulls: 'last' } },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { loginSessions: true },
      },
    },
  });

  const result = users.map((u) => ({
    id: u.id,
    auth0Id: u.auth0Id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    loginCount: u.loginCount,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    tenant: u.tenant
      ? { id: u.tenant.id, name: u.tenant.name, slug: u.tenant.slug }
      : null,
    sessionCount: u._count.loginSessions,
  }));

  return ok(result);
});

/**
 * PATCH /api/admin/users
 * Update a user's role and/or tenant assignment. Superadmin only.
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const { userId, role, tenantId } = await validateBody(request, PatchUserSchema);

  // Validate the target user exists
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) notFound('User not found');

  // Build update payload
  const data: Record<string, unknown> = {};

  // Role update
  if (role !== undefined) {
    data.role = role;
  }

  // Tenant assignment (null = unassign)
  if (tenantId !== undefined) {
    if (tenantId !== null) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) notFound('Tenant not found');
    }
    data.tenantId = tenantId;
  }

  if (Object.keys(data).length === 0) {
    badRequest('Nothing to update');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    include: {
      tenant: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: { loginSessions: true },
      },
    },
  });

  return ok({
    id: updated.id,
    auth0Id: updated.auth0Id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    avatar: updated.avatar,
    lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
    loginCount: updated.loginCount,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    tenant: updated.tenant
      ? { id: updated.tenant.id, name: updated.tenant.name, slug: updated.tenant.slug }
      : null,
    sessionCount: updated._count.loginSessions,
  });
});
