/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/customers/[id]/closure
 * BAR-234: Get closure status and pre-flight check for PMB closure.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
      include: {
        packages: {
          where: { status: { in: ['checked_in', 'notified', 'ready'] } },
        },
        mailPieces: {
          where: { status: { in: ['received', 'scanned'] } },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const c = customer as any;
    const activePackages = customer.packages.length;
    const activeMail = customer.mailPieces.length;
    const hasInventory = activePackages > 0 || activeMail > 0;

    // Document retention: 6 months from closure date
    const retentionMonths = 6;
    const retentionExpiry = c.dateClosed
      ? new Date(new Date(c.dateClosed).getTime() + retentionMonths * 30 * 86400000)
      : null;

    return NextResponse.json({
      customerId: id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      pmbNumber: customer.pmbNumber,
      status: customer.status,
      closureReason: c.closureReason || null,
      closureInitiatedAt: c.closureInitiatedAt?.toISOString() ?? null,
      dateClosed: c.dateClosed?.toISOString() ?? null,
      retentionOfferSent: c.retentionOfferSent || false,
      retentionOfferResult: c.retentionOfferResult || null,
      mailHoldUntil: c.mailHoldUntil?.toISOString() ?? null,
      crdClosureStatus: c.crdClosureStatus || null,
      crdClosureDate: c.crdClosureDate?.toISOString() ?? null,
      documentRetentionUntil: c.documentRetentionUntil?.toISOString() ?? retentionExpiry?.toISOString() ?? null,
      // Pre-flight checks
      preflight: {
        hasActivePackages: activePackages > 0,
        activePackageCount: activePackages,
        hasActiveMail: activeMail > 0,
        activeMailCount: activeMail,
        hasInventory,
        form1583Status: customer.form1583Status,
        crdUploaded: customer.crdUploaded,
      },
    });
  } catch (err) {
    console.error('[GET /api/customers/[id]/closure]', err);
    return NextResponse.json({ error: 'Failed to fetch closure data' }, { status: 500 });
  }
}

/**
 * POST /api/customers/[id]/closure
 * BAR-234: Initiate or advance PMB closure workflow.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action, closureReason, mailHoldDays, retentionResult, crdClosureStatus } = body;

    const tenantScope = user.role !== 'superadmin' && user.tenantId
      ? { tenantId: user.tenantId } : {};

    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null, ...tenantScope },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const now = new Date();
    const c = customer as any;
    const updateData: Record<string, any> = {};

    switch (action) {
      case 'initiate_closure': {
        // Step 1: Start closure process
        updateData.closureReason = closureReason || 'voluntary';
        updateData.closureInitiatedAt = now;
        updateData.retentionOfferSent = true;

        // Set mail hold deadline (default 30 days)
        const holdDays = mailHoldDays || 30;
        const holdUntil = new Date(now.getTime() + holdDays * 86400000);
        updateData.mailHoldUntil = holdUntil;

        break;
      }

      case 'record_retention_result': {
        // Step 2: Record whether customer accepted retention offer
        updateData.retentionOfferResult = retentionResult; // accepted, declined, no_response

        if (retentionResult === 'accepted') {
          // Customer staying — clear closure
          updateData.closureReason = null;
          updateData.closureInitiatedAt = null;
          updateData.retentionOfferSent = false;
          updateData.retentionOfferResult = null;
          updateData.mailHoldUntil = null;
        }
        break;
      }

      case 'close_pmb': {
        // Step 3: Finalize closure
        updateData.status = 'closed';
        updateData.dateClosed = now;
        updateData.crdClosureStatus = 'pending';

        // Set 6-month document retention
        const retentionUntil = new Date(now.getTime() + 6 * 30 * 86400000);
        updateData.documentRetentionUntil = retentionUntil;

        break;
      }

      case 'update_crd_closure': {
        // Step 4: CRD closure tracking
        updateData.crdClosureStatus = crdClosureStatus; // pending, submitted, confirmed
        if (crdClosureStatus === 'submitted' || crdClosureStatus === 'confirmed') {
          updateData.crdClosureDate = now;
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Auto-RTS if closing PMB with active packages
    if (action === 'close_pmb') {
      const activePackages = await prisma.package.count({
        where: {
          customerId: id,
          status: { in: ['checked_in', 'notified', 'ready'] },
        },
      });

      if (activePackages > 0) {
        // Mark packages for RTS
        await prisma.package.updateMany({
          where: {
            customerId: id,
            status: { in: ['checked_in', 'notified', 'ready'] },
          },
          data: { status: 'rts_initiated' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      action,
      status: updated.status,
      dateClosed: updated.dateClosed?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[POST /api/customers/[id]/closure]', err);
    return NextResponse.json({ error: 'Closure action failed' }, { status: 500 });
  }
}
