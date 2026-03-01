import { withApiHandler, ok, unauthorized } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';

/* -------------------------------------------------------------------------- */
/*  POST /api/cron/id-expiration                                              */
/*  BAR-18: ID Expiration Tracking & Alerts                                   */
/*                                                                            */
/*  Runs daily. Checks for customers whose government IDs are expiring:       */
/*  - 90, 60, 30, 14, 7, 1 day warnings                                      */
/*  - Already-expired IDs                                                     */
/*  Sends notifications via the customer's preferred channel.                 */
/*  Protected by CRON_SECRET header.                                          */
/* -------------------------------------------------------------------------- */

const ALERT_THRESHOLDS = [90, 60, 30, 14, 7, 1];

interface ExpirationAlert {
  customerId: string;
  customerName: string;
  pmbNumber: string;
  idType: string;
  expirationDate: Date;
  daysUntilExpiry: number;
  alreadyExpired: boolean;
}

export const POST = withApiHandler(async (request) => {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    unauthorized('Unauthorized');
  }

  const now = new Date();
  const results = {
    scanned: 0,
    alerts: [] as { pmbNumber: string; idType: string; daysLeft: number; notified: boolean }[],
    errors: 0,
  };

  // Query all active customers with ID expiration dates
  const customers = await prisma.customer.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      OR: [
        { idExpiration: { not: null } },
        { passportExpiration: { not: null } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      pmbNumber: true,
      idType: true,
      idExpiration: true,
      passportExpiration: true,
      notifyEmail: true,
      notifySms: true,
      email: true,
      phone: true,
    },
  });

  results.scanned = customers.length;

  // Check each customer's IDs
  const alerts: ExpirationAlert[] = [];

  for (const cust of customers) {
    // Check driver's license expiration
    if (cust.idExpiration) {
      const daysLeft = Math.ceil(
        (cust.idExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const shouldAlert =
        daysLeft <= 0 || ALERT_THRESHOLDS.some((t) => daysLeft === t);

      if (shouldAlert) {
        alerts.push({
          customerId: cust.id,
          customerName: `${cust.firstName} ${cust.lastName}`,
          pmbNumber: cust.pmbNumber,
          idType: 'drivers_license',
          expirationDate: cust.idExpiration,
          daysUntilExpiry: daysLeft,
          alreadyExpired: daysLeft <= 0,
        });
      }
    }

    // Check passport expiration
    if (cust.passportExpiration) {
      const daysLeft = Math.ceil(
        (cust.passportExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const shouldAlert =
        daysLeft <= 0 || ALERT_THRESHOLDS.some((t) => daysLeft === t);

      if (shouldAlert) {
        alerts.push({
          customerId: cust.id,
          customerName: `${cust.firstName} ${cust.lastName}`,
          pmbNumber: cust.pmbNumber,
          idType: 'passport',
          expirationDate: cust.passportExpiration,
          daysUntilExpiry: daysLeft,
          alreadyExpired: daysLeft <= 0,
        });
      }
    }
  }

  // Send notifications for each alert
  for (const alert of alerts) {
    try {
      await sendNotification({
        type: 'id_expiring',
        customerId: alert.customerId,
        data: {
          idType: alert.idType === 'drivers_license' ? "Driver's License" : 'Passport',
          expirationDate: alert.expirationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          daysUntilExpiry: alert.daysUntilExpiry,
          alreadyExpired: alert.alreadyExpired,
        },
      });

      results.alerts.push({
        pmbNumber: alert.pmbNumber,
        idType: alert.idType,
        daysLeft: alert.daysUntilExpiry,
        notified: true,
      });
    } catch (notifError) {
      console.error(`[id-expiration] Failed to notify ${alert.pmbNumber}:`, notifError);
      results.alerts.push({
        pmbNumber: alert.pmbNumber,
        idType: alert.idType,
        daysLeft: alert.daysUntilExpiry,
        notified: false,
      });
      results.errors++;
    }
  }

  return ok({
    success: true,
    timestamp: now.toISOString(),
    ...results,
  });
}, { public: true });
