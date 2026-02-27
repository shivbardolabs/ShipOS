import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { daysRemaining, holdStatus } from '@/lib/carrier-program';

/* -------------------------------------------------------------------------- */
/*  GET /api/carrier-program/inventory                                        */
/*  BAR-281: Hold Inventory — list carrier program packages                   */
/*                                                                            */
/*  Query params:                                                             */
/*    tenantId  — required                                                    */
/*    program   — fedex_hal | ups_access_point (optional filter)              */
/*    status    — ok | warning | overdue (optional aging filter)              */
/*    search    — recipient name or tracking number                           */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const tenantId = params.get('tenantId');
    const program = params.get('program');
    const agingFilter = params.get('status');
    const search = params.get('search');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Build query
    const where: Record<string, unknown> = {
      carrierProgram: program ? program : { not: null },
      status: { in: ['checked_in', 'notified', 'ready'] },
      customer: { store: { tenantId } },
    };

    if (search && search.trim().length >= 2) {
      where.OR = [
        { recipientName: { contains: search.trim(), mode: 'insensitive' } },
        { trackingNumber: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: { checkedInAt: 'asc' },
      include: { customer: { select: { id: true, pmbNumber: true } } },
    });

    // Load enrollment configs for warning thresholds
    const enrollments = await prisma.carrierProgramEnrollment.findMany({
      where: { tenantId },
    });
    const enrollmentMap = new Map(enrollments.map((e) => [e.program, e]));

    const now = new Date();

    const enriched = packages.map((pkg) => {
      const enrollment = pkg.carrierProgram
        ? enrollmentMap.get(pkg.carrierProgram)
        : null;
      const warningDays = enrollment?.warningDaysBefore ?? 2;
      const deadline = pkg.holdDeadline ?? null;
      const remaining = deadline ? daysRemaining(deadline, now) : null;
      const aging = deadline ? holdStatus(deadline, warningDays, now) : 'ok';

      return {
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        carrierProgram: pkg.carrierProgram,
        recipientName: pkg.recipientName,
        packageType: pkg.packageType,
        status: pkg.status,
        storageLocation: pkg.storageLocation,
        checkedInAt: pkg.checkedInAt,
        holdDeadline: deadline,
        daysRemaining: remaining,
        agingStatus: aging,
        carrierUploadStatus: pkg.carrierUploadStatus,
      };
    });

    // Apply aging filter if requested
    const filtered = agingFilter
      ? enriched.filter((p) => p.agingStatus === agingFilter)
      : enriched;

    // Summary stats
    const stats = {
      total: enriched.length,
      ok: enriched.filter((p) => p.agingStatus === 'ok').length,
      warning: enriched.filter((p) => p.agingStatus === 'warning').length,
      overdue: enriched.filter((p) => p.agingStatus === 'overdue').length,
      byProgram: {
        fedex_hal: enriched.filter((p) => p.carrierProgram === 'fedex_hal').length,
        ups_access_point: enriched.filter((p) => p.carrierProgram === 'ups_access_point').length,
      },
    };

    return NextResponse.json({ packages: filtered, stats });
  } catch (error) {
    console.error('[carrier-program/inventory] GET error:', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/carrier-program/inventory                                       */
/*  BAR-281: Intake a carrier program package                                 */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trackingNumber,
      carrierProgram,
      recipientName,
      storageLocation,
      packageType,
      employeeId,
      customerId,
      tenantId,
    } = body;

    if (!trackingNumber || !carrierProgram || !recipientName || !employeeId || !customerId) {
      return NextResponse.json(
        { error: 'trackingNumber, carrierProgram, recipientName, employeeId, and customerId are required' },
        { status: 400 },
      );
    }

    // Get hold period from enrollment config
    const enrollment = tenantId
      ? await prisma.carrierProgramEnrollment.findUnique({
          where: { tenantId_program: { tenantId, program: carrierProgram } },
        })
      : null;

    const holdPeriodDays = enrollment?.holdPeriodDays ?? 7;
    const now = new Date();
    const holdDeadline = new Date(now);
    holdDeadline.setDate(holdDeadline.getDate() + holdPeriodDays);
    holdDeadline.setHours(23, 59, 59, 999);

    const carrier = carrierProgram === 'fedex_hal' ? 'fedex' : 'ups';

    const pkg = await prisma.package.create({
      data: {
        trackingNumber,
        carrier,
        carrierProgram,
        recipientName,
        packageType: packageType || 'medium',
        storageLocation: storageLocation || null,
        status: 'checked_in',
        holdDeadline,
        carrierUploadStatus: 'pending',
        customerId,
        checkedInById: employeeId,
        storeId: null,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'carrier_program.package_intake',
          entityType: 'package',
          entityId: pkg.id,
          userId: employeeId,
          details: JSON.stringify({
            trackingNumber,
            carrierProgram,
            recipientName,
            holdPeriodDays,
            holdDeadline: holdDeadline.toISOString(),
          }),
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      package: {
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        carrierProgram: pkg.carrierProgram,
        recipientName: pkg.recipientName,
        holdDeadline: pkg.holdDeadline,
        status: pkg.status,
      },
    });
  } catch (error) {
    console.error('[carrier-program/inventory] POST error:', error);
    return NextResponse.json({ error: 'Failed to intake package' }, { status: 500 });
  }
}
