import { handleAuth, handleLogin, handleCallback } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

/* ── Platform Console hosts ─────────────────────────────────────────────── */
const PLATFORM_HOSTS = ['platform.shipospro.com'];

/**
 * Dynamically resolve the Auth0 base URL from the incoming request so that
 * the redirect_uri matches the domain the user is actually visiting
 * (e.g. app.shipospro.com vs platform.shipospro.com).
 *
 * IMPORTANT: We MUST use named exports (handleAuth, handleLogin, etc.) and
 * NOT `initAuth0`, because the rest of the codebase uses named `getSession`
 * imports. The Auth0 SDK throws if you mix `initAuth0` with named exports.
 *
 * Instead, we override both the login and callback handlers to pass the
 * dynamic redirect_uri / redirectUri derived from the request host header.
 * This ensures the redirect_uri is consistent between:
 *   1. The authorization request to Auth0 (login handler)
 *   2. The token exchange with Auth0 (callback handler)
 */
function getBaseURL(req: NextRequest): string {
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  // Fallback to env var
  return process.env.AUTH0_BASE_URL || 'https://shipospro.com';
}

/**
 * Determine where to redirect after login based on the host.
 * Platform domain → super-admin dashboard
 * Everything else → client dashboard
 */
function getReturnTo(req: NextRequest): string {
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0];
  if (PLATFORM_HOSTS.includes(hostname)) return '/dashboard/super-admin';
  return '/dashboard';
}

export const GET = handleAuth({
  login: (req: NextRequest) => {
    const baseURL = getBaseURL(req);
    const returnTo = getReturnTo(req);
    return handleLogin(req, {
      authorizationParams: {
        redirect_uri: `${baseURL}/api/auth/callback`,
      },
      returnTo,
    });
  },
  signup: (req: NextRequest) => {
    const baseURL = getBaseURL(req);
    const returnTo = getReturnTo(req);
    return handleLogin(req, {
      authorizationParams: {
        screen_hint: 'signup',
        redirect_uri: `${baseURL}/api/auth/callback`,
      },
      returnTo,
    });
  },
  callback: (req: NextRequest) => {
    const baseURL = getBaseURL(req);
    return handleCallback(req, {
      redirectUri: `${baseURL}/api/auth/callback`,
    });
  },
});
