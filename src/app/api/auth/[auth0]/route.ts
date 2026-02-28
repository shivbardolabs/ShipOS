// @ts-nocheck
import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

/**
 * Dynamically resolve the Auth0 base URL from the incoming request so that
 * the redirect_uri matches the domain the user is actually visiting
 * (e.g. app.shipospro.com vs shipospro.com).
 */
function getBaseURL(req: NextRequest): string {
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  // Fallback to env var
  return process.env.AUTH0_BASE_URL || 'https://shipospro.com';
}

export const GET = handleAuth({
  login: (req: NextRequest) => {
    const baseURL = getBaseURL(req);
    return handleLogin(req, {
      authorizationParams: {
        redirect_uri: `${baseURL}/api/auth/callback`,
      },
      returnTo: '/dashboard',
    });
  },
  signup: (req: NextRequest) => {
    const baseURL = getBaseURL(req);
    return handleLogin(req, {
      authorizationParams: {
        screen_hint: 'signup',
        redirect_uri: `${baseURL}/api/auth/callback`,
      },
      returnTo: '/dashboard',
    });
  },
});
