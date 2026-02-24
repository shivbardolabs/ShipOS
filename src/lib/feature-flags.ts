/**
 * Feature-flag helpers for ShipOS.
 *
 * ── Client-side (React components) ─────────────────────────────────────────
 *
 *   import { useFeatureFlag } from '@/lib/feature-flags';
 *   const showNewUI = useFeatureFlag('new-mail-ui');
 *
 * ── Server-side (API routes, server components) ────────────────────────────
 *
 *   import { getFeatureFlag } from '@/lib/posthog-server';
 *   const enabled = await getFeatureFlag('new-mail-ui', user.id);
 *
 * ── Flag keys ──────────────────────────────────────────────────────────────
 *
 * Define all flag keys in `FLAGS` below so they're discoverable and
 * type-safe.  Create matching flags in the PostHog dashboard.
 */

'use client';

import { usePostHog } from 'posthog-js/react';
import { useCallback, useSyncExternalStore } from 'react';

/* -------------------------------------------------------------------------- */
/*  Flag key registry — add new flags here                                    */
/* -------------------------------------------------------------------------- */

/**
 * Central registry of all feature-flag keys used in the app.
 * Add new flags here and reference them as `FLAGS.myNewFeature`.
 *
 * Create the matching flag in PostHog → Feature Flags with the same key.
 */
export const FLAGS = {
  // Example flags — replace with real ones as you create them
  // newMailUI: 'new-mail-ui',
  // betaCheckout: 'beta-checkout',
  // v2CustomerProfile: 'v2-customer-profile',
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

/* -------------------------------------------------------------------------- */
/*  Client-side hook                                                          */
/* -------------------------------------------------------------------------- */

/**
 * React hook that reactively returns whether a feature flag is enabled.
 *
 * Automatically updates when PostHog evaluates / re-evaluates the flag.
 *
 * @example
 * const showNewUI = useFeatureFlag('new-mail-ui');
 * if (showNewUI) return <NewMailPage />;
 * return <OldMailPage />;
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
