/**
 * Shared test helpers for API integration tests.
 *
 * Provides mock factories for Prisma, Auth, and request builders
 * so each test suite can focus on its business logic assertions.
 */

import type { LocalUser } from '../../../src/lib/auth';

/* ── Mock User Factory ─────────────────────────────────────────────────────── */

export function createMockUser(overrides: Partial<LocalUser> = {}): LocalUser {
  return {
    id: 'test-user-1',
    auth0Id: 'auth0|test123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    status: 'active',
    avatar: null,
    tenantId: 'tenant-1',
    lastLoginAt: null,
    loginCount: 1,
    agreedToTermsAt: null,
    termsVersionAccepted: null,
    privacyVersionAccepted: null,
    tenant: {
      id: 'tenant-1',
      name: 'Test Mail Store',
      slug: 'test-mail-store',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      phone: '555-0100',
      email: 'store@example.com',
      timezone: 'America/New_York',
      businessHours: null,
      taxRate: 0,
      logoUrl: null,
      status: 'active',
      subscriptionTier: 'pro',
    },
    ...overrides,
  };
}

/* ── Mock Prisma Factory ───────────────────────────────────────────────────── */

export interface MockPrismaClient {
  customer: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  package: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
  };
  store: {
    findFirst: jest.Mock;
  };
  user: {
    findFirst: jest.Mock;
  };
  billingPlan: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  subscription: {
    updateMany: jest.Mock;
    create: jest.Mock;
  };
  invoice: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
}

export function createMockPrisma(): MockPrismaClient {
  return {
    customer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    package: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    store: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    billingPlan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

/* ── Request Builder ───────────────────────────────────────────────────────── */

/**
 * Build a NextRequest-compatible Request for testing route handlers.
 * Uses the global Request constructor (available in Node 18+).
 */
export function buildRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    searchParams?: Record<string, string>;
  } = {},
): Request {
  const url = new URL(path, 'http://localhost:3000');
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit = {
    method: options.method || 'GET',
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  return new Request(url.toString(), init);
}

/**
 * Build the routeContext object expected by withApiHandler.
 */
export function buildRouteContext(params: Record<string, string> = {}): {
  params: Promise<Record<string, string>>;
} {
  return { params: Promise.resolve(params) };
}

/* ── Response Helpers ──────────────────────────────────────────────────────── */

export async function parseJsonResponse(
  response: Response,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const status = response.status;
  const body = (await response.json()) as Record<string, unknown>;
  return { status, body };
}
