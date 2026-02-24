/**
 * Feature-flag helpers for ShipOS.
 *
 * ── Client-side (React components) ─────────────────────────────────────────
 *
 *   // Preferred: context-based (evaluates from DB, respects overrides)
 *   import { useFlags } from '@/components/feature-flag-provider';
 *   const { isEnabled } = useFlags();
 *   if (isEnabled('ai-smart-intake')) { ... }
 *
 *   // PostHog direct (for A/B testing & experiments)
 *   import { useFeatureFlag } from '@/lib/feature-flags';
 *   const showNewUI = useFeatureFlag('experiment-new-ui');
 *
 * ── Server-side (API routes, server components) ────────────────────────────
 *
 *   import { getFeatureFlag } from '@/lib/posthog-server';
 *   const enabled = await getFeatureFlag('experiment-new-ui', user.id);
 *
 * ── Flag keys ──────────────────────────────────────────────────────────────
 *
 * All feature flag keys are defined in `FLAGS` below and in
 * `src/lib/feature-flag-definitions.ts` (for the DB-backed system).
 */

'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback, useSyncExternalStore } from 'react';

/* -------------------------------------------------------------------------- */
/*  Flag key registry — add new flags here                                    */
/* -------------------------------------------------------------------------- */

/**
 * Central registry of all feature-flag keys used in the app.
 * These map to flags in the DB (managed via Super Admin → Feature Flags).
 *
 * When adding a new feature, also add the definition to
 * `src/lib/feature-flag-definitions.ts` so it gets auto-seeded.
 */
export const FLAGS = {
  // AI Features
  aiSmartIntake: 'ai-smart-intake',
  aiCustomerOnboarding: 'ai-customer-onboarding',
  aiMailSort: 'ai-mail-sort',
  aiBillAudit: 'ai-bill-audit',
  aiVoiceAssistant: 'ai-voice-assistant',
  aiMorningBriefing: 'ai-morning-briefing',

  // Package Management
  packageManagement: 'package-management',
  packageCheckIn: 'package-check-in',
  packageCheckOut: 'package-check-out',

  // Operations
  customerManagement: 'customer-management',
  mailManagement: 'mail-management',
  shipping: 'shipping',
  reconciliation: 'reconciliation',
  endOfDay: 'end-of-day',

  // Compliance
  cmraCompliance: 'cmra-compliance',
  notifications: 'notifications',

  // Business
  loyaltyProgram: 'loyalty-program',
  invoicing: 'invoicing',
  reports: 'reports',
  activityLog: 'activity-log',
  kioskMode: 'kiosk-mode',

  // Platform
  dataMigration: 'data-migration',
  tenantSettings: 'tenant-settings',
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

/* -------------------------------------------------------------------------- */
/*  PostHog direct hook (for experiments / A/B tests)                         */
/* -------------------------------------------------------------------------- */

/**
 * React hook that reactively returns whether a PostHog feature flag is enabled.
 *
 * For DB-backed feature flags (managed in admin panel), use:
 *   import { useFlags } from '@/components/feature-flag-provider';
 *
 * This hook is for PostHog-native flags (experiments, A/B tests).
 */
export function useFeatureFlag(flag: string): boolean {
  const posthog = usePostHog();

  const subscribe = useCallback(
    (callback: () => void) => {
      return posthog.onFeatureFlags(callback);
    },
    [posthog],
  );

  const getSnapshot = useCallback(() => {
    return posthog.isFeatureEnabled(flag) ?? false;
  }, [posthog, flag]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * React hook that returns a feature-flag payload (for multi-variate flags).
 */
export function useFeatureFlagPayload<T = unknown>(flag: string): T | undefined {
  const posthog = usePostHog();

  const subscribe = useCallback(
    (callback: () => void) => {
      return posthog.onFeatureFlags(callback);
    },
    [posthog],
  );

  const getSnapshot = useCallback(() => {
    return posthog.getFeatureFlagPayload(flag) as T | undefined;
  }, [posthog, flag]);

  const getServerSnapshot = useCallback(() => undefined as T | undefined, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
