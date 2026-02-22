// Notification service — public API
export { sendNotification } from './service';
export type {
  NotificationType,
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
} from './service';

export { sendEmail } from './resend';
export type { SendEmailParams, SendEmailResult } from './resend';

export { sendSms, formatPhoneE164 } from './twilio';
export type { SendSmsParams, SendSmsResult } from './twilio';
