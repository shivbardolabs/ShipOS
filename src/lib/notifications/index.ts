// Notification service — public API
export { sendNotification, retryFailedNotifications, retrySingleNotification } from './service';
export type {
  NotificationType,
  NotificationChannel,
  NotificationPayload,
  NotificationResult,
  RetryResult,
} from './service';

export { checkRateLimit, recordNotification, resetRateLimit, getRateLimitStatus } from './rate-limiter';
export type { RateLimitResult } from './rate-limiter';

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
