import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, validateQuery, ok, created, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const CreateStoreBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional().default('America/New_York'),
});

const UpdateStoreBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const DeleteStoreQuerySchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/stores
 * List all stores (tenants) the current user can see.
 * Superadmin: all. Admin: own tenant only.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (user.role === 'superadmin') {
    const stores = await prisma.tenant.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, customers: true } } },
    });
    return ok({ stores });
  }

  if (!user.tenantId) return badRequest('No tenant');

  const store = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    include: { _count: { select: { users: true, customers: true } } },
  });

  if (!store) return notFound('Store not found');
  return ok({ stores: [store] });
});

/**
 * POST /api/stores
 * Create a new store (superadmin/admin only).
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const body = await validateBody(request, CreateStoreBodySchema);

  const store = await prisma.tenant.create({
    data: {
      name: body.name,
      slug: body.slug,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zipCode: body.zipCode ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      timezone: body.timezone,
      status: 'active',
    },
  });

  return created({ store });
});

/**
 * PATCH /api/stores
 * Update a store's settings (admin only).
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin'].includes(user.role)) {
    return forbidden('Admin role required');
  }

  const body = await validateBody(request, UpdateStoreBodySchema);

  // Verify access
  if (user.role !== 'superadmin' && body.id !== user.tenantId) {
    return forbidden('Cannot update a store you do not belong to');
  }

  const store = await prisma.tenant.update({
    where: { id: body.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.state !== undefined && { state: body.state }),
      ...(body.zipCode !== undefined && { zipCode: body.zipCode }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      ...(body.status !== undefined && { status: body.status }),
    },
  });

  return ok({ store });
});

/**
 * DELETE /api/stores?id=xxx
 * Deactivate a store (superadmin only).
 */
export const DELETE = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin') {
    return forbidden('Superadmin role required');
  }

  const query = validateQuery(request, DeleteStoreQuerySchema);

  await prisma.tenant.update({
    where: { id: query.id },
    data: { status: 'inactive' },
  });

  return ok({ success: true });
});
