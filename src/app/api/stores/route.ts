import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/stores — List stores for the current tenant
 * POST /api/stores — Create a new store
 * PATCH /api/stores — Update a store
 * DELETE /api/stores — Delete a store
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const stores = await prisma.store.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { users: true, customers: true, packages: true },
        },
      },
    });

    return NextResponse.json({ stores });
  } catch (err) {
    console.error('[GET /api/stores]', err);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const body = await req.json();
    const { name, address, city, state, zipCode, phone, isDefault } = body;

    if (!name) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }

    // If this is the default store, unset others
    if (isDefault) {
      await prisma.store.updateMany({
        where: { tenantId: user.tenantId },
        data: { isDefault: false },
      });
    }

    const store = await prisma.store.create({
      data: {
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        phone: phone || null,
        isDefault: isDefault || false,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/stores]', err);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, address, city, state, zipCode, phone, isDefault } = body;

    if (!id) return NextResponse.json({ error: 'Store id is required' }, { status: 400 });

    // Verify store belongs to tenant
    const existing = await prisma.store.findFirst({
      where: { id, tenantId: user.tenantId! },
    });
    if (!existing) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    if (isDefault) {
      await prisma.store.updateMany({
        where: { tenantId: user.tenantId! },
        data: { isDefault: false },
      });
    }

    const store = await prisma.store.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(phone !== undefined && { phone }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ store });
  } catch (err) {
    console.error('[PATCH /api/stores]', err);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Store id is required' }, { status: 400 });

    const existing = await prisma.store.findFirst({
      where: { id, tenantId: user.tenantId! },
    });
    if (!existing) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    if (existing.isDefault) {
      return NextResponse.json({ error: 'Cannot delete the default store' }, { status: 400 });
    }

    await prisma.store.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/stores]', err);
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
  }
}
