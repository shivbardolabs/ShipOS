import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';

/* -------------------------------------------------------------------------- */
/*  POST /api/packages/check-in                                               */
/*  BAR-35: Save checked-in package to DB                                     */
/*  BAR-10: Trigger dual-channel (email + SMS) customer notification          */
/* -------------------------------------------------------------------------- */

interface CheckInBody {
  customerId: string;
  trackingNumber?: string;
  carrier: string;
  senderName?: string;
  packageType: string;
  condition?: string;
  hazardous?: boolean;
  perishable?: boolean;
  requiresSignature?: boolean;
  storageLocation?: string;
  notes?: string;
  isWalkIn?: boolean;
  walkInName?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  printLabel?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckInBody = await request.json();

    // Validate required fields
    if (!body.carrier || !body.packageType) {
      return NextResponse.json(
        { error: 'carrier and packageType are required' },
        { status: 400 }
      );
    }

    if (!body.customerId && !body.isWalkIn) {
      return NextResponse.json(
        { error: 'customerId is required for non-walk-in check-ins' },
        { status: 400 }
      );
    }

    // For walk-ins, find or create a generic walk-in customer record
    let customerId = body.customerId;
    if (body.isWalkIn && !customerId) {
      const walkIn = await prisma.customer.upsert({
        where: { pmbNumber: 'WALK-IN' },
        update: {},
        create: {
          firstName: body.walkInName || 'Walk-In',
          lastName: 'Customer',
          pmbNumber: 'WALK-IN',
          platform: 'physical',
          status: 'active',
          notifyEmail: false,
          notifySms: false,
        },
      });
      customerId = walkIn.id;
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Create the package record
    const pkg = await prisma.package.create({
      data: {
        trackingNumber: body.trackingNumber || null,
        carrier: body.carrier,
        senderName: body.senderName || null,
        packageType: body.packageType,
        condition: body.condition || 'good',
        hazardous: body.hazardous ?? false,
        perishable: body.perishable ?? false,
        storageLocation: body.storageLocation || null,
        notes: body.notes || null,
        status: 'checked_in',
        customerId,
        checkedInAt: new Date(),
      },
    });

    // BAR-10: Send dual-channel notification (email + SMS)
    let notificationResult = null;
    const shouldNotify =
      !body.isWalkIn &&
      customer.pmbNumber !== 'WALK-IN' &&
      (body.sendEmail !== false || body.sendSms !== false);

    if (shouldNotify) {
      try {
        // Determine channel from explicit preferences
        const wantsEmail = body.sendEmail !== false && customer.notifyEmail && customer.email;
        const wantsSms = body.sendSms !== false && customer.notifySms && customer.phone;

        const channel = wantsEmail && wantsSms
          ? 'both' as const
          : wantsSms
            ? 'sms' as const
            : 'email' as const;

        notificationResult = await sendNotification({
          type: 'package_arrival',
          customerId: customer.id,
          channel,
          data: {
            carrier: body.carrier,
            trackingNumber: body.trackingNumber,
            packageType: body.packageType,
            senderName: body.senderName,
            checkedInAt: pkg.checkedInAt.toISOString(),
          },
        });

        // Update package notified status
        if (notificationResult.success) {
          await prisma.package.update({
            where: { id: pkg.id },
            data: { status: 'notified', notifiedAt: new Date() },
          });
        }
      } catch (notifError) {
        // Don't fail the check-in if notification fails
        console.error('[check-in] Notification error:', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      package: {
        id: pkg.id,
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        status: pkg.status,
        checkedInAt: pkg.checkedInAt,
      },
      notification: notificationResult
        ? {
            sent: notificationResult.success,
            notificationId: notificationResult.notificationId,
            email: notificationResult.emailResult?.success ?? null,
            sms: notificationResult.smsResult?.success ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[check-in] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check in package' },
      { status: 500 }
    );
  }
}
