import { withApiHandler, validateBody, ok, forbidden, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { hasPermission, type UserRole } from '@/lib/permissions';
import { z } from 'zod';

/**
 * GET /api/users
 * Lists all active (non-deleted) users in the current tenant.
 * Includes status field for user lifecycle management.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) return ok([]);

  const users = await prisma.user.findMany({
    where: {
      tenantId: user.tenantId,
      deletedAt: null, // Filter out soft-deleted users
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok(users);
});

/**
 * PUT /api/users  (body: { userId, role?, status? })
 * Updates a user's role and/or status. Admin only.
 */

const UpdateUserSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const PUT = withApiHandler(async (request, { user }) => {
  // RBAC permission check — manage_users required for role/status changes
  if (!hasPermission(user.role as UserRole, 'manage_users')) {
    forbidden('Insufficient permissions');
  }

  const { userId, role, status } = await validateBody(request, UpdateUserSchema);

  // Ensure target user belongs to same tenant and is not deleted
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== user.tenantId || target.deletedAt !== null) {
    notFound('User not found');
  }

  // Prevent self-deactivation
  if (userId === user.id && status && status !== 'active') {
    badRequest('Cannot deactivate yourself');
  }

  // Build update data
  const updateData: Prisma.UserUpdateInput = {};
  if (role) updateData.role = role;
  if (status) updateData.status = status;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok(updated);
});

/**
 * DELETE /api/users  (body: { userId })
 * Soft-deletes a user (sets deletedAt). Admin only.
 * User is filtered from all queries but data is preserved.
 */

const DeleteUserSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const DELETE = withApiHandler(async (request, { user }) => {
  // RBAC permission check — deactivate_users required for soft delete
  if (!hasPermission(user.role as UserRole, 'deactivate_users')) {
    forbidden('Insufficient permissions');
  }

  const { userId } = await validateBody(request, DeleteUserSchema);

  // Cannot soft-delete yourself
  if (userId === user.id) {
    badRequest('Cannot delete yourself');
  }

  // Ensure target user belongs to same tenant
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== user.tenantId) {
    notFound('User not found');
  }

  // Soft delete — set deletedAt and mark as inactive
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      status: 'inactive',
    },
  });

  return ok({ ok: true });
});
