import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const UpdateBrandingSchema = z.object({
  brandLogo: z.string().nullable().optional(),
  brandAccentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color format').nullable().optional(),
  brandTagline: z.string().nullable().optional(),
  brandFavicon: z.string().nullable().optional(),
});

/**
 * GET /api/settings/branding
 * Returns branding settings for the current tenant.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId! },
    select: {
      id: true,
      name: true,
      brandLogo: true,
      brandAccentColor: true,
      brandTagline: true,
      brandFavicon: true,
    },
  });

  return ok({ branding: tenant });
});

/**
 * PUT /api/settings/branding
 * Updates branding settings for the current tenant.
 * Requires admin or superadmin role.
 */
export const PUT = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Insufficient permissions');
  }

  const { brandLogo, brandAccentColor, brandTagline, brandFavicon } =
    await validateBody(request, UpdateBrandingSchema);

  const updated = await prisma.tenant.update({
    where: { id: user.tenantId! },
    data: {
      brandLogo: brandLogo ?? undefined,
      brandAccentColor: brandAccentColor ?? undefined,
      brandTagline: brandTagline ?? undefined,
      brandFavicon: brandFavicon ?? undefined,
    },
    select: {
      id: true,
      name: true,
      brandLogo: true,
      brandAccentColor: true,
      brandTagline: true,
      brandFavicon: true,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'branding_updated',
      entityType: 'tenant',
      entityId: user.tenantId!,
      details: JSON.stringify({ brandLogo, brandAccentColor, brandTagline, brandFavicon }),
      userId: user.id,
    },
  });

  return ok({ branding: updated });
});
