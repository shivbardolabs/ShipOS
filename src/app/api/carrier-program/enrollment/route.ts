import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CARRIER_PROGRAMS, PROGRAM_IDS } from '@/lib/carrier-program';
import type { CarrierProgramId } from '@/lib/carrier-program';

/* -------------------------------------------------------------------------- */
/*  GET /api/carrier-program/enrollment?tenantId=...                          */
/*  BAR-280: Retrieve enrollment status for all programs                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const tenantId = new URL(request.url).searchParams.get('tenantId');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const enrollments = await prisma.carrierProgramEnrollment.findMany({
      where: { tenantId },
    });

    // Build full program status including non-enrolled programs
    const programs = PROGRAM_IDS.map((programId) => {
      const enrollment = enrollments.find((e) => e.program === programId);
      const meta = CARRIER_PROGRAMS[programId];
      return {
        programId,
        name: meta.name,
        fullName: meta.fullName,
        carrier: meta.carrier,
        color: meta.color,
        enrolled: !!enrollment?.enabled,
        enrollmentStatus: enrollment?.enrollmentStatus ?? 'not_enrolled',
        enrollment: enrollment
          ? {
              id: enrollment.id,
              enabled: enrollment.enabled,
              locationId: enrollment.locationId,
              holdPeriodDays: enrollment.holdPeriodDays,
              warningDaysBefore: enrollment.warningDaysBefore,
              compensationRate: enrollment.compensationRate,
              maxCapacity: enrollment.maxCapacity,
              integrationMode: enrollment.integrationMode,
              enrollmentStatus: enrollment.enrollmentStatus,
              enrolledAt: enrollment.enrolledAt,
              lastSyncAt: enrollment.lastSyncAt,
              lastSyncStatus: enrollment.lastSyncStatus,
            }
          : null,
      };
    });

    return NextResponse.json({ programs });
  } catch (error) {
    console.error('[carrier-program/enrollment] GET error:', error);
    return NextResponse.json({ error: 'Failed to load enrollments' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/carrier-program/enrollment                                      */
/*  BAR-280: Create or update program enrollment                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      program,
      enabled,
      locationId,
      portalUsername,
      portalPassword,
      apiKey,
      holdPeriodDays,
      warningDaysBefore,
      compensationRate,
      maxCapacity,
      integrationMode,
    } = body;

    if (!tenantId || !program) {
      return NextResponse.json(
        { error: 'tenantId and program are required' },
        { status: 400 },
      );
    }

    if (!PROGRAM_IDS.includes(program as CarrierProgramId)) {
      return NextResponse.json(
        { error: `Invalid program. Must be one of: ${PROGRAM_IDS.join(', ')}` },
        { status: 400 },
      );
    }

    const enrollment = await prisma.carrierProgramEnrollment.upsert({
      where: {
        tenantId_program: { tenantId, program },
      },
      update: {
        enabled: enabled ?? undefined,
        locationId: locationId ?? undefined,
        portalUsername: portalUsername ?? undefined,
        portalPassword: portalPassword ?? undefined,
        apiKey: apiKey ?? undefined,
        holdPeriodDays: holdPeriodDays ?? undefined,
        warningDaysBefore: warningDaysBefore ?? undefined,
        compensationRate: compensationRate ?? undefined,
        maxCapacity: maxCapacity ?? undefined,
        integrationMode: integrationMode ?? undefined,
        enrollmentStatus: enabled ? 'active' : 'suspended',
        enrolledAt: enabled ? new Date() : undefined,
      },
      create: {
        tenantId,
        program,
        enabled: enabled ?? false,
        locationId,
        portalUsername,
        portalPassword,
        apiKey,
        holdPeriodDays: holdPeriodDays ?? 7,
        warningDaysBefore: warningDaysBefore ?? 2,
        compensationRate: compensationRate ?? 0,
        maxCapacity: maxCapacity ?? 0,
        integrationMode: integrationMode ?? 'manual',
        enrollmentStatus: enabled ? 'active' : 'pending',
        enrolledAt: enabled ? new Date() : null,
      },
    });

    // Audit log
    try {
      const user = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (user) {
        await prisma.auditLog.create({
          data: {
            action: 'carrier_program.enrollment_updated',
            entityType: 'carrier_program_enrollment',
            entityId: enrollment.id,
            userId: user.id,
            details: JSON.stringify({
              program,
              enabled: enrollment.enabled,
              status: enrollment.enrollmentStatus,
            }),
          },
        });
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        program: enrollment.program,
        enabled: enrollment.enabled,
        enrollmentStatus: enrollment.enrollmentStatus,
      },
    });
  } catch (error) {
    console.error('[carrier-program/enrollment] POST error:', error);
    return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
  }
}
