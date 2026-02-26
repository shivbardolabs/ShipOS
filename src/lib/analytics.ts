/**
 * ShipOS Analytics Wrapper
 *
 * Centralised analytics layer on top of PostHog.  Every event captured
 * through these helpers automatically includes the current page context,
 * making downstream analysis simpler.
 *
 * Usage:
 *   import { trackEvent, trackPageView, trackLogin } from '@/lib/analytics';
 *   trackEvent('package_checked_in', { packageId: '123' });
 *   trackPageView('Dashboard');
 *   trackLogin(userId, email);
 */

import posthog, { POSTHOG_KEY } from '@/lib/posthog';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Derive a human-readable page name from the current pathname. */
function getCurrentPageName(): string {
  if (typeof window === 'undefined') return 'server';
  const path = window.location.pathname;
  if (path === '/dashboard' || path === '/dashboard/') return 'Dashboard';
  const segments = path.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
  return segments
    .map((s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' › ') || 'Dashboard';
}

/** Common context attached to every analytics event. */
function baseProperties(): Record<string, string> {
  return {
    page_name: getCurrentPageName(),
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Track an arbitrary named event with optional extra properties.
 * A `page_name` context property is always included.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.capture(name, {
    ...baseProperties(),
    ...properties,
  });
}

/**
 * Track a page view.  Called automatically on route changes by the
 * PostHogProvider, but can also be invoked manually for virtual pages
 * (modals, tabs, wizards, etc.).
 */
export function trackPageView(pageName?: string): void {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  const page = pageName ?? getCurrentPageName();
  posthog.capture('$pageview', {
    ...baseProperties(),
    page_name: page,
    $current_url: window.location.href,
  });
}

/**
 * Track a user login.  Should be called once per authentication, not on
 * every page load — the PostHog identify call handles subsequent visits.
 */
export function trackLogin(userId: string, email?: string): void {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.capture('user_logged_in', {
    ...baseProperties(),
    user_id: userId,
    email: email ?? undefined,
  });
}

/**
 * Track a user action within a specific feature area.
 * Convenience wrapper that prefixes the event with the feature name.
 */
export function trackFeatureAction(
  feature: string,
  action: string,
  properties?: Record<string, unknown>,
): void {
  trackEvent(`${feature}_${action}`, properties);
}

/* -------------------------------------------------------------------------- */
/*  Tracked event catalogue — used by the admin analytics page               */
/* -------------------------------------------------------------------------- */

export interface TrackedEventDefinition {
  name: string;
  description: string;
  category: 'navigation' | 'auth' | 'packages' | 'customers' | 'operations' | 'admin';
}

export const TRACKED_EVENTS: TrackedEventDefinition[] = [
  { name: '$pageview', description: 'Fired on every route change', category: 'navigation' },
  { name: 'user_logged_in', description: 'Fired once per authentication', category: 'auth' },
  { name: 'package_checked_in', description: 'Package received via check-in flow', category: 'packages' },
  { name: 'package_checked_out', description: 'Package released via check-out flow', category: 'packages' },
  { name: 'customer_created', description: 'New customer created', category: 'customers' },
  { name: 'shipment_created', description: 'New outbound shipment created', category: 'operations' },
  { name: 'mail_scanned', description: 'Mail piece scanned / sorted', category: 'operations' },
  { name: 'feature_flag_toggled', description: 'Admin toggled a feature flag', category: 'admin' },
  { name: 'settings_updated', description: 'Tenant settings updated', category: 'admin' },
];
