import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/settings/storage-locations
 * Returns all active storage locations for the current tenant.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const locations = await prisma.storageLocation.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ locations });
  } catch (err) {
    console.error('[GET /api/settings/storage-locations]', err);
    return NextResponse.json({ error: 'Failed to fetch storage locations' }, { status: 500 });
  }
});

/**
 * POST /api/settings/storage-locations
 * Create a new storage location. Requires admin or superadmin.
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, isDefault } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get next sort order
    const maxSort = await prisma.storageLocation.aggregate({
      where: { tenantId: user.tenantId, isActive: true },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.storageLocation.updateMany({
        where: { tenantId: user.tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const location = await prisma.storageLocation.create({
      data: {
        tenantId: user.tenantId,
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

    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/settings/storage-locations]', err);
    return NextResponse.json({ error: 'Failed to create storage location' }, { status: 500 });
  }
});

/**
 * PATCH /api/settings/storage-locations
 * Update a storage location (name, isDefault, sortOrder). Requires admin or superadmin.
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, isDefault, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.storageLocation.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.storageLocation.updateMany({
        where: { tenantId: user.tenantId, isDefault: true, id: { not: id } },
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

    return NextResponse.json({ location: updated });
  } catch (err) {
    console.error('[PATCH /api/settings/storage-locations]', err);
    return NextResponse.json({ error: 'Failed to update storage location' }, { status: 500 });
  }
});

/**
 * DELETE /api/settings/storage-locations?id=xxx
 * Soft-delete a storage location (set isActive=false). Requires admin or superadmin.
 */
export const DELETE = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.storageLocation.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

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
        details: JSON.stringify({ name: existing.name }),
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/settings/storage-locations]', err);
    return NextResponse.json({ error: 'Failed to delete storage location' }, { status: 500 });
  }
});

/**
 * PUT /api/settings/storage-locations
 * Reorder storage locations. Expects { order: [{ id, sortOrder }] }.
 */
export const PUT = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'Order array is required' }, { status: 400 });
    }

    // Update sort orders in a transaction
    await prisma.$transaction(
      order.map((item: { id: string; sortOrder: number }) =>
        prisma.storageLocation.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    // Fetch updated list
    const locations = await prisma.storageLocation.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ locations });
  } catch (err) {
    console.error('[PUT /api/settings/storage-locations]', err);
    return NextResponse.json({ error: 'Failed to reorder storage locations' }, { status: 500 });
  }
});
