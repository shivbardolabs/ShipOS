// Notification service — public API
export { sendNotification } from './service';
export type {
  NotificationType,
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
} from './service';

export { sendEmail, listDomains, verifyDomain } from './resend';
export type { SendEmailParams, SendEmailResult, EmailCategory, DomainVerification } from './resend';

export { sendSms, formatPhoneE164, hasActiveConsent, isFirstSmsToCustomer, brandLinks } from './twilio';
export type { SendSmsParams, SendSmsResult } from './twilio';

export {
  renderEmailTemplate,
  packageArrivalTemplate,
  renewalReminderTemplate,
  welcomeTemplate,
  idExpiringTemplate,
} from './email-templates';
export type { EmailTemplateOptions } from './email-templates';
