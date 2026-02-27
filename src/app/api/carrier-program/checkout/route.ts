import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/*  POST /api/carrier-program/checkout                                        */
/*  BAR-282: Recipient Check-Out with ID Validation                           */
/*                                                                            */
/*  Body:                                                                     */
/*    packageId        — string                                               */
/*    employeeId       — string (clerk performing checkout)                    */
/*    recipientIdType  — drivers_license | passport | military_id | etc.      */
/*    idVerified       — boolean (clerk confirms ID matches)                  */
/*    signatureData    — string? (base64 data URL)                            */
/*    tenantId         — string?                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      packageId,
      employeeId,
      recipientIdType,
      idVerified,
      signatureData,
      tenantId,
    } = body;

    if (!packageId || !employeeId || !recipientIdType) {
      return NextResponse.json(
        { error: 'packageId, employeeId, and recipientIdType are required' },
        { status: 400 },
      );
    }

    if (!idVerified) {
      return NextResponse.json(
        { error: 'Photo ID must be verified before package release' },
        { status: 400 },
      );
    }

    // Load package
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    if (!pkg.carrierProgram) {
      return NextResponse.json(
        { error: 'This is not a carrier program package' },
        { status: 400 },
      );
    }

    if (pkg.status === 'released') {
      return NextResponse.json(
        { error: 'Package has already been released' },
        { status: 400 },
      );
    }

    // Load enrollment for this program
    const enrollment = tenantId
      ? await prisma.carrierProgramEnrollment.findUnique({
          where: {
            tenantId_program: { tenantId, program: pkg.carrierProgram },
          },
        })
      : null;

    const now = new Date();

    // Update package status
    await prisma.package.update({
      where: { id: packageId },
      data: {
        status: 'released',
        releasedAt: now,
        releaseSignature: signatureData || null,
        delegateIdType: recipientIdType,
        checkedOutById: employeeId,
        carrierUploadStatus: 'pending',
      },
    });

    // Create carrier program checkout record
    const checkout = await prisma.carrierProgramCheckout.create({
      data: {
        enrollmentId: enrollment?.id ?? '',
        packageId,
        trackingNumber: pkg.trackingNumber ?? '',
        recipientName: pkg.recipientName ?? 'Unknown',
        recipientIdType,
        recipientIdVerified: true,
        idVerifiedAt: now,
        idVerifiedBy: employeeId,
        checkedOutAt: now,
        checkedOutById: employeeId,
        signatureData: signatureData || null,
        uploadStatus: 'pending',
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'carrier_program.package_checkout',
          entityType: 'carrier_program_checkout',
          entityId: checkout.id,
          userId: employeeId,
          details: JSON.stringify({
            packageId,
            trackingNumber: pkg.trackingNumber,
            carrierProgram: pkg.carrierProgram,
            recipientName: pkg.recipientName,
            recipientIdType,
            idVerified: true,
            hasSignature: !!signatureData,
          }),
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      checkout: {
        id: checkout.id,
        packageId,
        trackingNumber: pkg.trackingNumber,
        recipientName: pkg.recipientName,
        carrierProgram: pkg.carrierProgram,
        uploadStatus: checkout.uploadStatus,
        checkedOutAt: checkout.checkedOutAt,
      },
    });
  } catch (error) {
    console.error('[carrier-program/checkout] POST error:', error);
    return NextResponse.json({ error: 'Failed to checkout package' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  GET /api/carrier-program/checkout?tenantId=...&status=...                 */
/*  BAR-282: List carrier program checkouts                                   */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const tenantId = params.get('tenantId');
    const uploadStatus = params.get('status');
    const batchId = params.get('batchId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const enrollments = await prisma.carrierProgramEnrollment.findMany({
      where: { tenantId },
      select: { id: true, program: true },
    });

    const enrollmentIds = enrollments.map((e) => e.id);

    if (enrollmentIds.length === 0) {
      return NextResponse.json({ checkouts: [], stats: { total: 0 } });
    }

    const where: Record<string, unknown> = {
      enrollmentId: { in: enrollmentIds },
    };
    if (uploadStatus) where.uploadStatus = uploadStatus;
    if (batchId) where.batchId = batchId;

    const checkouts = await prisma.carrierProgramCheckout.findMany({
      where,
      orderBy: { checkedOutAt: 'desc' },
      take: 100,
    });

    // Enrich with program name
    const enrollmentMap = new Map(enrollments.map((e) => [e.id, e.program]));
    const enriched = checkouts.map((c) => ({
      ...c,
      program: enrollmentMap.get(c.enrollmentId) ?? 'unknown',
    }));

    const stats = {
      total: checkouts.length,
      pending: checkouts.filter((c) => c.uploadStatus === 'pending').length,
      uploaded: checkouts.filter((c) => c.uploadStatus === 'uploaded').length,
      confirmed: checkouts.filter((c) => c.uploadStatus === 'confirmed').length,
      failed: checkouts.filter((c) => c.uploadStatus === 'failed').length,
    };

    return NextResponse.json({ checkouts: enriched, stats });
  } catch (error) {
    console.error('[carrier-program/checkout] GET error:', error);
    return NextResponse.json({ error: 'Failed to load checkouts' }, { status: 500 });
  }
}
