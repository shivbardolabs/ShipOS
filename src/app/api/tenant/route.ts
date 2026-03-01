import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schema: Safe fields allowlist for updates ───────────────────────────── */

const UpdateTenantBodySchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional(),
  brandColor: z.string().optional(),
  businessHours: z.string().optional(), // JSON string of hours
  notificationPreferences: z.string().optional(), // JSON string
});

/**
 * GET /api/tenant
 * Get the current user's tenant configuration.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
  });

  if (!tenant) return notFound('Tenant not found');

  return ok({ tenant });
});

/**
 * PUT /api/tenant
 * Update tenant settings (admin only). Only safe fields in allowlist.
 */
export const PUT = withApiHandler(async (request: NextRequest, { user }) => {
  if (!['admin', 'superadmin'].includes(user.role)) {
    return forbidden('Admin role required');
  }
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, UpdateTenantBodySchema);

  // Build update data from only the provided fields
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return badRequest('No fields to update');
  }

  const tenant = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: updateData,
  });

  return ok({ tenant });
});
