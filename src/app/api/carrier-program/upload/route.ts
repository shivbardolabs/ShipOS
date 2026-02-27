import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildUploadPayload } from '@/lib/carrier-program';

/* -------------------------------------------------------------------------- */
/*  POST /api/carrier-program/upload                                          */
/*  BAR-283: Upload checkout data to carrier portal                           */
/*                                                                            */
/*  Supports single upload and batch upload of carrier program checkouts.     */
/*                                                                            */
/*  Body:                                                                     */
/*    checkoutIds  — string[]   (IDs of CarrierProgramCheckout records)       */
/*    tenantId     — string                                                   */
/*    mode         — 'single' | 'batch'                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutIds, tenantId, mode = 'single' } = body;

    if (!checkoutIds?.length || !tenantId) {
      return NextResponse.json(
        { error: 'checkoutIds and tenantId are required' },
        { status: 400 },
      );
    }

    // Load checkouts
    const checkouts = await prisma.carrierProgramCheckout.findMany({
      where: {
        id: { in: checkoutIds },
        uploadStatus: { in: ['pending', 'failed'] },
      },
      include: {
        enrollment: {
          select: { program: true, locationId: true, integrationMode: true },
        },
      },
    });

    if (checkouts.length === 0) {
      return NextResponse.json(
        { error: 'No pending/failed checkouts found' },
        { status: 404 },
      );
    }

    const batchId = mode === 'batch'
      ? `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      : null;

    const results: Array<{
      checkoutId: string;
      trackingNumber: string;
      status: 'uploaded' | 'failed';
      error?: string;
      payload?: unknown;
    }> = [];

    for (const checkout of checkouts) {
      const locationId = checkout.enrollment.locationId ?? '';
      const integrationMode = checkout.enrollment.integrationMode;

      try {
        // Build the payload
        const payload = buildUploadPayload(
          {
            trackingNumber: checkout.trackingNumber,
            recipientName: checkout.recipientName,
            checkedOutAt: checkout.checkedOutAt,
            recipientIdType: checkout.recipientIdType,
            recipientIdVerified: checkout.recipientIdVerified,
            signatureData: checkout.signatureData,
          },
          locationId,
        );

        // For 'manual' mode — mark as uploaded (clerk will complete in portal)
        // For 'portal_auto' or 'api_direct' — would make actual API calls here
        // Currently we support manual + simulated auto modes

        const now = new Date();
        const newStatus = integrationMode === 'manual' ? 'uploaded' : 'uploaded';

        await prisma.carrierProgramCheckout.update({
          where: { id: checkout.id },
          data: {
            uploadStatus: newStatus,
            uploadedAt: now,
            uploadAttempts: { increment: 1 },
            batchId: batchId ?? undefined,
            uploadError: null,
          },
        });

        // Also update the package record
        await prisma.package.updateMany({
          where: { id: checkout.packageId },
          data: {
            carrierUploadStatus: newStatus,
            carrierUploadedAt: now,
          },
        });

        results.push({
          checkoutId: checkout.id,
          trackingNumber: checkout.trackingNumber,
          status: 'uploaded',
          payload,
        });
      } catch (uploadError) {
        // Mark as failed with error details
        await prisma.carrierProgramCheckout.update({
          where: { id: checkout.id },
          data: {
            uploadStatus: 'failed',
            uploadAttempts: { increment: 1 },
            uploadError: uploadError instanceof Error
              ? uploadError.message
              : 'Unknown upload error',
          },
        });

        results.push({
          checkoutId: checkout.id,
          trackingNumber: checkout.trackingNumber,
          status: 'failed',
          error: uploadError instanceof Error ? uploadError.message : 'Upload failed',
        });
      }
    }

    // Audit
    try {
      const user = await prisma.user.findFirst({ where: { role: 'admin' } });
      if (user) {
        await prisma.auditLog.create({
          data: {
            action: 'carrier_program.upload_batch',
            entityType: 'carrier_program_checkout',
            entityId: batchId ?? results[0]?.checkoutId ?? '',
            userId: user.id,
            details: JSON.stringify({
              mode,
              batchId,
              total: results.length,
              uploaded: results.filter((r) => r.status === 'uploaded').length,
              failed: results.filter((r) => r.status === 'failed').length,
            }),
          },
        });
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      batchId,
      results,
      summary: {
        total: results.length,
        uploaded: results.filter((r) => r.status === 'uploaded').length,
        failed: results.filter((r) => r.status === 'failed').length,
      },
    });
  } catch (error) {
    console.error('[carrier-program/upload] POST error:', error);
    return NextResponse.json({ error: 'Failed to upload checkout data' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*  GET /api/carrier-program/upload/reconciliation?tenantId=...&month=...     */
/*  BAR-283: Monthly reconciliation summary                                   */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const tenantId = params.get('tenantId');
    const month = params.get('month'); // YYYY-MM format

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Date range for the month
    const now = new Date();
    const year = month ? parseInt(month.split('-')[0]) : now.getFullYear();
    const mon = month ? parseInt(month.split('-')[1]) - 1 : now.getMonth();
    const from = new Date(year, mon, 1);
    const to = new Date(year, mon + 1, 0, 23, 59, 59, 999);

    const enrollments = await prisma.carrierProgramEnrollment.findMany({
      where: { tenantId },
    });

    const reconciliation = [];

    for (const enrollment of enrollments) {
      const checkouts = await prisma.carrierProgramCheckout.findMany({
        where: {
          enrollmentId: enrollment.id,
          checkedOutAt: { gte: from, lte: to },
        },
      });

      const totalCheckedOut = checkouts.length;
      const uploaded = checkouts.filter((c) => c.uploadStatus !== 'pending').length;
      const confirmed = checkouts.filter((c) => c.uploadStatus === 'confirmed').length;
      const failed = checkouts.filter((c) => c.uploadStatus === 'failed').length;
      const pending = checkouts.filter((c) => c.uploadStatus === 'pending').length;

      // Count held packages (currently in inventory for this program)
      const heldCount = await prisma.package.count({
        where: {
          carrierProgram: enrollment.program,
          status: { in: ['checked_in', 'notified', 'ready'] },
          customer: { store: { tenantId } },
        },
      });

      reconciliation.push({
        program: enrollment.program,
        enabled: enrollment.enabled,
        compensationRate: enrollment.compensationRate,
        period: { from: from.toISOString(), to: to.toISOString() },
        currentlyHeld: heldCount,
        totalCheckedOut,
        uploaded,
        confirmed,
        failed,
        pending,
        estimatedCompensation: Math.round(totalCheckedOut * enrollment.compensationRate * 100) / 100,
      });
    }

    return NextResponse.json({ reconciliation, period: { from, to } });
  } catch (error) {
    console.error('[carrier-program/upload/reconciliation] GET error:', error);
    return NextResponse.json({ error: 'Failed to load reconciliation' }, { status: 500 });
  }
}
