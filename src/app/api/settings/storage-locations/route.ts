import { withApiHandler, validateBody, validateQuery, ok, created, notFound, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
});

const PatchLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const ReorderSchema = z.object({
  order: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.number().int(),
  })),
});

const DeleteQuerySchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/settings/storage-locations
 * Returns all active storage locations for the current tenant.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  const locations = await prisma.storageLocation.findMany({
    where: { tenantId: user.tenantId!, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return ok({ locations });
});

/**
 * POST /api/settings/storage-locations
 * Create a new storage location. Requires admin or superadmin.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Insufficient permissions');
  }

  const { name, isDefault } = await validateBody(request, CreateLocationSchema);

  // Get next sort order
  const maxSort = await prisma.storageLocation.aggregate({
    where: { tenantId: user.tenantId!, isActive: true },
    _max: { sortOrder: true },
  });
  const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.storageLocation.updateMany({
      where: { tenantId: user.tenantId!, isDefault: true },
      data: { isDefault: false },
    });
  }

  const location = await prisma.storageLocation.create({
    data: {
      tenantId: user.tenantId!,
      name: name.trim(),
      sortOrder: nextSort,
      isDefault: isDefault || false,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'storage_location_created',
      entityType: 'storage_location',
      entityId: location.id,
      details: JSON.stringify({ name: location.name, isDefault: location.isDefault }),
      userId: user.id,
    },
  });

  return created({ location });
});

/**
 * PATCH /api/settings/storage-locations
 * Update a storage location (name, isDefault, sortOrder). Requires admin or superadmin.
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Insufficient permissions');
  }

  const { id, name, isDefault, sortOrder } = await validateBody(request, PatchLocationSchema);

  // Verify ownership
  const existing = await prisma.storageLocation.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!existing) notFound('Location not found');

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.storageLocation.updateMany({
      where: { tenantId: user.tenantId!, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.storageLocation.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'storage_location_updated',
      entityType: 'storage_location',
      entityId: id,
      details: JSON.stringify({ name: updated.name, isDefault: updated.isDefault }),
      userId: user.id,
    },
  });

  return ok({ location: updated });
});

/**
 * DELETE /api/settings/storage-locations?id=xxx
 * Soft-delete a storage location (set isActive=false). Requires admin or superadmin.
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Insufficient permissions');
  }

  const { id } = validateQuery(request, DeleteQuerySchema);

  // Verify ownership
  const existing = await prisma.storageLocation.findFirst({
    where: { id, tenantId: user.tenantId! },
  });
  if (!existing) notFound('Location not found');

  // Soft-delete
  await prisma.storageLocation.update({
    where: { id },
    data: { isActive: false, isDefault: false },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'storage_location_deleted',
      entityType: 'storage_location',
      entityId: id,
      details: JSON.stringify({ name: existing!.name }),
      userId: user.id,
    },
  });

  return ok({ success: true });
});

/**
 * PUT /api/settings/storage-locations
 * Reorder storage locations. Expects { order: [{ id, sortOrder }] }.
 */
export const PUT = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Insufficient permissions');
  }

  const { order } = await validateBody(request, ReorderSchema);

  // Update sort orders in a transaction
  await prisma.$transaction(
    order.map((item) =>
      prisma.storageLocation.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  // Fetch updated list
  const locations = await prisma.storageLocation.findMany({
    where: { tenantId: user.tenantId!, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return ok({ locations });
});
