import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/printer
 * Returns printer configuration for the current tenant.
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

    const printers = await prisma.printerConfig.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ printers });
  } catch (err) {
    console.error('[GET /api/settings/printer]', err);
    return NextResponse.json({ error: 'Failed to fetch printers' }, { status: 500 });
  }
}

/**
 * POST /api/settings/printer
 * Creates or updates a printer configuration.
 */
export async function POST(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, type, ipAddress, port, isDefault } = body;

    if (id) {
      // Update existing
      const printer = await prisma.printerConfig.update({
        where: { id },
        data: {
          name: name || undefined,
          type: type || undefined,
          ipAddress: ipAddress ?? undefined,
          port: port ?? undefined,
          isDefault: isDefault ?? undefined,
        },
      });
      return NextResponse.json({ printer });
    }

    // Create new
    // If making this default, unset other defaults
    if (isDefault) {
      await prisma.printerConfig.updateMany({
        where: { tenantId: user.tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const printer = await prisma.printerConfig.create({
      data: {
        tenantId: user.tenantId,
        name: name || 'ZPL Printer',
        type: type || 'zpl',
        ipAddress: ipAddress || null,
        port: port || 9100,
        isDefault: isDefault ?? true,
      },
    });

    return NextResponse.json({ printer });
  } catch (err) {
    console.error('[POST /api/settings/printer]', err);
    return NextResponse.json({ error: 'Failed to save printer' }, { status: 500 });
  }
}
