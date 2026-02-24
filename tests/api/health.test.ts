/**
 * BAR-210: API Integration Tests
 *
 * Tests API endpoints for correct status codes, response shapes, and auth guards.
 * Run with: npx jest tests/api/ or via the test:api npm script.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('API Health & Auth Guards', () => {
  // ── Unauthenticated requests should return 401 ────────────────────────
  const protectedEndpoints = [
    '/api/users/me',
    '/api/tenant',
    '/api/admin/tenants',
    '/api/admin/users',
    '/api/admin/feature-flags',
    '/api/feature-flags',
    '/api/notifications',
    '/api/reports/export',
    '/api/renewals',
    '/api/stores',
    '/api/billing/plans',
    '/api/settings/branding',
    '/api/settings/printer',
    '/api/security/sessions',
  ];

  test.each(protectedEndpoints)(
    'GET %s returns 401 without auth',
    async (endpoint) => {
      const res = await fetch(`${BASE_URL}${endpoint}`);
      expect([401, 403]).toContain(res.status);
    },
  );

  // ── POST endpoints should reject unauthenticated ─────────────────────
  const protectedPosts = [
    '/api/users/invite',
    '/api/packages/bulk-checkout',
    '/api/packages/smart-intake',
    '/api/customers/provision',
    '/api/billing/subscribe',
    '/api/stripe/checkout',
    '/api/demo/seed',
  ];

  test.each(protectedPosts)(
    'POST %s returns 401 without auth',
    async (endpoint) => {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect([401, 403]).toContain(res.status);
    },
  );

  // ── Auth0 callback route should exist ─────────────────────────────────
  test('Auth0 route exists', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, { redirect: 'manual' });
    // Should redirect to Auth0
    expect([302, 307, 200]).toContain(res.status);
  });
});

describe('API Response Shapes', () => {
  // Only run these with auth
  const authHeaders = process.env.AUTH_COOKIE
    ? { Cookie: `appSession=${process.env.AUTH_COOKIE}` }
    : undefined;

  const skipIfNoAuth = !authHeaders;

  test('GET /api/feature-flags returns array', async () => {
    if (skipIfNoAuth) return;
    const res = await fetch(`${BASE_URL}/api/feature-flags`, { headers: authHeaders });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data) || data.flags).toBeTruthy();
  });

  test('GET /api/users/me returns user object', async () => {
    if (skipIfNoAuth) return;
    const res = await fetch(`${BASE_URL}/api/users/me`, { headers: authHeaders });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email || data.user?.email).toBeTruthy();
  });
});
