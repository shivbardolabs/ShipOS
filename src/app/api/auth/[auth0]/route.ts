import { initAuth0 } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

/* ── Platform Console hosts ─────────────────────────────────────────────── */
const PLATFORM_HOSTS = ['platform.shipospro.com'];

/**
 * Dynamically resolve the Auth0 base URL from the incoming request so that
 * the redirect_uri matches the domain the user is actually visiting
 * (e.g. app.shipospro.com vs platform.shipospro.com).
 *
 * We use `initAuth0({ baseURL })` instead of the global singleton because
 * the SDK's global instance reads AUTH0_BASE_URL once at init time and uses
 * it for all redirect_uri / callback validation — ignoring any dynamic
 * override in authorizationParams. Creating a per-request instance with the
 * correct baseURL ensures the full auth flow (login → callback → returnTo)
 * stays on the correct subdomain.
 */
function getBaseURL(req: NextRequest): string {
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
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

/**
 * Dynamic Auth0 route handler — creates a per-request Auth0 instance with
 * baseURL derived from the request host. This ensures callbacks, logout
 * redirects, and returnTo URLs all resolve to the correct subdomain.
 */
export const GET = (req: NextRequest, ctx: { params: Promise<{ auth0: string }> }) => {
  const baseURL = getBaseURL(req);
  const returnTo = getReturnTo(req);
  const { handleAuth, handleLogin } = initAuth0({ baseURL });

  return handleAuth({
    login: (loginReq: NextRequest) => {
      return handleLogin(loginReq, { returnTo });
    },
    signup: (signupReq: NextRequest) => {
      return handleLogin(signupReq, {
        authorizationParams: { screen_hint: 'signup' },
        returnTo,
      });
    },
  })(req, ctx);
};
