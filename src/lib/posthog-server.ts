/**
 * Server-side PostHog client for use in API routes, server components,
 * and server actions.
 *
 * Usage:
 *   import { getPostHogServer } from '@/lib/posthog-server';
 *   const ph = getPostHogServer();
 *   ph.capture({ distinctId: user.id, event: 'package_checked_in', properties: { ... } });
 *   await ph.shutdown(); // flush before response ends (or use `await ph.flushAsync()`)
 */

import { PostHog } from 'posthog-node';

let serverClient: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!serverClient) {
    serverClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,       // flush immediately in serverless
      flushInterval: 0, // don't batch — serverless can freeze between invocations
    });
  }
  return serverClient;
}

/**
 * Evaluate a boolean feature flag server-side.
 *
 * @param flag  - flag key as defined in PostHog
 * @param distinctId - unique user identifier (e.g. user.id or auth0Id)
 * @param properties - optional person / group properties for targeting
 */
export async function getFeatureFlag(
  flag: string,
  distinctId: string,
  properties?: Record<string, string>,
): Promise<boolean> {
  const ph = getPostHogServer();
  const value = await ph.isFeatureEnabled(flag, distinctId, {
    personProperties: properties,
  });
  return value ?? false;
}

/**
 * Get a feature flag payload (for multi-variate flags).
 */
export async function getFeatureFlagPayload(
  flag: string,
  distinctId: string,
  properties?: Record<string, string>,
): Promise<unknown> {
  const ph = getPostHogServer();
  return ph.getFeatureFlagPayload(flag, distinctId, undefined, {
    personProperties: properties,
  });
}
