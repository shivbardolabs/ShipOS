/**
 * PostHog client-side configuration.
 *
 * The project key and host are read from public env vars so they're available
 * in both server and client bundles.  Session replay and autocapture are
 * enabled by default — disable selectively via feature flags or PostHog UI.
 */

import posthog from 'posthog-js';

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Initialise PostHog in the browser.  Safe to call multiple times — subsequent
 * calls are no-ops once the library has booted.
 */
export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) return;
  if (posthog.__loaded) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    /* --- Session Replay -------------------------------------------------- */
    session_recording: {
      maskAllInputs: false,          // set true if PII in forms is a concern
      maskTextSelector: '[data-ph-mask]', // opt-in masking via data attribute
    },
    /* --- Autocapture ----------------------------------------------------- */
    autocapture: true,
    capture_pageview: false,         // we fire pageviews manually in the provider
    capture_pageleave: true,
    /* --- Performance ----------------------------------------------------- */
    loaded: (ph) => {
      // In development, enable debug logging
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });
}

export default posthog;
