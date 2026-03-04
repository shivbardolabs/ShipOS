/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/compliance/closures
 * BAR-234: Pending CRD Closure report — shows all PMBs that need CRD update.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const customers = await prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'closed',
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pmbNumber: true,
        status: true,
        dateClosed: true,
        closureReason: true,
        crdClosureStatus: true,
        crdClosureDate: true,
        documentRetentionUntil: true,
        retentionOfferResult: true,
      },
      orderBy: { dateClosed: 'desc' },
    });

    const now = new Date();
    const enriched = customers.map((c: any) => {
      const dateClosed = c.dateClosed ? new Date(c.dateClosed) : null;
      const daysSinceClosure = dateClosed
        ? Math.ceil((now.getTime() - dateClosed.getTime()) / 86400000)
        : 0;
      const crdOverdue = c.crdClosureStatus === 'pending' && daysSinceClosure > 0;

      return {
        ...c,
        dateClosed: c.dateClosed?.toISOString() ?? null,
        crdClosureDate: c.crdClosureDate?.toISOString() ?? null,
        documentRetentionUntil: c.documentRetentionUntil?.toISOString() ?? null,
        daysSinceClosure,
        crdOverdue,
      };
    });

    // Summary counts
    const pendingCrd = enriched.filter((c) => c.crdClosureStatus === 'pending').length;
    const submittedCrd = enriched.filter((c) => c.crdClosureStatus === 'submitted').length;
    const confirmedCrd = enriched.filter((c) => c.crdClosureStatus === 'confirmed').length;
    const overdueCrd = enriched.filter((c) => c.crdOverdue).length;

    return NextResponse.json({
      closures: enriched,
      summary: {
        total: enriched.length,
        pendingCrd,
        submittedCrd,
        confirmedCrd,
        overdueCrd,
      },
    });
  } catch (err) {
    console.error('[GET /api/compliance/closures]', err);
    return NextResponse.json({ error: 'Failed to fetch closure data' }, { status: 500 });
  }
});
