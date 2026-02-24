'use client';

/**
 * PostHog analytics & session-replay provider.
 *
 * Wraps the app in a PostHogProvider that:
 *   1. Initialises posthog-js on mount
 *   2. Identifies the logged-in user (from Auth0 / TenantProvider)
 *   3. Fires pageview events on route changes
 */

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useTenant } from '@/components/tenant-provider';
import posthog, { initPostHog, POSTHOG_KEY } from '@/lib/posthog';

/* -------------------------------------------------------------------------- */
/*  Pageview tracker — fires on every route change                            */
/* -------------------------------------------------------------------------- */
function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    const url = searchParams?.size
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    ph.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  User identifier — links PostHog user to Auth0 / local user               */
/* -------------------------------------------------------------------------- */
function PostHogIdentify() {
  const { user: auth0User } = useUser();
  const { localUser } = useTenant();
  const ph = usePostHog();
  const identified = useRef(false);

  useEffect(() => {
    if (!ph || identified.current) return;
    if (!auth0User?.sub) return;

    // Use local user ID if available, otherwise Auth0 sub
    const distinctId = localUser?.id ?? auth0User.sub;

    ph.identify(distinctId, {
      email: auth0User.email ?? undefined,
      name: auth0User.name ?? undefined,
      // ShipOS-specific properties for flag targeting & analytics
      role: localUser?.role,
      tenantId: localUser?.tenantId ?? undefined,
      tenantName: localUser?.tenant?.name ?? undefined,
    });

    identified.current = true;
  }, [ph, auth0User, localUser]);

  // Reset identification on logout
  useEffect(() => {
    if (!ph) return;
    if (!auth0User && identified.current) {
      ph.reset();
      identified.current = false;
    }
  }, [ph, auth0User]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */
export function PostHogAnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  // If key is missing (e.g. local dev without env), render children without PostHog
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageview />
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
