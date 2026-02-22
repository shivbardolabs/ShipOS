import * as React from 'react';
import { sendEmail } from './resend';
import { sendSms, formatPhoneE164 } from './twilio';
import { prisma } from '@/lib/prisma';

// Email templates
import { PackageArrivalEmail } from '@/emails/package-arrival';
import { PackageReminderEmail } from '@/emails/package-reminder';
import { MailReceivedEmail } from '@/emails/mail-received';
import { IdExpiringEmail } from '@/emails/id-expiring';
import { RenewalReminderEmail } from '@/emails/renewal-reminder';
import { ShipmentUpdateEmail } from '@/emails/shipment-update';
import { WelcomeEmail } from '@/emails/welcome';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'package_arrival'
  | 'package_reminder'
  | 'mail_received'
  | 'id_expiring'
  | 'renewal_reminder'
  | 'shipment_update'
  | 'welcome'
  | 'custom';

export type NotificationChannel = 'email' | 'sms' | 'both';

export interface NotificationPayload {
  type: NotificationType;
  customerId: string;
  channel?: NotificationChannel; // defaults to customer preference
  subject?: string;              // required for custom type
  body?: string;                 // required for custom type
  data?: Record<string, unknown>; // type-specific template data
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  emailResult?: { success: boolean; messageId?: string; error?: string };
  smsResult?: { success: boolean; messageSid?: string; error?: string };
}

// ---------------------------------------------------------------------------
// SMS templates (plain text)
// ---------------------------------------------------------------------------

function getSmsBody(type: NotificationType, data: Record<string, unknown>): string {
  const name = (data.customerName as string) || 'Customer';
  const pmb = (data.pmbNumber as string) || '';

  switch (type) {
    case 'package_arrival': {
      const carrier = (data.carrier as string) || 'a carrier';
      return `Hi ${name}, a new ${carrier.toUpperCase()} package has arrived at your mailbox ${pmb}. Please pick up at your convenience.`;
    }
    case 'package_reminder': {
      const count = (data.packageCount as number) || 1;
      return `Hi ${name}, reminder: you have ${count} package${count > 1 ? 's' : ''} waiting at ${pmb}. Please pick up soon to avoid storage fees.`;
    }
    case 'mail_received':
      return `Hi ${name}, new mail has been received at your mailbox ${pmb}. Contact your location for handling options.`;
    case 'id_expiring': {
      const days = (data.daysUntilExpiry as number) || 0;
      return `Hi ${name}, your ID on file for ${pmb} ${days <= 0 ? 'has expired' : `expires in ${days} day${days > 1 ? 's' : ''}`}. Please bring updated ID to your location.`;
    }
    case 'renewal_reminder': {
      const renewalDate = (data.renewalDate as string) || 'soon';
      return `Hi ${name}, your mailbox ${pmb} renewal is due on ${renewalDate}. Please renew to avoid service interruption.`;
    }
    case 'shipment_update': {
      const status = (data.status as string) || 'updated';
      const carrier = (data.carrier as string) || '';
      return `Hi ${name}, shipment update for ${pmb}: ${carrier.toUpperCase()} shipment is now ${status}.`;
    }
    case 'welcome':
      return `Welcome to ShipOS Pro, ${name}! Your mailbox ${pmb} is now active. You'll receive notifications for packages and mail.`;
    default:
      return (data.body as string) || `Notification for mailbox ${pmb}`;
  }
}

// ---------------------------------------------------------------------------
// Email templates (React Email)
// ---------------------------------------------------------------------------

function getEmailTemplate(
  type: NotificationType,
  data: Record<string, unknown>
): { subject: string; react: React.ReactElement } | null {
  // Extract common fields with defaults
  const customerName = (data.customerName as string) || 'Customer';
  const pmbNumber = (data.pmbNumber as string) || 'PMB-0001';
  const locationName = (data.locationName as string) || 'your mailbox location';

  switch (type) {
    case 'package_arrival':
      return {
        subject: `📦 New ${((data.carrier as string) || 'package').toUpperCase()} package at ${pmbNumber}`,
        react: React.createElement(PackageArrivalEmail, {
          customerName,
          pmbNumber,
          carrier: (data.carrier as string) || 'Unknown',
          trackingNumber: data.trackingNumber as string | undefined,
          packageType: (data.packageType as string) || 'package',
          senderName: data.senderName as string | undefined,
          locationName,
          checkedInAt: data.checkedInAt as string | undefined,
        }),
      };
    case 'package_reminder':
      return {
        subject: `⏰ ${data.packageCount || 1} package${(data.packageCount as number) > 1 ? 's' : ''} waiting at ${pmbNumber}`,
        react: React.createElement(PackageReminderEmail, {
          customerName,
          pmbNumber,
          packageCount: (data.packageCount as number) || 1,
          oldestDays: (data.oldestDays as number) || 7,
          locationName,
        }),
      };
    case 'mail_received':
      return {
        subject: `✉️ New mail received at ${pmbNumber}`,
        react: React.createElement(MailReceivedEmail, {
          customerName,
          pmbNumber,
          mailType: (data.mailType as string) || 'letter',
          sender: data.sender as string | undefined,
          locationName,
        }),
      };
    case 'id_expiring':
      return {
        subject: `⚠️ ID expiration notice for ${pmbNumber}`,
        react: React.createElement(IdExpiringEmail, {
          customerName,
          pmbNumber,
          idType: (data.idType as string) || 'ID',
          expirationDate: (data.expirationDate as string) || '',
          daysUntilExpiry: (data.daysUntilExpiry as number) || 30,
          locationName,
        }),
      };
    case 'renewal_reminder':
      return {
        subject: `📋 Mailbox renewal reminder — ${pmbNumber}`,
        react: React.createElement(RenewalReminderEmail, {
          customerName,
          pmbNumber,
          renewalDate: (data.renewalDate as string) || '',
          daysUntilRenewal: (data.daysUntilRenewal as number) || 30,
          locationName,
        }),
      };
    case 'shipment_update':
      return {
        subject: `🚚 Shipment update — ${((data.carrier as string) || '').toUpperCase()} ${data.status || ''}`,
        react: React.createElement(ShipmentUpdateEmail, {
          customerName,
          pmbNumber,
          carrier: (data.carrier as string) || 'Unknown',
          trackingNumber: data.trackingNumber as string | undefined,
          service: data.service as string | undefined,
          status: (data.status as string) || 'shipped',
          destination: data.destination as string | undefined,
          locationName,
        }),
      };
    case 'welcome':
      return {
        subject: `🎉 Welcome to ShipOS Pro — ${pmbNumber} is ready!`,
        react: React.createElement(WelcomeEmail, {
          customerName,
          pmbNumber,
          locationName,
          locationAddress: data.locationAddress as string | undefined,
        }),
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

/**
 * Send a notification to a customer via their preferred channels.
 *
 * 1. Looks up the customer from DB
 * 2. Determines channel based on customer preferences (or explicit override)
 * 3. Sends email and/or SMS
 * 4. Records the notification in the database
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  // 1. Fetch customer
  const customer = await prisma.customer.findUnique({
    where: { id: payload.customerId },
    include: { tenant: true },
  });

  if (!customer) {
    throw new Error(`Customer not found: ${payload.customerId}`);
  }

  // 2. Determine channel
  let channel: NotificationChannel;
  if (payload.channel) {
    channel = payload.channel;
  } else {
    // Auto-detect from customer preferences
    const wantsEmail = customer.notifyEmail && customer.email;
    const wantsSms = customer.notifySms && customer.phone;
    if (wantsEmail && wantsSms) channel = 'both';
    else if (wantsSms) channel = 'sms';
    else channel = 'email'; // default to email
  }

  const shouldEmail = (channel === 'email' || channel === 'both') && customer.email;
  const shouldSms = (channel === 'sms' || channel === 'both') && customer.phone;

  // 3. Prepare template data
  const templateData: Record<string, unknown> = {
    customerName: `${customer.firstName} ${customer.lastName}`,
    pmbNumber: customer.pmbNumber,
    locationName: customer.tenant?.name || 'your mailbox location',
    locationAddress: customer.tenant
      ? [customer.tenant.address, customer.tenant.city, customer.tenant.state, customer.tenant.zipCode]
          .filter(Boolean)
          .join(', ')
      : undefined,
    ...payload.data,
  };

  // 4. Determine subject/body
  let emailSubject = payload.subject || '';
  let emailReact: React.ReactElement | undefined;
  let smsBody = payload.body || '';

  if (payload.type !== 'custom') {
    const template = getEmailTemplate(payload.type, templateData);
    if (template) {
      emailSubject = emailSubject || template.subject;
      emailReact = template.react;
    }
    smsBody = smsBody || getSmsBody(payload.type, templateData);
  }

  // 5. Create notification record (pending)
  const notification = await prisma.notification.create({
    data: {
      type: payload.type,
      channel,
      status: 'pending',
      subject: emailSubject || smsBody.slice(0, 100),
      body: smsBody || emailSubject,
      customerId: customer.id,
    },
  });

  // 6. Send email
  let emailResult: NotificationResult['emailResult'];
  if (shouldEmail) {
    emailResult = await sendEmail({
      to: customer.email!,
      subject: emailSubject,
      react: emailReact,
      text: smsBody, // plain-text fallback
      tags: [
        { name: 'type', value: payload.type },
        { name: 'notificationId', value: notification.id },
      ],
    });
  }

  // 7. Send SMS
  let smsResult: NotificationResult['smsResult'];
  if (shouldSms) {
    smsResult = await sendSms({
      to: formatPhoneE164(customer.phone!),
      body: smsBody,
    });
  }

  // 8. Update notification status
  const overallSuccess =
    (!shouldEmail || emailResult?.success) && (!shouldSms || smsResult?.success);

  const failed = (shouldEmail && !emailResult?.success) || (shouldSms && !smsResult?.success);

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: overallSuccess ? 'sent' : failed ? 'failed' : 'sent',
      sentAt: overallSuccess ? new Date() : undefined,
    },
  });

  return {
    success: !!overallSuccess,
    notificationId: notification.id,
    emailResult,
    smsResult,
  };
}
