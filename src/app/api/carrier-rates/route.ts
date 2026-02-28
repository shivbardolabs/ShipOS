import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/carrier-rates
 * List all carrier rates.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rates = await prisma.carrierRate.findMany({
      orderBy: [{ carrier: 'asc' }, { service: 'asc' }],
    });

    return NextResponse.json({ carrierRates: rates });
  } catch (err) {
    console.error('[GET /api/carrier-rates]', err);
    return NextResponse.json({ error: 'Failed to fetch carrier rates' }, { status: 500 });
  }
}

/**
 * PUT /api/carrier-rates
 * Update an individual carrier rate.
 */
export async function PUT(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, retailRate, marginType, marginValue, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rate ID is required' }, { status: 400 });
    }

    const rate = await prisma.carrierRate.update({
      where: { id },
      data: {
        retailRate: retailRate !== undefined ? retailRate : undefined,
        marginType: marginType || undefined,
        marginValue: marginValue !== undefined ? marginValue : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json({ rate });
  } catch (err) {
    console.error('[PUT /api/carrier-rates]', err);
    return NextResponse.json({ error: 'Failed to update rate' }, { status: 500 });
  }
}
