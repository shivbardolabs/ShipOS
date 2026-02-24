/* -------------------------------------------------------------------------- */
/*  ShipOS Product Changelog                                                  */
/*  Maintained by product team — ordered newest → oldest                      */
/* -------------------------------------------------------------------------- */

export type ChangeType = 'feature' | 'improvement' | 'fix' | 'design' | 'security';

export interface ChangeItem {
  text: string;
  type: ChangeType;
}

export interface ChangelogEntry {
  version: string;
  date: string;            // ISO date string (YYYY-MM-DD)
  title: string;
  summary: string;
  changes: ChangeItem[];
  highlights?: string[];   // Key callouts shown as badges
}

export const changelog: ChangelogEntry[] = [
  /* ------------------------------------------------------------------ */
  /*  v0.15.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.15.0',
    date: '2026-02-24',
    title: 'AI Smart Intake — Snap to Check-In',
    summary:
      'Introducing the flagship AI-powered package intake system. Point your camera at a shipping label (or upload a photo), and our vision AI instantly extracts the carrier, tracking number, sender, and customer — then checks the package in with a single tap. Process packages in seconds, not minutes.',
    highlights: ['AI Vision', 'Instant Check-In', 'Batch Mode', 'Zero Data Entry'],
    changes: [
      {
        text: 'New Smart Intake page with live camera capture, photo upload, and real-time AI label analysis',
        type: 'feature',
      },
      {
        text: 'Vision AI extracts carrier, tracking number, sender, and PMB from any shipping label — supports all major carriers',
        type: 'feature',
      },
      {
        text: 'Automatic customer matching by PMB number with one-tap confirmation to complete check-in',
        type: 'feature',
      },
      {
        text: 'Batch mode: photograph multiple packages at once and check them all in simultaneously',
        type: 'feature',
      },
      {
        text: 'Smart Intake tile added to Dashboard Favorites and sidebar navigation for quick access',
        type: 'improvement',
      },
      {
        text: 'Demo mode available for testing when OpenAI API key is not configured — cycles through realistic sample data',
        type: 'improvement',
      },
      {
        text: 'Full activity log integration — all AI-assisted check-ins are tracked with confidence scores and method metadata',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.14.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.14.0',
    date: '2026-02-23',
    title: 'Persistent Database — Vercel Postgres',
    summary:
      'Migrated from ephemeral SQLite to Vercel Postgres (Neon) for a fully persistent database. All data — users, tenants, customers, packages, login sessions — now persists across deployments, making the Master Admin panel and all features fully operational.',
    highlights: ['Vercel Postgres', 'Persistent Data', 'Production-Ready'],
    changes: [
      {
        text: 'Migrated database from SQLite to PostgreSQL via Vercel Postgres (Neon) — all data persists across deployments',
        type: 'feature',
      },
      {
        text: 'Prisma schema updated with pooled connection (pgBouncer) and direct connection for migrations',
        type: 'improvement',
      },
      {
        text: 'Automatic schema sync on each deploy via prisma db push in build pipeline',
        type: 'improvement',
      },
      {
        text: 'Master Admin panel now shows real, persistent user and login session data',
        type: 'fix',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.13.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.13.0',
    date: '2026-02-23',
    title: 'Super Admin & Master Admin Panel',
    summary:
      'New platform-level Super Admin role for designated owner accounts, with a Master Admin panel providing cross-tenant visibility into all users, login sessions, and platform activity. Login session tracking records every app access for audit and monitoring purposes.',
    highlights: ['Super Admin', 'Master Admin', 'Login Tracking', 'Cross-Tenant'],
    changes: [
      {
        text: 'New Super Admin role with rose/red visual identity — auto-assigned to platform owner (shiv@bardolabs.ai) on login',
        type: 'feature',
      },
      {
        text: 'Master Admin panel at /dashboard/admin with cross-tenant user directory showing all users, roles, tenants, login counts, and status',
        type: 'feature',
      },
      {
        text: 'Login Session tracking — every user login is recorded with timestamp for audit trail; user last-login and login count tracked',
        type: 'feature',
      },
      {
        text: 'Login Sessions tab in Master Admin showing chronological login activity grouped by date with user details',
        type: 'feature',
      },
      {
        text: 'Platform stats dashboard showing total users, active users (7-day), tenant count, and daily login count',
        type: 'feature',
      },
      {
        text: 'Sidebar shows "PLATFORM" section with Master Admin link only for Super Admin users, styled with distinctive rose accent',
        type: 'improvement',
      },
      {
        text: 'Role system expanded from 3 to 4 roles: Super Admin (rose), Admin (violet), Manager (amber), Employee (teal)',
        type: 'improvement',
      },
      {
        text: 'All admin-gated API routes now accept both admin and superadmin roles for backwards compatibility',
        type: 'improvement',
      },
      {
        text: 'Access-restricted guard on Master Admin page with clear messaging for non-superadmin users',
        type: 'security',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.12.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.12.0',
    date: '2026-02-23',
    title: 'User Activity Logging & Audit Trail',
    summary:
      'Every action in ShipOS is now tracked and attributed to the user who performed it. A new Activity Log page gives admins and managers full visibility into staff operations. "Last performed by" indicators appear across the product so you always know who did what.',
    highlights: ['Activity Logging', 'Audit Trail', 'User Attribution'],
    changes: [
      {
        text: 'Activity Log service with 30+ tracked action types across packages, customers, mail, shipping, notifications, and settings',
        type: 'feature',
      },
      {
        text: 'Dedicated Activity Log page at /dashboard/activity-log with search, category/user filters, aggregate stats, and timeline view',
        type: 'feature',
      },
      {
        text: '"Last performed by" indicators on Package Check-In, Check-Out, Mail, Shipping, and Settings pages showing who last took action',
        type: 'feature',
      },
      {
        text: 'Dashboard Recent Activity feed now displays user attribution (name + role) for every logged action',
        type: 'improvement',
      },
      {
        text: 'Customer detail Activity tab powered by real activity log data with full ActivityTimeline component',
        type: 'improvement',
      },
      {
        text: 'PageHeader component extended with icon and badge props for flexible page-level indicators',
        type: 'improvement',
      },
      {
        text: 'Activity Log added to sidebar navigation under Business section',
        type: 'improvement',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.11.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.11.0',
    date: '2026-02-22',
    title: 'Notifications, PMB Setup & Checkout Payments',
    summary:
      'Big round of improvements driven by user testing. Package Checkout now supports Account Status with A/R and A/P-based payment methods. Notifications are clickable and route to the relevant page. A new guided PMB setup wizard ensures USPS CMRA compliance. Plus Resend email and Twilio SMS are now wired in for real notifications.',
    highlights: ['Checkout Payments', 'PMB Wizard', 'Email & SMS'],
    changes: [
      {
        text: 'Account Status tab in Package Checkout with A/R balance and A/P-based payment options',
        type: 'feature',
      },
      {
        text: 'Notification click navigation — clicking a notification routes to the relevant package, customer, or compliance page',
        type: 'feature',
      },
      {
        text: 'PMB number now displays on customer cards and detail pages for quick identification',
        type: 'improvement',
      },
      {
        text: 'Carrier tracking links on package detail — click to open UPS, FedEx, USPS, or DHL tracking',
        type: 'feature',
      },
      {
        text: 'Guided PMB customer setup wizard with PS Form 1583, CMRA compliance checks, and mailbox assignment',
        type: 'feature',
      },
      {
        text: 'Add Customer form refined per user testing — improved field order, labels, and validation feedback',
        type: 'improvement',
      },
      {
        text: 'Resend email integration for transactional notifications (package arrival, compliance reminders)',
        type: 'feature',
      },
      {
        text: 'Twilio SMS integration for real-time text message alerts to customers',
        type: 'feature',
      },
      {
        text: 'Competitor comparison table consolidated into a single 3-column layout on pricing page',
        type: 'improvement',
      },
      {
        text: 'Fixed duplicate Mailbox Config tab in settings and several variant/build issues',
        type: 'fix',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.10.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.10.0',
    date: '2026-02-22',
    title: 'Invite Users & Team Onboarding',
    summary:
      'The +Invite User button in Settings → Users & Roles is now fully functional. Admins can invite team members by email with a specific role. When the invited person signs in via Auth0, they automatically join the correct team with their assigned role — no manual setup needed.',
    highlights: ['Invite by Email', 'Auto-Join on Sign-In', 'Role Assignment'],
    changes: [
      {
        text: 'Working +Invite User flow — enter an email and role, invitation is recorded and honored on sign-in',
        type: 'feature',
      },
      {
        text: 'Invitation model with pending/accepted/revoked status tracking',
        type: 'feature',
      },
      {
        text: 'Pending Invitations list in Users & Roles tab with revoke capability',
        type: 'feature',
      },
      {
        text: 'Auth0 sign-in now checks for pending invitations — invited users auto-join the correct tenant and role',
        type: 'feature',
      },
      {
        text: 'Admin-only access control on invite creation and revocation',
        type: 'security',
      },
      {
        text: 'Polished invite modal with email validation, role selector, and success/error feedback',
        type: 'design',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.9.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.9.0',
    date: '2026-02-22',
    title: 'Features Page & Consistent Navigation',
    summary:
      'Added a comprehensive product features page showcasing every capability across five categories — Core Operations, Customer Management, Shipping & Carriers, Compliance & Reporting, and Platform & Experience. All public pages (Home, Features, Pricing, Support) now share a unified navigation header so visitors never lose their place.',
    highlights: ['Features Page', 'Shared Nav', '5 Categories'],
    changes: [
      {
        text: 'New /features page with 20+ feature cards organized into 5 product categories',
        type: 'feature',
      },
      {
        text: 'Shared PublicHeader component ensures Features, Pricing, and Support nav links appear on every public page',
        type: 'improvement',
      },
      {
        text: 'Shared PublicFooter component for consistent branding across all public pages',
        type: 'improvement',
      },
      {
        text: 'Hero stats row on features page (18+ pages, 10+ carriers, 30-day trial, 99.9% SLA)',
        type: 'design',
      },
      {
        text: 'Alternating section alignment for visual rhythm on the features page',
        type: 'design',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.8.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.8.0',
    date: '2026-02-22',
    title: 'Public Site & Support',
    summary:
      'ShipOS now has a complete public-facing site with dedicated Pricing and Support pages. The pricing page offers three tiers (Starter, Pro, Enterprise) with an annual billing toggle and full feature comparison table. The support page provides email, live chat, and phone contact channels plus an FAQ section.',
    highlights: ['Pricing Page', 'Support Page', '3 Tiers'],
    changes: [
      {
        text: 'Pricing page with Starter ($99), Pro ($179), and Enterprise ($299) tiers and monthly/annual toggle',
        type: 'feature',
      },
      {
        text: 'Full feature comparison table across all three plans',
        type: 'feature',
      },
      {
        text: 'Accordion FAQ section on pricing page with 6 common questions',
        type: 'feature',
      },
      {
        text: 'Dedicated /support page with Email, Live Chat, and Phone support channels',
        type: 'feature',
      },
      {
        text: 'Support FAQ section covering import, carriers, tablet usage, and free trial',
        type: 'feature',
      },
      {
        text: 'Free trial updated from 14 days to 30 days across all pages',
        type: 'improvement',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.7.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.7.0',
    date: '2026-02-22',
    title: 'Multi-Tenancy & Team Management',
    summary:
      'ShipOS is now fully multi-tenant. Each customer organization gets an isolated tenant with its own branding, timezone, tax rates, and business hours. A new Users & Roles system lets store owners invite team members and control access with Admin, Manager, and Staff roles.',
    highlights: ['Multi-Tenant', 'Users & Roles', 'Org Isolation'],
    changes: [
      {
        text: 'Multi-tenant architecture — each store gets an isolated tenant with custom settings',
        type: 'feature',
      },
      {
        text: 'Tenant settings: store name, address, timezone, business hours, tax rate, and branding',
        type: 'feature',
      },
      {
        text: 'Automatic tenant provisioning on first login via Auth0',
        type: 'feature',
      },
      {
        text: 'Users & Roles management page — invite team members by email',
        type: 'feature',
      },
      {
        text: 'Three roles: Admin (full access), Manager (day-to-day ops), Staff (check-in/out only)',
        type: 'feature',
      },
      {
        text: 'Role-based access control enforced across the dashboard',
        type: 'security',
      },
      {
        text: 'Product changelog page with timeline UI, filters, and expandable release cards',
        type: 'feature',
      },
      {
        text: '"What\'s New" button in the dashboard header links to changelog',
        type: 'improvement',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.6.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.6.0',
    date: '2026-02-22',
    title: 'Notification Center',
    summary:
      'The notification bell in the header is now fully interactive. Clicking it opens a real-time dropdown showing recent package alerts, SMS delivery confirmations, and compliance reminders — so staff never miss an update without leaving their current screen.',
    highlights: ['Real-Time Alerts', 'Unread Badge'],
    changes: [
      {
        text: 'Notification bell now opens a dropdown panel with the 8 most recent alerts',
        type: 'feature',
      },
      {
        text: 'Unread badge count updates automatically as new notifications arrive',
        type: 'feature',
      },
      {
        text: 'Mark individual notifications as read with a single click',
        type: 'improvement',
      },
      {
        text: '"Mark all as read" action clears the entire queue instantly',
        type: 'improvement',
      },
      {
        text: 'Notification types include package check-in, SMS delivery, compliance alerts, and customer updates',
        type: 'feature',
      },
      {
        text: 'Panel closes on click-outside and Escape key for smooth workflow',
        type: 'improvement',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.5.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.5.0',
    date: '2026-02-21',
    title: 'Loyalty Program',
    summary:
      'Introducing a built-in loyalty engine to help stores reward their best customers. Configurable tiers (Bronze → Platinum), point accumulation on every transaction, redeemable rewards, and a referral program — all manageable from a dedicated settings page and visible on each customer\'s profile.',
    highlights: ['4 Tiers', 'Points & Rewards', 'Referral Program'],
    changes: [
      {
        text: 'New Loyalty Program dashboard with KPIs, tier distribution chart, and member leaderboard',
        type: 'feature',
      },
      {
        text: 'Four configurable tiers — Bronze, Silver, Gold, and Platinum — with automatic upgrades based on points',
        type: 'feature',
      },
      {
        text: 'Points accumulate on package check-in, shipping, and mailbox renewals',
        type: 'feature',
      },
      {
        text: 'Rewards catalog — create and manage redeemable rewards (discounts, free shipping, etc.)',
        type: 'feature',
      },
      {
        text: 'Referral program settings with configurable bonus points for referrer and referee',
        type: 'feature',
      },
      {
        text: 'Customer detail now shows a Loyalty tab with tier progress, point history, and reward redemption',
        type: 'feature',
      },
      {
        text: 'Loyalty settings page for program configuration, tier thresholds, and rewards CRUD',
        type: 'feature',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.4.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.4.0',
    date: '2026-02-21',
    title: 'Customer Management Upgrade',
    summary:
      'A major upgrade to how stores manage their customers. You can now add customers via a detailed form or bulk-import hundreds at once with a CSV wizard. Customer profiles also feature photo avatars with upload support for faster visual identification at the counter.',
    highlights: ['Bulk CSV Import', 'Photo Avatars', 'Form Validation'],
    changes: [
      {
        text: 'Add Customer form with personal info, mailbox setup, ID & compliance fields, and notification preferences',
        type: 'feature',
      },
      {
        text: 'Bulk CSV Import wizard — 4-step flow: upload → column mapping → preview → confirmation',
        type: 'feature',
      },
      {
        text: 'Smart delimiter detection supports comma, tab, and semicolon-separated files',
        type: 'improvement',
      },
      {
        text: 'Downloadable CSV template so new stores can format their data correctly on the first try',
        type: 'improvement',
      },
      {
        text: 'Customer photo avatars with camera-overlay upload on hover',
        type: 'feature',
      },
      {
        text: 'Six avatar size presets (xs → 2xl) with gradient-colored initials fallback',
        type: 'design',
      },
      {
        text: 'Updated customer list, detail, check-in, check-out, and kiosk pages to show photo avatars',
        type: 'improvement',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.3.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.3.0',
    date: '2026-02-21',
    title: 'Carrier Support & Reconciliation',
    summary:
      'Expanded carrier support with official logos for all major providers and introduced a shipping reconciliation tool so stores can audit invoices, catch overcharges, and file disputes — directly inside ShipOS.',
    highlights: ['10+ Carriers', 'Reconciliation Tool'],
    changes: [
      {
        text: 'Official-style carrier logos for UPS, FedEx, USPS, DHL, Amazon, LaserShip, Temu, and OnTrac',
        type: 'feature',
      },
      {
        text: 'Added LaserShip, Temu, and OnTrac as new carrier options across all package workflows',
        type: 'feature',
      },
      {
        text: 'New Shipping Reconciliation page — compare carrier invoices against shipment records to identify discrepancies',
        type: 'feature',
      },
      {
        text: 'Dispute management workflow: flag overcharges, track disputes, and record credits received',
        type: 'feature',
      },
      {
        text: 'Carrier logo buttons updated on check-in, kiosk, shipping, and end-of-day pages',
        type: 'improvement',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.2.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.2.0',
    date: '2026-02-21',
    title: 'Authentication & Theming',
    summary:
      'Added secure authentication with Auth0, a personalized dashboard greeting, and a light/dark theme switcher. The entire UI was also refined with the Indigo Premium design system for a polished, enterprise-grade experience.',
    highlights: ['Auth0 SSO', 'Light & Dark Mode', 'Indigo Theme'],
    changes: [
      {
        text: 'Auth0 integration — secure sign-up and login with email/password and social providers',
        type: 'feature',
      },
      {
        text: 'Personalized dashboard greeting shows the logged-in user\'s name and live date/time',
        type: 'feature',
      },
      {
        text: 'Theme switcher — toggle between light and dark mode; preference persists across sessions',
        type: 'feature',
      },
      {
        text: 'Indigo Premium design system applied across all surfaces, typography, and components',
        type: 'design',
      },
      {
        text: 'Updated color palette: Indigo primary spectrum, refined surface grays, and accent colors',
        type: 'design',
      },
      {
        text: 'DM Sans body font, Instrument Serif accents, and JetBrains Mono for code/data',
        type: 'design',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.1.0                                                             */
  /* ------------------------------------------------------------------ */
  {
    version: '0.1.0',
    date: '2026-02-21',
    title: 'ShipOS Launch',
    summary:
      'The initial release of ShipOS — a complete postal store management platform built for modern CMRA and pack-and-ship businesses. Covers the full operational workflow from package intake to end-of-day closing, with customer management, compliance tools, and analytics built in.',
    highlights: ['18 Pages', '12 Data Models', 'iOS App'],
    changes: [
      {
        text: 'Package Check-In wizard with carrier selection, barcode entry, and customer lookup',
        type: 'feature',
      },
      {
        text: 'Package Check-Out flow with ID verification, signature capture, and release confirmation',
        type: 'feature',
      },
      {
        text: 'Customer management — profiles, mailbox (PMB) assignments, billing terms, and ID tracking',
        type: 'feature',
      },
      {
        text: 'CMRA Compliance dashboard — PS Form 1583 tracking, ID expiry alerts, and audit readiness',
        type: 'feature',
      },
      {
        text: 'Multi-carrier shipping center with rate comparison and label generation',
        type: 'feature',
      },
      {
        text: 'End-of-Day workflows — carrier scan counts, discrepancy flags, and day-close report',
        type: 'feature',
      },
      {
        text: 'Reports & Analytics page with revenue trends, package volume, and customer metrics',
        type: 'feature',
      },
      {
        text: 'Invoicing module for mailbox rental billing and service charges',
        type: 'feature',
      },
      {
        text: 'Kiosk Mode — full-screen self-service interface for customer package pickup',
        type: 'feature',
      },
      {
        text: 'Command Palette (⌘K) — fuzzy search across customers, packages, and actions',
        type: 'feature',
      },
      {
        text: 'SMS-first notification system with 98% open rate — email fallback included',
        type: 'feature',
      },
      {
        text: 'PostalMate → ShipOS migration tool — analyze existing data, map fields, and import with rollback support',
        type: 'feature',
      },
      {
        text: 'Bardo Labs brand guide applied — purple + silver theme with custom SVG logos',
        type: 'design',
      },
      {
        text: 'iOS companion app (React Native) with 9 screens, barcode scanning, and dark theme',
        type: 'feature',
      },
      {
        text: 'PWA support — install ShipOS as a standalone app on any device',
        type: 'feature',
      },
      {
        text: 'React Server Components CVE patches applied for production security',
        type: 'security',
      },
    ],
  },
];
