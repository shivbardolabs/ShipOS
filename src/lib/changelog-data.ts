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
  /*  v0.27.0                                                           */
  /* ------------------------------------------------------------------ */
  {
    version: '0.27.0',
    date: '2026-03-01',
    title: 'Camera-Based Package Dimension Measurement, Mailbox Account Lifecycle',
    summary:
      'AI-powered package dimension measurement during check-in — staff photographs a package and GPT-4o Vision estimates L × W × H in inches. Plus complete mailbox account lifecycle: Form 1583 tracking, change guards, registration API, automated renewals, PMB closure workflow, and core module tab navigation.',
    highlights: ['📐 Camera Measure', 'Form 1583', 'PMB Lifecycle', 'Tab Navigation'],
    changes: [
      {
        text: 'BAR-341 — Camera-based package dimension measurement: photograph a package during check-in, GPT-4o Vision estimates L×W×H with confidence scoring, inline editing, DIM weight calculation',
        type: 'feature',
      },
      {
        text: 'New Package fields: lengthIn, widthIn, heightIn, weightLbs, dimensionSource, measurePhoto — full dimension tracking on every package',
        type: 'feature',
      },
      {
        text: 'BAR-19 — Form 1583 status tracking: full PS1583 lifecycle per customer with status badges, notarization tracking, 1-year expiry, version history',
        type: 'feature',
      },
      {
        text: 'BAR-235 — PS1583 change guard: warning dialog on protected field edits (name, address, ID) with old→new diff, auto-flags for re-filing',
        type: 'feature',
      },
      {
        text: 'BAR-77 — Mailbox registration API: wired wizard to POST /api/mailboxes/register with PMB uniqueness check and available number inventory',
        type: 'feature',
      },
      {
        text: 'BAR-191 — Automated renewal processing: auto-renew with 1583+ID validation, manual renew with re-filing trigger, configurable 1-24mo terms',
        type: 'feature',
      },
      {
        text: 'BAR-234 — PMB closure & non-renewal: multi-step closure (preflight → retention offer → confirm → post-closure), auto-RTS packages, 6mo doc retention',
        type: 'feature',
      },
      {
        text: 'BAR-114 — Core module tab navigation with ⌘1-6 keyboard shortcuts, persistent across sub-screens',
        type: 'improvement',
      },
      {
        text: 'Demo mode for camera measurement: cycles through realistic sample data when OPENAI_API_KEY is not configured',
        type: 'improvement',
      },
      {
        text: 'Feature flag: camera_measure_dimensions (category: ai) — controls visibility of dimension measurement in check-in',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.26.0                                                           */
  /* ------------------------------------------------------------------ */
  {
    version: '0.26.0',
    date: '2026-03-01',
    title: 'Barcode Scanning, Mail Intake, Notification Engine, User Status Management, Firebird Migration Parser',
    summary:
      'This release completes 9 backlog items across two batches — finishing the 3 in-progress issues (check-in wizard, customer lookup, RTS workflow) and implementing 6 new features: barcode scanning in check-in, mail scan & assignment, notification infrastructure with retry and rate limiting, user status management with soft delete, package storage location on labels, and a real Firebird backup parser for PostalMate migration.',
    highlights: ['Barcode Scanning', 'Mail Intake', 'Notification Engine', 'User Status', 'Firebird Parser'],
    changes: [
      {
        text: 'BAR-11 — Barcode scanning in package check-in: camera scanner + USB keyboard wedge detection + auto carrier detection',
        type: 'feature',
      },
      {
        text: 'BAR-14 — Mail scan & assignment: POST /api/mail with camera/upload for front + back envelope, PMB customer lookup, auto mail_received notifications',
        type: 'feature',
      },
      {
        text: 'BAR-23 — Notification infrastructure: rate limiter (3/hr, 10/day per customer), retry with exponential backoff, NotificationTemplate CRUD with 5 defaults',
        type: 'feature',
      },
      {
        text: 'BAR-115 — PostalMate Firebird backup parser: binary .7z/.fbk parser with table detection, Windows-1252→UTF-8 encoding, confidence scoring',
        type: 'feature',
      },
      {
        text: 'BAR-183 — User status management & soft delete: admin API with status filter, auth blocks inactive/suspended users, Settings UI with audit toggle',
        type: 'feature',
      },
      {
        text: 'BAR-194 — Package storage location on 4×6 labels (24pt bold), location filter on packages page, location badge on check-out cards',
        type: 'feature',
      },
      {
        text: 'BAR-9 — Package check-in wizard gaps: cancel flow with draft save, photo capture, multi-package batch, keyboard nav, offline handling, error retry',
        type: 'improvement',
      },
      {
        text: 'BAR-38 — Customer lookup: smart result ranking (exact PMB → starts-with → name → phone → fuzzy), inactive customers with status badges',
        type: 'improvement',
      },
      {
        text: 'BAR-321 — RTS workflow: auto-RTS on PMB closure/expiry with deduplication and audit trail',
        type: 'improvement',
      },
      {
        text: 'Notification dashboard: customer search filter, "Failed" quick filter, inline retry buttons on failed notifications',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.25.0                                                    */
  /* ------------------------------------------------------------------ */
  {
    version: '0.25.0',
    date: '2026-02-28',
    title: 'Subscription billing with idempotent batch charging, Move sidebar pages into Settings, Package program selector in check-in wizard Step 1',
    summary:
      'This release includes 29 updates.',
    highlights: ['Subscription billing', 'Move sidebar', 'Package program'],
    changes: [
      {
        text: 'Subscription billing with idempotent batch charging',
        type: 'feature',
      },
      {
        text: 'Move sidebar pages into Settings',
        type: 'feature',
      },
      {
        text: 'Package program selector in check-in wizard Step 1',
        type: 'feature',
      },
      {
        text: 'Wire core pages to Postgres — customers, packages, mail, shipments, notifications, dashboard stats',
        type: 'feature',
      },
      {
        text: 'Wire all pages to Postgres — eliminate mock-data site-wide',
        type: 'feature',
      },
      {
        text: 'Wire super-admin pages to Postgres — dashboard, clients, users, billing',
        type: 'feature',
      },
      {
        text: 'Log batch label prints in Activity Log',
        type: 'feature',
      },
      {
        text: 'Court-Ordered Protected Individual checkbox with file upload (PS1583 4k)',
        type: 'feature',
      },
      {
        text: 'Consolidate Super Admin into single Platform Console entry',
        type: 'feature',
      },
      {
        text: 'Good Taste UI — 18 design principles',
        type: 'feature',
      },
      {
        text: 'Super Admin console — dashboard, clients, users, billing & reports',
        type: 'feature',
      },
      {
        text: 'Batch A — Dashboard & UX (BAR-258, BAR-264, BAR-303, BAR-100, BAR-189)',
        type: 'feature',
      },
      {
        text: 'Activity Log now reads from real AuditLog database',
        type: 'fix',
      },
      {
        text: 'BAR-311/312/313/314 — Settings page bug fixes',
        type: 'fix',
      },
      {
        text: 'Apply PR #105 changes on current main',
        type: 'improvement',
      },
      {
        text: 'Apply PR #102 changes on current main',
        type: 'improvement',
      },
      {
        text: 'Apply PR #94 changes on current main',
        type: 'improvement',
      },
      {
        text: 'Apply PR #30 changes on current main',
        type: 'improvement',
      },
      {
        text: 'Apply PR #26 changes on current main',
        type: 'improvement',
      },
      {
        text: 'Upload Photo opens gallery instead of camera',
        type: 'fix',
      },
      {
        text: 'Wire up logo upload in Settings → Receipts',
        type: 'fix',
      },
      {
        text: 'Wire up Edit Template & Upload New Template buttons in Mailbox Config',
        type: 'fix',
      },
      {
        text: 'Correct Check In & Check Out routes in command palette',
        type: 'fix',
      },
      {
        text: 'Wire up Release Package button in Package Details modal',
        type: 'fix',
      },
      {
        text: 'Resolve 5 UI bugs found during automated testing',
        type: 'fix',
      },
      {
        text: 'Wire customer creation to database instead of mock-only UI',
        type: 'fix',
      },
      {
        text: 'Restrict secondary ID dropdown to drivers lic + secondary IDs only',
        type: 'fix',
      },
      {
        text: 'Add CI status badge to README',
        type: 'improvement',
      },
      {
        text: 'Resolve camera spinner stuck on Starting Camera (BAR-227)',
        type: 'fix',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  v0.24.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.24.0',
    date: '2026-02-26',
    title: 'Camera Fixes, Legal Management, Analytics & Deliverability',
    summary:
      'Fixed camera bugs on mobile, added admin-managed Terms & Privacy pages with versioning, integrated Google Tag Manager, enhanced PostHog analytics, and built email/SMS deliverability dashboards.',
    changes: [
      { text: 'Fixed camera black screen on Android/Chrome — fullscreen viewfinder with loading state', type: 'fix' },
      { text: 'Upload Photo now opens gallery instead of camera on mobile', type: 'fix' },
      { text: 'Added image validation to prevent MIME type errors on empty captures', type: 'fix' },
      { text: 'Comprehensive Terms of Service content for CMRA/mail management', type: 'feature' },
      { text: 'Comprehensive Privacy Policy content with third-party disclosures', type: 'feature' },
      { text: 'Admin Legal Document Management — edit T&C/PP from dashboard, version history, auto re-acceptance', type: 'feature' },
      { text: 'Google Tag Manager integration — deploy third-party scripts without deployments', type: 'feature' },
      { text: 'Enhanced PostHog analytics wrapper with event catalogue and page tracking', type: 'feature' },
      { text: 'Weekly analytics report cron endpoint', type: 'feature' },
      { text: 'Email deliverability dashboard — SPF/DKIM/DMARC checklist, domain verification, warming guide', type: 'feature' },
      { text: 'SMS deliverability dashboard — 10DLC registration guide, CTIA compliance, consent tracking', type: 'feature' },
      { text: 'CRM deliverability overview — combined email + SMS health dashboard', type: 'feature' },
      { text: 'Enhanced email sending with List-Unsubscribe headers and category tagging', type: 'improvement' },
      { text: 'SMS compliance — automatic business name, opt-out handling (STOP/HELP/START)', type: 'improvement' },
      { text: 'Professional HTML email templates (CAN-SPAM compliant)', type: 'improvement' },
    ],
    highlights: ['Camera Fix', 'Legal Admin', 'GTM', 'Deliverability'],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.23.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.23.0',
    date: '2026-02-24',
    title: 'Demo Mode, Legacy Migration, Offline PWA & QA Tests',
    summary:
      'Four operational-readiness features in one release: a one-click Demo Mode that seeds realistic sample data for store walkthroughs, a generic Legacy Data Migration engine supporting PostalMate and Mail Manager imports, a full Offline PWA mode with background sync so ShipOS keeps working when the internet drops, and a QA testing infrastructure with E2E, API, and load tests.',
    highlights: ['Demo Mode', 'Legacy Migration', 'Offline PWA', 'QA Testing'],
    changes: [
      {
        text: 'Demo Mode with one-click seed — creates a demo tenant with 12 customers and 8 packages for instant walkthroughs',
        type: 'feature',
      },
      {
        text: 'Interactive demo page at /dashboard/demo with guided walkthrough steps',
        type: 'feature',
      },
      {
        text: 'Generic Legacy Data Migration engine with configurable field mapping for PostalMate, Mail Manager, and generic CSV',
        type: 'feature',
      },
      {
        text: 'Migration UI with upload, validate, and import workflow including dry-run validation and dedup',
        type: 'feature',
      },
      {
        text: 'Offline Mode (PWA) with service worker — cache-first for static assets, network-first for API calls',
        type: 'feature',
      },
      {
        text: 'Offline mutation queue with automatic replay when connectivity is restored',
        type: 'feature',
      },
      {
        text: 'Offline fallback page and OfflineProvider component with status banner',
        type: 'improvement',
      },
      {
        text: 'QA infrastructure: Playwright E2E tests, API integration tests for 21 endpoints, and k6 load tests for 20 concurrent users',
        type: 'feature',
      },
      {
        text: 'New TOOLS sidebar section with Legacy Migration and Demo links',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.22.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.22.0',
    date: '2026-02-24',
    title: 'Renewals, SMS Compliance, Provisioning & More',
    summary:
      'Seven production-readiness features: automated renewal processing with dunning windows and suspension, SMS compliance (TCPA/CTIA) with opt-in/out keyword handling, a 7-step account provisioning wizard, white-label co-branding, email address changes with token verification, Zebra ZPL label printing, and a PMTools CSV migration engine.',
    highlights: ['Auto Renewals', 'SMS Compliance', 'Provisioning Wizard', 'ZPL Printer', 'White-Label'],
    changes: [
      {
        text: 'Automated Renewal Processing with 30/15/7/1 day dunning windows, auto-invoicing, and 15-day grace period before suspension',
        type: 'feature',
      },
      {
        text: 'Renewals dashboard at /dashboard/renewals with pipeline overview of upcoming and overdue renewals',
        type: 'feature',
      },
      {
        text: 'SMS Compliance (TCPA/CTIA) — Twilio webhook handling for STOP/START/HELP keywords with full consent audit trail',
        type: 'feature',
      },
      {
        text: '7-step Account Provisioning Wizard that creates Customer + Agreement + Invoice + PMB assignment in a single atomic transaction',
        type: 'feature',
      },
      {
        text: 'White-Label Co-Branding — upload logo, set accent color, tagline, and favicon with live preview. CSS custom properties applied globally',
        type: 'feature',
      },
      {
        text: 'Email Address Update flow with token-based verification (24h expiry) and audit logging',
        type: 'feature',
      },
      {
        text: 'Zebra ZPL Printer support — 4\u00d76 label generator with Code 128 barcode, network print via IP:9100 with browser fallback',
        type: 'feature',
      },
      {
        text: 'PMTools CSV Migration Engine supporting CUSTOMER, MBDETAIL, PACKAGES, and BILLING table imports',
        type: 'feature',
      },
      {
        text: 'All 7 features behind feature flags for safe rollout',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.21.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.21.0',
    date: '2026-02-24',
    title: 'Stripe, Billing, Multi-Store & Security',
    summary:
      'Seven enterprise features: Stripe payment integration for card payments and subscriptions, a subscription billing engine with plan management, multi-store support so one account manages multiple locations, auth security enhancements (rate limiting, 2FA prep), field-level encryption for PII, enhanced package check-out, and advanced BI reporting with CSV/PDF export.',
    highlights: ['Stripe Payments', 'Subscription Billing', 'Multi-Store', 'BI Reports', 'Encryption'],
    changes: [
      {
        text: 'Stripe Payment Integration — accept card payments for invoices and services with Stripe Elements',
        type: 'feature',
      },
      {
        text: 'Subscription Billing Engine with plan management, metered usage, and automatic invoicing',
        type: 'feature',
      },
      {
        text: 'Multi-Store Support — manage multiple store locations from a single account with location switching',
        type: 'feature',
      },
      {
        text: 'Auth Security Enhancements — rate limiting, session hardening, and 2FA preparation',
        type: 'security',
      },
      {
        text: 'Field-Level Encryption for sensitive PII fields (SSN, ID numbers) using AES-256',
        type: 'security',
      },
      {
        text: 'Enhanced Package Check-Out with improved ID verification flow and release confirmation',
        type: 'improvement',
      },
      {
        text: 'Advanced BI Reporting & Export — customizable reports with CSV and PDF export options',
        type: 'feature',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.20.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.20.0',
    date: '2026-02-24',
    title: 'Legal, RBAC, Tenant Lifecycle & Audit Diffs',
    summary:
      'Seven foundational requirements-gap features: Terms of Service and Privacy Policy pages with mandatory agreement, full RBAC with 34 permissions across 4 roles, tenant lifecycle management (active/paused/disabled/trial), user status and soft delete, package storage location tracking, audit log before/after diff view, and signature capture in checkout.',
    highlights: ['RBAC', 'Legal Pages', 'Tenant Lifecycle', 'Audit Diffs', 'Checkout Signature'],
    changes: [
      {
        text: 'Legal pages — Terms of Service, Privacy Policy, and mandatory agreement gate with checkboxes before accessing the dashboard',
        type: 'feature',
      },
      {
        text: 'Full RBAC system with 34 actions across 4 roles (Super Admin, Admin, Manager, Employee) enforced on both client and server',
        type: 'feature',
      },
      {
        text: 'Tenant Lifecycle Management — activate, pause, or disable tenants from the admin panel with full-screen blocking for paused/disabled stores',
        type: 'feature',
      },
      {
        text: 'User Status & Soft Delete — activate/deactivate users, soft delete with audit trail, blocked login for inactive users',
        type: 'feature',
      },
      {
        text: 'Package Storage Location tracking — enter location during check-in, displayed in package list and detail views',
        type: 'feature',
      },
      {
        text: "Audit Log Before/After Diff View — expandable rows showing old\u2192new value changes for every tracked action",
        type: 'feature',
      },
      {
        text: 'Signature Capture in Checkout — integrated signature pad with clear/re-sign capability, stored in activity log',
        type: 'feature',
      },
      {
        text: 'All 7 features behind feature flags for granular rollout control',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.19.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.19.0',
    date: '2026-02-24',
    title: 'Action Pricing Dashboard',
    summary:
      'A new admin dashboard for managing per-action pricing across the store. Every action (mail handling, package check-in, shipping, notary, etc.) now has a configurable retail price, COGS, and margin calculation. Supports tiered pricing and a three-level override hierarchy: Universal \u2192 Segment \u2192 Individual Customer.',
    highlights: ['Per-Action Pricing', 'Tiered Pricing', 'Override Hierarchy', 'Margin Tracking'],
    changes: [
      {
        text: 'Action Pricing Dashboard at /dashboard/pricing with full CRUD for action prices',
        type: 'feature',
      },
      {
        text: 'Every action has retail price, COGS, and automatic margin calculation',
        type: 'feature',
      },
      {
        text: 'Tiered pricing support — first unit + additional unit pricing for volume actions',
        type: 'feature',
      },
      {
        text: 'Three-level override hierarchy: Universal \u2192 Segment (store type) \u2192 Individual Customer',
        type: 'feature',
      },
      {
        text: '6 action categories: Mail, Package, Shipping, Scanning, Notary, General',
        type: 'feature',
      },
      {
        text: 'Stats overview showing total actions, active count, override count, and average margin',
        type: 'improvement',
      },
      {
        text: 'Search and filter across action names, keys, and descriptions',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.18.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.18.0',
    date: '2026-02-24',
    title: 'AI-First Positioning & Marketing Refresh',
    summary:
      'A complete refresh of all public-facing pages with AI-first messaging. The homepage now leads with AI-powered capabilities, the features page spotlights the AI Intelligence category, and pricing plans are tiered around AI access — Starter gets Smart Intake, Pro unlocks the full AI suite, and Enterprise includes unlimited AI with custom models.',
    highlights: ['AI Marketing', 'Tiered AI Plans', 'Refreshed Pages'],
    changes: [
      {
        text: 'Homepage redesigned with AI-powered hero, intelligence capability section, and updated comparison table',
        type: 'design',
      },
      {
        text: 'Features page updated with AI Intelligence as the first category, showcasing all 6 AI features',
        type: 'design',
      },
      {
        text: 'Pricing plans restructured around AI access tiers — Starter, Pro, and Enterprise',
        type: 'improvement',
      },
      {
        text: 'Settings/Subscription page updated with AI features in plan comparison cards',
        type: 'improvement',
      },
      {
        text: 'AI-focused FAQ entries added to pricing page',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.17.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.17.0',
    date: '2026-02-24',
    title: 'Feature Flags & Admin Controls',
    summary:
      'A full feature flag management system for Super Admins. Control which features are enabled per-tenant or per-user with a real-time admin UI. Ships with 23 pre-configured flags across 6 categories. Super Admins bypass all flags and always see everything. Also adds tenant and role assignment in the Master Admin panel.',
    highlights: ['Feature Flags', '23 Flags', 'Per-Tenant Overrides', 'Admin Assignments'],
    changes: [
      {
        text: 'Feature Flag admin page with per-tenant and per-user override management',
        type: 'feature',
      },
      {
        text: '23 pre-seeded flags across 6 categories: AI, Packages, Operations, Compliance, Business, Platform',
        type: 'feature',
      },
      {
        text: 'FeatureFlagProvider context for client-side flag evaluation across the entire app',
        type: 'feature',
      },
      {
        text: "Sidebar navigation dynamically respects feature flags — hidden features don't show links",
        type: 'improvement',
      },
      {
        text: 'Super Admin bypasses all flags and always sees every feature',
        type: 'improvement',
      },
      {
        text: "Master Admin tenant & role assignment — change any user's role and tenant from the admin panel",
        type: 'feature',
      },
      {
        text: 'Tenant selector with user counts and unassigned option in assignment modal',
        type: 'improvement',
      },
    ],
  },
  /* ------------------------------------------------------------------ */
  /*  v0.16.0                                                            */
  /* ------------------------------------------------------------------ */
  {
    version: '0.16.0',
    date: '2026-02-24',
    title: 'AI Everywhere — 5 New AI Features',
    summary:
      'The biggest ShipOS update ever: five new AI-powered features that transform every aspect of store operations. Scan IDs to onboard customers in 30 seconds, sort entire mail batches with a single photo, catch carrier overcharges automatically, get a personalized AI morning briefing, and control ShipOS hands-free with voice commands.',
    highlights: ['AI ID Scan', 'AI Mail Sort', 'AI Bill Audit', 'Morning Briefing', 'Voice AI', '5 New Features'],
    changes: [
      {
        text: 'AI Customer Onboarding: photograph a driver\'s license or passport, and GPT-4o Vision extracts all fields to create a customer profile in 30 seconds',
        type: 'feature',
      },
      {
        text: 'AI Morning Briefing: personalized AI-generated daily briefing card on the dashboard with store status, action items, and predictions',
        type: 'feature',
      },
      {
        text: 'AI Carrier Bill Auditor: upload a UPS/FedEx invoice and AI cross-references against shipment records to find overcharges, duplicates, and invalid surcharges',
        type: 'feature',
      },
      {
        text: 'AI Mail Sorting: photograph a spread of mail pieces and AI reads addresses, extracts PMB numbers, and auto-routes to customer mailboxes with notifications',
        type: 'feature',
      },
      {
        text: 'Voice AI Assistant: floating microphone button on every page — say "Check in UPS package for PMB 142" and it happens. Supports check-ins, queries, reminders, and more',
        type: 'feature',
      },
      {
        text: 'New dashboard tiles for all AI features with consistent violet/purple AI branding and badges',
        type: 'improvement',
      },
      {
        text: 'Sidebar navigation updated with quick links to AI Onboard, AI Mail Sort, and AI Bill Audit',
        type: 'improvement',
      },
      {
        text: 'Command palette now includes all new AI features for instant keyboard access',
        type: 'improvement',
      },
      {
        text: 'All AI features include demo mode with realistic sample data when no OpenAI API key is configured',
        type: 'improvement',
      },
    ],
  },
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
