/**
 * Hostname-aware middleware for multi-subdomain access control.
 *
 * platform.shipospro.com  → Platform Console (super-admin only, @bardolabs.ai)
 * app.shipospro.com       → Client Dashboard (all authenticated users)
 *
 * The platform subdomain enforces:
 *  1. Auth0 authentication (via withMiddlewareAuthRequired)
 *  2. Email domain restriction — only @bardolabs.ai emails are allowed
 *  3. Route scoping — only /dashboard/super-admin/* routes are accessible
 *
 * The main domain blocks /dashboard/super-admin/* routes entirely
 * (platform console is only reachable via the platform subdomain).
 */

import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge';

/* ── Configuration ──────────────────────────────────────────────────────── */

/** Hostnames that serve the Platform Console */
const PLATFORM_HOSTS = ['platform.shipospro.com'];

/** Only emails from this domain can access the platform console */
const ALLOWED_EMAIL_DOMAIN = '@bardolabs.ai';

/* ── Helpers ────────────────────────────────────────────────────────────── */

function isPlatformHost(host: string): boolean {
  // Strip port for local development (e.g. localhost:3000)
  const hostname = host.split(':')[0];
  return PLATFORM_HOSTS.includes(hostname);
}

/* ── Auth-wrapped handler for /dashboard/* routes ───────────────────────── */

const authedMiddleware = withMiddlewareAuthRequired(
  async function platformAwareAuth(req: NextRequest) {
    const host = req.headers.get('host') || '';
    const isPlatform = isPlatformHost(host);
    const { pathname } = req.nextUrl;

    if (isPlatform) {
      // ── Platform domain: enforce @bardolabs.ai email ──
      const res = NextResponse.next();
      const session = await getSession(req, res);
      const email = (session?.user?.email || '').toLowerCase();

      if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        const url = req.nextUrl.clone();
        url.pathname = '/unauthorized';
        return NextResponse.redirect(url);
      }

      // Redirect bare /dashboard to super-admin home
      if (pathname === '/dashboard') {
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard/super-admin';
        return NextResponse.redirect(url);
      }

      // Block client dashboard routes — only super-admin allowed
      if (
        pathname.startsWith('/dashboard/') &&
        !pathname.startsWith('/dashboard/super-admin')
      ) {
        const url = req.nextUrl.clone();
        url.pathname = '/dashboard/super-admin';
        return NextResponse.redirect(url);
      }

      return res;
    }

    // ── Main domain: block super-admin routes ──
    if (pathname.startsWith('/dashboard/super-admin')) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }
);

/* ── Exported middleware ─────────────────────────────────────────────────── */

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const host = req.headers.get('host') || '';
  const isPlatform = isPlatformHost(host);
  const { pathname } = req.nextUrl;

  // Platform root → redirect to super-admin (auth handled by /dashboard matcher)
  if (isPlatform && pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard/super-admin';
    return NextResponse.redirect(url);
  }

  // Dashboard routes → auth + hostname logic
  if (pathname.startsWith('/dashboard')) {
    return authedMiddleware(req, event);
  }

  // All other routes (public pages, API, static) → pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match:
     * - / (for platform domain redirect)
     * - /dashboard/* (auth + hostname routing)
     *
     * Skip: /api/*, /_next/*, /favicon.ico, static files
     */
    '/',
    '/dashboard/:path*',
  ],
};
