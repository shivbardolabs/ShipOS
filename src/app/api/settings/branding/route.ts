import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/branding
 * Returns branding settings for the current tenant.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        brandLogo: true,
        brandAccentColor: true,
        brandTagline: true,
        brandFavicon: true,
      },
    });

    return NextResponse.json({ branding: tenant });
  } catch (err) {
    console.error('[GET /api/settings/branding]', err);
    return NextResponse.json({ error: 'Failed to fetch branding' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/branding
 * Updates branding settings for the current tenant.
 * Requires admin or superadmin role.
 */
export async function PUT(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { brandLogo, brandAccentColor, brandTagline, brandFavicon } = body;

    // Validate hex color if provided
    if (brandAccentColor && !/^#[0-9a-fA-F]{6}$/.test(brandAccentColor)) {
      return NextResponse.json({ error: 'Invalid hex color format' }, { status: 400 });
    }

    const updated = await prisma.tenant.update({
      where: { id: user.tenantId },
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
        entityId: user.tenantId,
        details: JSON.stringify({ brandLogo, brandAccentColor, brandTagline, brandFavicon }),
        userId: user.id,
      },
    });

    return NextResponse.json({ branding: updated });
  } catch (err) {
    console.error('[PUT /api/settings/branding]', err);
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
  }
}
