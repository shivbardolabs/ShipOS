import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/packages/rts/report
 *
 * RTS reporting: volume, reason breakdown, carrier distribution, step status.
 * Query params: from?, to? (ISO date strings), format? (json | csv)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const format = searchParams.get('format') || 'json';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (user.role !== 'superadmin' && user.tenantId) {
      where.tenantId = user.tenantId;
    }

    if (fromStr || toStr) {
      where.createdAt = {};
      if (fromStr) where.createdAt.gte = new Date(fromStr);
      if (toStr) where.createdAt.lte = new Date(toStr);
    }

    // Get all RTS records in range for aggregation
    const records = await prisma.returnToSender.findMany({
      where,
      select: {
        id: true,
        reason: true,
        step: true,
        carrier: true,
        pmbNumber: true,
        packageId: true,
        mailPieceId: true,
        initiatedAt: true,
        completedAt: true,
        cancelledAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = records.length;

    // Reason breakdown
    const reasonCounts: Record<string, number> = {};
    // Step breakdown
    const stepCounts: Record<string, number> = {};
    // Carrier breakdown
    const carrierCounts: Record<string, number> = {};
    // Type breakdown (package vs mail)
    let packageCount = 0;
    let mailCount = 0;

    // Average time to complete (initiated → completed)
    const completionTimes: number[] = [];

    for (const r of records) {
      // Reason
      reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
      // Step
      stepCounts[r.step] = (stepCounts[r.step] || 0) + 1;
      // Carrier
      const c = r.carrier || 'unknown';
      carrierCounts[c] = (carrierCounts[c] || 0) + 1;
      // Type
      if (r.packageId) packageCount++;
      if (r.mailPieceId) mailCount++;
      // Completion time
      if (r.completedAt) {
        const ms = r.completedAt.getTime() - r.initiatedAt.getTime();
        completionTimes.push(ms);
      }
    }

    const avgCompletionHours =
      completionTimes.length > 0
        ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) / 3600000 * 10) / 10
        : null;

    const report = {
      period: {
        from: fromStr || 'all-time',
        to: toStr || 'now',
      },
      summary: {
        total: totalCount,
        packages: packageCount,
        mailPieces: mailCount,
        avgCompletionHours,
      },
      byReason: reasonCounts,
      byStep: stepCounts,
      byCarrier: carrierCounts,
    };

    if (format === 'csv') {
      const csvLines = [
        'id,reason,step,carrier,pmbNumber,type,initiatedAt,completedAt',
        ...records.map((r) =>
          [
            r.id,
            r.reason,
            r.step,
            r.carrier || '',
            r.pmbNumber || '',
            r.packageId ? 'package' : 'mail',
            r.initiatedAt.toISOString(),
            r.completedAt?.toISOString() || '',
          ].join(','),
        ),
      ];
      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rts-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error('[GET /api/packages/rts/report]', err);
    return NextResponse.json({ error: 'Failed to generate RTS report' }, { status: 500 });
  }
}
