/**
 * Critical-Path Tests: Billing
 *
 * Tests:
 * - GET  /api/billing/plans     — list available plans
 * - POST /api/billing/subscribe — create subscription
 */

import {
  createMockUser,
  createMockPrisma,
  buildRequest,
  buildRouteContext,
  parseJsonResponse,
} from './__helpers__/setup';

/* ── Mocks ───────────────────────────────────────────────────────────────── */

const mockPrisma = createMockPrisma();
const mockGetOrProvisionUser = jest.fn();
const mockIsStripeConfigured = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/lib/auth', () => ({
  getOrProvisionUser: mockGetOrProvisionUser,
}));

jest.mock('@/lib/stripe', () => ({
  isStripeConfigured: mockIsStripeConfigured,
}));

jest.spyOn(console, 'error').mockImplementation(() => {});

import { GET as getPlans } from '../../src/app/api/billing/plans/route';
import { POST as subscribe } from '../../src/app/api/billing/subscribe/route';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const mockUser = createMockUser();

const sampleDbPlans = [
  {
    id: 'plan-1',
    slug: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    priceYearly: 490,
    maxMailboxes: 100,
    maxUsers: 3,
    maxStores: 1,
    features: JSON.stringify(['Up to 100 mailboxes', 'Package check-in & check-out']),
    stripePriceId: null,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'plan-2',
    slug: 'pro',
    name: 'Pro',
    priceMonthly: 99,
    priceYearly: 990,
    maxMailboxes: 500,
    maxUsers: 10,
    maxStores: 3,
    features: JSON.stringify(['Up to 500 mailboxes', 'AI Smart Intake']),
    stripePriceId: null,
    isActive: true,
    sortOrder: 1,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  GET /api/billing/plans                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('GET /api/billing/plans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
  });

  test('returns 401 when not authenticated', async () => {
    mockGetOrProvisionUser.mockResolvedValue(null);

    const res = await getPlans(
      buildRequest('/api/billing/plans') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  test('returns plans from database when available', async () => {
    mockPrisma.billingPlan.findMany.mockResolvedValue(sampleDbPlans);

    const res = await getPlans(
      buildRequest('/api/billing/plans') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);

    const plans = body.plans as Array<Record<string, unknown>>;
    expect(plans).toHaveLength(2);
    expect(plans[0].slug).toBe('starter');
    expect(plans[0].priceMonthly).toBe(49);
    expect(plans[1].slug).toBe('pro');
    expect(plans[1].priceMonthly).toBe(99);

    // Features should be parsed from JSON
    expect(Array.isArray(plans[0].features)).toBe(true);
  });

  test('returns fallback PLAN_DEFINITIONS when DB is empty', async () => {
    mockPrisma.billingPlan.findMany.mockResolvedValue([]);

    const res = await getPlans(
      buildRequest('/api/billing/plans') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);

    const plans = body.plans as Array<Record<string, unknown>>;
    expect(plans.length).toBeGreaterThan(0);
    // Should have the hardcoded starter plan at minimum
    expect(plans.find((p) => p.slug === 'starter')).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  POST /api/billing/subscribe                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('POST /api/billing/subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
    mockIsStripeConfigured.mockReturnValue(false); // Default to manual billing
  });

  test('returns 401 when not authenticated', async () => {
    mockGetOrProvisionUser.mockResolvedValue(null);

    const res = await subscribe(
      buildRequest('/api/billing/subscribe', {
        method: 'POST',
        body: { planSlug: 'pro' },
      }) as never,
      buildRouteContext() as never,
    );
    const { status } = await parseJsonResponse(res);

    expect(status).toBe(401);
  });

  test('returns 403 for non-admin users', async () => {
    mockGetOrProvisionUser.mockResolvedValue(
      createMockUser({ role: 'employee' }),
    );

    const res = await subscribe(
      buildRequest('/api/billing/subscribe', {
        method: 'POST',
        body: { planSlug: 'pro' },
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(403);
    expect(body.error).toMatch(/forbidden/i);
  });

  test('returns 400 when planSlug is missing', async () => {
    const res = await subscribe(
      buildRequest('/api/billing/subscribe', {
        method: 'POST',
        body: {},
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/planSlug/i);
  });

  test('returns 400 when user has no tenantId', async () => {
    mockGetOrProvisionUser.mockResolvedValue(createMockUser({ tenantId: null }));

    const res = await subscribe(
      buildRequest('/api/billing/subscribe', {
        method: 'POST',
        body: { planSlug: 'pro' },
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/tenant/i);
  });

  test('creates manual subscription when Stripe not configured', async () => {
    const plan = {
      id: 'plan-2',
      slug: 'pro',
      name: 'Pro',
      priceMonthly: 99,
      priceYearly: 990,
      stripePriceId: null,
    };

    mockPrisma.billingPlan.findUnique.mockResolvedValue(plan);
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });

    const createdSub = {
      id: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-2',
      status: 'manual',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      plan,
    };
    mockPrisma.subscription.create.mockResolvedValue(createdSub);

    const res = await subscribe(
      buildRequest('/api/billing/subscribe', {
        method: 'POST',
        body: { planSlug: 'pro' },
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.mode).toBe('manual');

    const sub = body.subscription as Record<string, unknown>;
    expect(sub.planName).toBe('Pro');
    expect(sub.status).toBe('manual');
    expect(sub.billingCycle).toBe('monthly');

    // Verify old subscriptions were canceled
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', status: 'active' },
        data: { status: 'canceled' },
      }),
    );
  });

  test('returns 404 for unknown plan slug', async () => {
    mockPrisma.billingPlan.findUnique.mockResolvedValue(null);

    const res = await subscribe(
      buildRequest('/api/billing/subscribe', {
        method: 'POST',
        body: { planSlug: 'nonexistent-plan' },
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(404);
    expect(body.error).toMatch(/plan not found/i);
  });
});
