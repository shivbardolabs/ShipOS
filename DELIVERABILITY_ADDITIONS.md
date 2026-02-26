# Deliverability Feature Additions

Items that need to be added by the sidebar / feature-flag / schema thread.

---

## 1. Sidebar Navigation (sidebar.tsx)

Add under the **Admin** section (superadmin only):

```ts
{ label: 'Deliverability', href: '/dashboard/admin/deliverability', icon: Activity },
{ label: 'Email Health', href: '/dashboard/admin/email-deliverability', icon: Mail },
{ label: 'SMS Health', href: '/dashboard/admin/sms-deliverability', icon: Smartphone },
```

Import icons from `lucide-react`: `Activity`, `Mail`, `Smartphone`

---

## 2. Feature Flag Definitions (feature-flag-definitions.ts)

Add flags:

```ts
{
  key: 'email_deliverability_dashboard',
  name: 'Email Deliverability Dashboard',
  description: 'Admin dashboard for email DNS auth, domain verification, and sending reputation',
  category: 'crm',
  defaultEnabled: true,
},
{
  key: 'sms_deliverability_dashboard',
  name: 'SMS Deliverability Dashboard',
  description: 'Admin dashboard for 10DLC, CTIA compliance, and consent management',
  category: 'crm',
  defaultEnabled: true,
},
{
  key: 'crm_deliverability_overview',
  name: 'CRM Deliverability Overview',
  description: 'Combined email + SMS deliverability health dashboard',
  category: 'crm',
  defaultEnabled: true,
},
```

---

## 3. Prisma Schema (schema.prisma)

Add the `SmsConsent` model:

```prisma
model SmsConsent {
  id          String   @id @default(cuid())
  customerId  String
  phone       String
  consentedAt DateTime @default(now())
  method      String   // 'registration', 'checkbox', 'sms_reply'
  ipAddress   String?
  optedOutAt  DateTime?
  createdAt   DateTime @default(now())
}
```

After adding, run:
```bash
npx prisma generate
npx prisma db push   # or create a migration
```

---

## 4. API Routes (optional, for live data on dashboards)

### GET /api/admin/email-deliverability
Returns domain verification data from Resend. Calls `listDomains()` from `src/lib/notifications/resend.ts`.

### GET /api/admin/sms-deliverability
Returns consent stats from `SmsConsent` model. Example response:
```json
{
  "totalConsented": 142,
  "totalOptedOut": 8,
  "recentOptOuts": 2,
  "consentMethods": { "registration": 100, "checkbox": 30, "sms_reply": 12 }
}
```

---

## 5. Notification Index Exports (src/lib/notifications/index.ts)

Add exports for the new email templates module:

```ts
export {
  renderEmailTemplate,
  packageArrivalTemplate,
  renewalReminderTemplate,
  welcomeTemplate,
  idExpiringTemplate,
} from './email-templates';
export type { EmailTemplateOptions } from './email-templates';
```

And the new Resend exports:

```ts
export { listDomains, verifyDomain } from './resend';
export type { DomainVerification, EmailCategory } from './resend';
```

And the new Twilio exports:

```ts
export { hasActiveConsent, isFirstSmsToCustomer, brandLinks } from './twilio';
```
