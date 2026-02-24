/**
 * Central registry of all ShipOS feature flags.
 *
 * When adding a new feature, add an entry here. It will be auto-seeded
 * into the database on the next API call (defaultEnabled: false).
 */

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  category: 'ai' | 'packages' | 'operations' | 'compliance' | 'business' | 'platform';
  /** Existing features default to true; new features default to false. */
  defaultEnabled: boolean;
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  // ── AI Features ──────────────────────────────────────────────────────────
  {
    key: 'ai-smart-intake',
    name: 'AI Smart Intake',
    description: 'AI-powered package intake with automatic carrier detection and form auto-fill',
    category: 'ai',
    defaultEnabled: true,
  },
  {
    key: 'ai-customer-onboarding',
    name: 'AI Customer Onboarding',
    description: 'AI ID scan for customer onboarding with document verification and data extraction',
    category: 'ai',
    defaultEnabled: true,
  },
  {
    key: 'ai-mail-sort',
    name: 'AI Mail Sort',
    description: 'AI-powered mail sorting, categorization, and routing recommendations',
    category: 'ai',
    defaultEnabled: true,
  },
  {
    key: 'ai-bill-audit',
    name: 'AI Bill Audit',
    description: 'AI-powered carrier bill reconciliation and overcharge detection',
    category: 'ai',
    defaultEnabled: true,
  },
  {
    key: 'ai-voice-assistant',
    name: 'AI Voice Assistant',
    description: 'Voice command interface for hands-free package and mail operations',
    category: 'ai',
    defaultEnabled: true,
  },
  {
    key: 'ai-morning-briefing',
    name: 'AI Morning Briefing',
    description: 'AI-generated daily operational briefing displayed on the dashboard',
    category: 'ai',
    defaultEnabled: true,
  },

  // ── Package Management ───────────────────────────────────────────────────
  {
    key: 'package-management',
    name: 'Package Management',
    description: 'Core package tracking, search, and status management',
    category: 'packages',
    defaultEnabled: true,
  },
  {
    key: 'package-check-in',
    name: 'Package Check-In',
    description: 'Package receiving workflow with carrier detection and customer assignment',
    category: 'packages',
    defaultEnabled: true,
  },
  {
    key: 'package-check-out',
    name: 'Package Check-Out',
    description: 'Package release and checkout workflow with signature capture',
    category: 'packages',
    defaultEnabled: true,
  },

  // ── Operations ───────────────────────────────────────────────────────────
  {
    key: 'customer-management',
    name: 'Customer Management',
    description: 'Customer directory, profiles, PMB assignment, and compliance tracking',
    category: 'operations',
    defaultEnabled: true,
  },
  {
    key: 'mail-management',
    name: 'Mail Management',
    description: 'Mail piece receiving, scanning, forwarding, and action management',
    category: 'operations',
    defaultEnabled: true,
  },
  {
    key: 'shipping',
    name: 'Shipping',
    description: 'Outbound shipping, label creation, and carrier rate management',
    category: 'operations',
    defaultEnabled: true,
  },
  {
    key: 'reconciliation',
    name: 'Reconciliation',
    description: 'Carrier bill reconciliation and cost verification',
    category: 'operations',
    defaultEnabled: true,
  },
  {
    key: 'end-of-day',
    name: 'End of Day',
    description: 'Daily closing procedures, carrier manifests, and pickup scheduling',
    category: 'operations',
    defaultEnabled: true,
  },

  // ── Compliance ───────────────────────────────────────────────────────────
  {
    key: 'cmra-compliance',
    name: 'CMRA Compliance',
    description: 'USPS CMRA compliance tracking, Form 1583 management, and ID verification',
    category: 'compliance',
    defaultEnabled: true,
  },
  {
    key: 'notifications',
    name: 'Notifications',
    description: 'Customer notification management via email and SMS',
    category: 'compliance',
    defaultEnabled: true,
  },

  // ── Business ─────────────────────────────────────────────────────────────
  {
    key: 'loyalty-program',
    name: 'Loyalty Program',
    description: 'Customer loyalty program with points, tiers, and rewards',
    category: 'business',
    defaultEnabled: true,
  },
  {
    key: 'invoicing',
    name: 'Invoicing',
    description: 'Invoice generation, tracking, and payment management',
    category: 'business',
    defaultEnabled: true,
  },
  {
    key: 'reports',
    name: 'Reports & Analytics',
    description: 'Business reports, revenue analytics, and operational dashboards',
    category: 'business',
    defaultEnabled: true,
  },
  {
    key: 'activity-log',
    name: 'Activity Log',
    description: 'System-wide activity and audit trail logging',
    category: 'business',
    defaultEnabled: true,
  },
  {
    key: 'kiosk-mode',
    name: 'Kiosk Mode',
    description: 'Self-service kiosk for customer package pickup and check-in',
    category: 'business',
    defaultEnabled: true,
  },

  // ── Platform ─────────────────────────────────────────────────────────────
  {
    key: 'data-migration',
    name: 'Data Migration',
    description: 'PostalMate and legacy system data import and migration tools',
    category: 'platform',
    defaultEnabled: true,
  },
  {
    key: 'tenant-settings',
    name: 'Tenant Settings',
    description: 'Tenant-level configuration, branding, and business hours management',
    category: 'platform',
    defaultEnabled: true,
  },
  {
    key: 'action-pricing',
    name: 'Action Pricing',
    description: 'Tenant pricing dashboard for all mailbox actions with COGS tracking, segment overrides, and customer-level overrides',
    category: 'business',
    defaultEnabled: true,
  },

  // ── Requirements Gaps — Batch 1 ──────────────────────────────────────────
  {
    key: 'legal-pages',
    name: 'Legal Pages & Agreement Gate',
    description: 'Terms of Service, Privacy Policy pages, and first-login agreement gate requiring user consent',
    category: 'compliance',
    defaultEnabled: true,
  },
  {
    key: 'tenant-lifecycle',
    name: 'Tenant Lifecycle Management',
    description: 'Tenant status badges, activate/pause/disable toggles, and suspended tenant blocking in admin panel',
    category: 'platform',
    defaultEnabled: true,
  },
  {
    key: 'user-status',
    name: 'User Status & Soft Delete',
    description: 'User status badges, activate/deactivate toggles, and soft delete with login blocking for inactive users',
    category: 'platform',
    defaultEnabled: true,
  },
  {
    key: 'rbac',
    name: 'RBAC Permissions',
    description: 'Role-based access control with granular permission matrix and server-side API route guards',
    category: 'platform',
    defaultEnabled: true,
  },
  {
    key: 'package-storage-location',
    name: 'Package Storage Location',
    description: 'Storage location tracking during check-in, display on package cards, and location filter on packages list',
    category: 'packages',
    defaultEnabled: true,
  },
  {
    key: 'audit-log-diff',
    name: 'Audit Log Before/After',
    description: 'Captures old/new data snapshots on updates with expandable diff view in the Activity Log page',
    category: 'business',
    defaultEnabled: true,
  },
  {
    key: 'checkout-signature',
    name: 'Checkout Signature Capture',
    description: 'Integrated signature pad in package check-out flow with signature storage and history display',
    category: 'packages',
    defaultEnabled: true,
  // ── Batch 2 Features (Requirements Gaps) ─────────────────────────────────
  {
    key: 'stripe_payments',
    name: 'Stripe Payments',
    description: 'Stripe payment integration for subscription billing, checkout, and customer portal',
    category: 'business',
    defaultEnabled: false,
  },
  {
    key: 'subscription_billing',
    name: 'Subscription Billing',
    description: 'Plan-based subscription billing engine with Starter, Pro, and Enterprise tiers',
    category: 'business',
    defaultEnabled: false,
  },
  {
    key: 'multi_store',
    name: 'Multi-Store Support',
    description: 'Multiple store locations per tenant with store selector and per-store assignment',
    category: 'platform',
    defaultEnabled: false,
  },
  {
    key: 'auth_security',
    name: 'Auth Security Enhancements',
    description: 'Session timeout warnings, MFA enrollment status, login attempt tracking, and security settings page',
    category: 'platform',
    defaultEnabled: false,
  },
  {
    key: 'field_encryption',
    name: 'Field-Level Encryption',
    description: 'AES-256-GCM encryption for PII at rest — SSN, home address, and ID numbers',
    category: 'compliance',
    defaultEnabled: false,
  },
  {
    key: 'enhanced_checkout',
    name: 'Enhanced Checkout',
    description: 'Bulk checkout, storage fee calculation, pickup delegation, and release receipts',
    category: 'packages',
    defaultEnabled: false,
  },
  {
    key: 'advanced_reports',
    name: 'Advanced BI Reports',
    description: 'Revenue breakdown by service, customer growth charts, CSV/PDF export, and comparison periods',
    category: 'business',
    defaultEnabled: false,
  },
];

/** Category display metadata */
export const CATEGORY_META: Record<string, { label: string; description: string; order: number }> = {
  ai:         { label: 'AI Features',         description: 'AI-powered automation and intelligence', order: 0 },
  packages:   { label: 'Package Management',  description: 'Package receiving, tracking, and release', order: 1 },
  operations: { label: 'Operations',          description: 'Day-to-day business operations', order: 2 },
  compliance: { label: 'Compliance',          description: 'Regulatory compliance and notifications', order: 3 },
  business:   { label: 'Business',            description: 'Revenue, analytics, and loyalty', order: 4 },
  platform:   { label: 'Platform',            description: 'Infrastructure and platform tools', order: 5 },
};
