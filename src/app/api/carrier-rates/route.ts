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
