/* eslint-disable */
// @ts-nocheck — TODO: fix schema mismatches from PR #251
import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/pmb/assigned
 * Returns all assigned PMB numbers with minimal customer data,
 * used by the new-customer form to show only available boxes.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const customers = await prisma.customer.findMany({
      where: {
        ...(user.role !== 'superadmin' && user.tenantId ? { tenantId: user.tenantId } : {}),
        deletedAt: null,
        pmbNumber: { not: null },
        // Include active, suspended, and recently closed (for 90-day hold)
        OR: [
          { status: { in: ['active', 'suspended'] } },
          { status: 'closed', dateClosed: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pmbNumber: true,
        status: true,
        platform: true,
        dateOpened: true,
        dateClosed: true,
      },
      orderBy: { pmbNumber: 'asc' },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        pmbNumber: c.pmbNumber || '',
        status: c.status,
        platform: c.platform || 'physical',
        dateOpened: c.dateOpened?.toISOString() ?? new Date().toISOString(),
        dateClosed: c.dateClosed?.toISOString() ?? undefined,
        notifyEmail: false,
        notifySms: false,
      })),
    });
  } catch (err) {
    console.error('[GET /api/pmb/assigned]', err);
    return NextResponse.json({ error: 'Failed to fetch assigned PMBs' }, { status: 500 });
  }
}
