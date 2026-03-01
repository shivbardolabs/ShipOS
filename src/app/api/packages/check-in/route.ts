import { withApiHandler, validateBody, ok, badRequest, notFound, ApiError } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { onPackageCheckIn } from '@/lib/charge-event-service';
import { z } from 'zod';

/**
 * POST /api/packages/check-in
 *
 * Creates a new Package record in the database and optionally
 * triggers customer notifications (email/SMS).
 *
 * Fixes BAR-260: Packages checked-in were not saving because the
 * front-end only logged to a client-side activity log.
 */

const CheckInSchema = z.object({
  customerId: z.string().optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().min(1, 'carrier is required'),
  customCarrierName: z.string().optional(),
  senderName: z.string().optional(),
  packageType: z.string().min(1, 'packageType is required'),
  hazardous: z.boolean().optional(),
  perishable: z.boolean().optional(),
  condition: z.string().optional(),
  conditionOther: z.string().optional(),
  notes: z.string().optional(),
  storageLocation: z.string().optional(),
  requiresSignature: z.boolean().optional(),
  isWalkIn: z.boolean().optional(),
  walkInName: z.string().optional(),
  // Notification preferences
  sendEmail: z.boolean().optional(),
  sendSms: z.boolean().optional(),
  // BAR-328: Duplicate override fields
  duplicateOverride: z.boolean().optional(),
  duplicateOverrideReason: z.string().optional(),
  duplicateOriginalPackageId: z.string().optional(),
});

export const POST = withApiHandler(async (request, { user }) => {
  const data = await validateBody(request, CheckInSchema);

  const {
    customerId,
    trackingNumber,
    carrier,
    customCarrierName,
    senderName,
    packageType,
    hazardous,
    perishable,
    condition,
    conditionOther,
    notes,
    storageLocation,
    requiresSignature,
    isWalkIn,
    walkInName,
    sendEmail,
    sendSms,
    duplicateOverride,
    duplicateOverrideReason,
    duplicateOriginalPackageId,
  } = data;

  // --- Validation ---
  if (!isWalkIn && !customerId) {
    badRequest('customerId is required for non-walk-in check-ins');
  }

  // Verify customer belongs to the same tenant (if not walk-in)
  let customer = null;
  if (!isWalkIn && customerId) {
    customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: user.tenantId,
        status: 'active',
      },
    });

    if (!customer) {
      notFound('Customer not found or not active');
    }
  }

  // For walk-in customers, find or create a generic walk-in customer record
  if (isWalkIn) {
    // Use a deterministic walk-in PMB
    const walkInPmb = `WALKIN-${Date.now()}`;
    customer = await prisma.customer.create({
      data: {
        firstName: walkInName?.split(' ')[0] || 'Walk-In',
        lastName: walkInName?.split(' ').slice(1).join(' ') || 'Customer',
        pmbNumber: walkInPmb,
        platform: 'physical',
        status: 'active',
        tenantId: user.tenantId,
        notifyEmail: false,
        notifySms: false,
      },
    });
  }

  if (!customer) {
    badRequest('Could not resolve customer');
  }

  // --- BAR-328: Server-side duplicate tracking number check ---
  if (trackingNumber?.trim()) {
    const existingPackage = await prisma.package.findFirst({
      where: {
        trackingNumber: trackingNumber.trim(),
        customer: { tenantId: user.tenantId },
        status: { notIn: ['released', 'returned'] },
      },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        status: true,
        checkedInAt: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            pmbNumber: true,
          },
        },
      },
    });

    if (existingPackage && !duplicateOverride) {
      throw new ApiError('Duplicate tracking number', 409, {
        code: 'DUPLICATE_TRACKING',
        existingPackage: {
          id: existingPackage.id,
          trackingNumber: existingPackage.trackingNumber,
          carrier: existingPackage.carrier,
          status: existingPackage.status,
          checkedInAt: existingPackage.checkedInAt.toISOString(),
          customerName: `${existingPackage.customer.firstName} ${existingPackage.customer.lastName}`,
          customerPmb: existingPackage.customer.pmbNumber,
        },
      });
    }
  }

  // Build the resolved carrier name
  const resolvedCarrier = carrier === 'other' ? (customCarrierName || 'other') : carrier;

  // Build condition string
  const resolvedCondition =
    condition === 'other' && conditionOther
      ? `other: ${conditionOther}`
      : condition || 'good';

  // Build notes with any special flags
  const notesParts: string[] = [];
  if (notes) notesParts.push(notes);
  if (requiresSignature) notesParts.push('[Requires Signature]');
  const resolvedNotes = notesParts.length > 0 ? notesParts.join(' | ') : null;

  // --- Create the package ---
  const pkg = await prisma.package.create({
    data: {
      trackingNumber: trackingNumber?.trim() || null,
      carrier: resolvedCarrier,
      senderName: senderName?.trim() || null,
      packageType: packageType,
      status: 'checked_in',
      hazardous: !!hazardous,
      perishable: !!perishable,
      condition: resolvedCondition,
      notes: resolvedNotes,
      storageLocation: storageLocation?.trim() || null,
      customerId: customer.id,
      checkedInById: user.id,
      // BAR-328: Duplicate override tracking
      duplicateOverride: !!duplicateOverride,
      duplicateOverrideReason: duplicateOverride ? (duplicateOverrideReason || null) : null,
      duplicateOriginalPackageId: duplicateOverride ? (duplicateOriginalPackageId || null) : null,
      storeId: user.tenantId
        ? (
            await prisma.store.findFirst({
              where: { tenantId: user.tenantId, isDefault: true },
            })
          )?.id || null
        : null,
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          pmbNumber: true,
          email: true,
          phone: true,
          notifyEmail: true,
          notifySms: true,
        },
      },
    },
  });

  // --- Create audit log entry ---
  await prisma.auditLog.create({
    data: {
      action: 'package_checkin',
      entityType: 'package',
      entityId: pkg.id,
      details: JSON.stringify({
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        packageType: pkg.packageType,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPmb: customer.pmbNumber,
        hazardous: pkg.hazardous,
        perishable: pkg.perishable,
        storageLocation: pkg.storageLocation,
        isWalkIn: !!isWalkIn,
        // BAR-328: Log duplicate override details
        ...(duplicateOverride && {
          duplicateOverride: true,
          duplicateOverrideReason: duplicateOverrideReason || 'No reason provided',
          duplicateOriginalPackageId: duplicateOriginalPackageId || null,
        }),
      }),
      userId: user.id,
    },
  });

  // --- BAR-308: Auto-generate receiving charge event ---
  let chargeEvent: { chargeEventId: string; totalCharge: number } | null = null;
  if (user.tenantId) {
    try {
      chargeEvent = await onPackageCheckIn({
        tenantId: user.tenantId,
        customerId: customer.id,
        pmbNumber: customer.pmbNumber,
        packageId: pkg.id,
        carrier: resolvedCarrier,
        packageType,
        createdById: user.id,
      });
    } catch (err) {
      // Charge event generation is non-blocking — log but don't fail check-in
      console.error('[check-in] Charge event generation failed:', err);
    }
  }

  // --- Send notifications ---
  const notifications: { channel: string; status: string }[] = [];

  if (sendEmail && customer.notifyEmail && customer.email) {
    try {
      await fetch(new URL('/api/notifications/send', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'package_arrival',
          customerId: customer.id,
          channel: 'email',
          data: {
            trackingNumber: pkg.trackingNumber,
            carrier: pkg.carrier,
            senderName: pkg.senderName,
            packageType: pkg.packageType,
            perishable: pkg.perishable,
            hazardous: pkg.hazardous,
            storageLocation: pkg.storageLocation,
          },
        }),
      });
      notifications.push({ channel: 'email', status: 'sent' });
    } catch (err) {
      console.error('[check-in] Email notification failed:', err);
      notifications.push({ channel: 'email', status: 'failed' });
    }

    // Update package notifiedAt
    await prisma.package.update({
      where: { id: pkg.id },
      data: { notifiedAt: new Date(), status: 'notified' },
    });
  }

  if (sendSms && customer.notifySms && customer.phone) {
    try {
      await fetch(new URL('/api/notifications/send', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'package_arrival',
          customerId: customer.id,
          channel: 'sms',
          data: {
            trackingNumber: pkg.trackingNumber,
            carrier: pkg.carrier,
            senderName: pkg.senderName,
            perishable: pkg.perishable,
          },
        }),
      });
      notifications.push({ channel: 'sms', status: 'sent' });
    } catch (err) {
      console.error('[check-in] SMS notification failed:', err);
      notifications.push({ channel: 'sms', status: 'failed' });
    }
  }

  return ok({
    success: true,
    package: {
      id: pkg.id,
      trackingNumber: pkg.trackingNumber,
      carrier: pkg.carrier,
      senderName: pkg.senderName,
      packageType: pkg.packageType,
      status: pkg.status,
      hazardous: pkg.hazardous,
      perishable: pkg.perishable,
      storageLocation: pkg.storageLocation,
      checkedInAt: pkg.checkedInAt.toISOString(),
      customer: {
        id: pkg.customer.id,
        name: `${pkg.customer.firstName} ${pkg.customer.lastName}`,
        pmbNumber: pkg.customer.pmbNumber,
      },
    },
    notifications,
    ...(chargeEvent && { chargeEvent }),
  });
});
