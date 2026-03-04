/**
 * Critical-Path Tests: Package Check-In
 *
 * Tests POST /api/packages/check-in for:
 * - Auth guard (401 without session)
 * - Input validation (missing carrier, packageType, customerId)
 * - Successful package creation
 * - Duplicate tracking number detection (409)
 * - Duplicate override flow
 * - Walk-in customer flow
 */

import {
  createMockUser,
  createMockPrisma,
  buildRequest,
  buildRouteContext,
  parseJsonResponse,
  type MockPrismaClient,
} from './__helpers__/setup';

/* ── Mocks (hoisted before imports) ──────────────────────────────────────── */

const mockPrisma = createMockPrisma();
const mockGetOrProvisionUser = jest.fn();
const mockOnPackageCheckIn = jest.fn();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/lib/auth', () => ({
  getOrProvisionUser: mockGetOrProvisionUser,
}));

jest.mock('@/lib/charge-event-service', () => ({
  onPackageCheckIn: mockOnPackageCheckIn,
}));

// Suppress console.error in tests
jest.spyOn(console, 'error').mockImplementation(() => {});

import { POST } from '../../src/app/api/packages/check-in/route';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const mockUser = createMockUser();

function checkinRequest(body: Record<string, unknown>): Request {
  return buildRequest('/api/packages/check-in', { method: 'POST', body });
}

const validBody = {
  customerId: 'cust-1',
  trackingNumber: '1Z999AA10123456784',
  carrier: 'ups',
  packageType: 'medium',
};

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('POST /api/packages/check-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is authenticated
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
    // Default: store lookup
    mockPrisma.store.findFirst.mockResolvedValue({ id: 'store-1' });
    // Default: audit log succeeds
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    // Default: charge event succeeds
    mockOnPackageCheckIn.mockResolvedValue({ chargeEventId: 'ce-1', totalCharge: 3.0 });
    // Mock global fetch for notification calls
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Auth Guard ──────────────────────────────────────────────────────────

  test('returns 401 when user is not authenticated', async () => {
    mockGetOrProvisionUser.mockResolvedValue(null);

    const res = await POST(
      checkinRequest(validBody) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  // ── Validation ──────────────────────────────────────────────────────────

  test('returns 400 when carrier is missing', async () => {
    const res = await POST(
      checkinRequest({ customerId: 'cust-1', packageType: 'medium' }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/carrier/i);
  });

  test('returns 400 when packageType is missing', async () => {
    const res = await POST(
      checkinRequest({ customerId: 'cust-1', carrier: 'ups' }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/packageType/i);
  });

  test('returns 400 when customerId is missing for non-walk-in', async () => {
    const res = await POST(
      checkinRequest({ carrier: 'ups', packageType: 'medium' }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/customerId/i);
  });

  // ── Customer Lookup ─────────────────────────────────────────────────────

  test('returns 404 when customer not found or inactive', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);

    const res = await POST(
      checkinRequest(validBody) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(404);
    expect(body.error).toMatch(/customer not found/i);
  });

  // ── Duplicate Detection ─────────────────────────────────────────────────

  test('returns 409 on duplicate tracking number', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
    });

    // Existing package with same tracking
    mockPrisma.package.findFirst.mockResolvedValue({
      id: 'pkg-existing',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'ups',
      status: 'checked_in',
      checkedInAt: new Date('2026-03-01'),
      customer: { firstName: 'Jane', lastName: 'Doe', pmbNumber: 'PMB-100' },
    });

    const res = await POST(
      checkinRequest(validBody) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(409);
    expect(body.error).toBe('Duplicate tracking number');
    expect(body.code).toBe('DUPLICATE_TRACKING');
    expect(body.existingPackage).toBeDefined();
  });

  test('allows duplicate when duplicateOverride is true', async () => {
    const mockCustomer = {
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
      email: null,
      phone: null,
      notifyEmail: false,
      notifySms: false,
    };

    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
    // Duplicate exists but we're overriding
    mockPrisma.package.findFirst.mockResolvedValue({
      id: 'pkg-existing',
      trackingNumber: '1Z999AA10123456784',
    });

    const now = new Date();
    mockPrisma.package.create.mockResolvedValue({
      id: 'pkg-new',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'ups',
      senderName: null,
      packageType: 'medium',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageLocation: null,
      checkedInAt: now,
      lengthIn: null,
      widthIn: null,
      heightIn: null,
      weightLbs: null,
      dimensionSource: null,
      customer: mockCustomer,
    });

    const res = await POST(
      checkinRequest({
        ...validBody,
        duplicateOverride: true,
        duplicateOverrideReason: 'Customer confirmed separate shipment',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.package).toBeDefined();
  });

  // ── Happy Path ──────────────────────────────────────────────────────────

  test('creates package successfully with valid input', async () => {
    const mockCustomer = {
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
      email: 'jane@example.com',
      phone: null,
      notifyEmail: false,
      notifySms: false,
    };

    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
    mockPrisma.package.findFirst.mockResolvedValue(null); // No duplicate

    const now = new Date();
    mockPrisma.package.create.mockResolvedValue({
      id: 'pkg-1',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'ups',
      senderName: null,
      packageType: 'medium',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageLocation: 'Shelf A3',
      checkedInAt: now,
      lengthIn: null,
      widthIn: null,
      heightIn: null,
      weightLbs: null,
      dimensionSource: null,
      customer: mockCustomer,
    });

    const res = await POST(
      checkinRequest({
        ...validBody,
        storageLocation: 'Shelf A3',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);

    const pkg = body.package as Record<string, unknown>;
    expect(pkg.id).toBe('pkg-1');
    expect(pkg.carrier).toBe('ups');
    expect(pkg.packageType).toBe('medium');
    expect(pkg.status).toBe('checked_in');
    expect(pkg.storageLocation).toBe('Shelf A3');

    const customer = pkg.customer as Record<string, unknown>;
    expect(customer.name).toBe('Jane Doe');
    expect(customer.pmbNumber).toBe('PMB-100');

    // Verify prisma.package.create was called
    expect(mockPrisma.package.create).toHaveBeenCalledTimes(1);
    // Verify audit log was created
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  // ── Walk-In Flow ────────────────────────────────────────────────────────

  test('handles walk-in check-in without existing customerId', async () => {
    const walkInCustomer = {
      id: 'walkin-cust-1',
      firstName: 'Walk-In',
      lastName: 'Customer',
      pmbNumber: 'WALKIN-123',
      email: null,
      phone: null,
      notifyEmail: false,
      notifySms: false,
    };

    mockPrisma.customer.create.mockResolvedValue(walkInCustomer);
    mockPrisma.package.findFirst.mockResolvedValue(null); // No duplicate

    const now = new Date();
    mockPrisma.package.create.mockResolvedValue({
      id: 'pkg-walkin',
      trackingNumber: null,
      carrier: 'fedex',
      senderName: null,
      packageType: 'small',
      status: 'checked_in',
      hazardous: false,
      perishable: false,
      storageLocation: null,
      checkedInAt: now,
      lengthIn: null,
      widthIn: null,
      heightIn: null,
      weightLbs: null,
      dimensionSource: null,
      customer: walkInCustomer,
    });

    const res = await POST(
      checkinRequest({
        carrier: 'fedex',
        packageType: 'small',
        isWalkIn: true,
        walkInName: 'Walk-In Customer',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // Walk-in customer was created
    expect(mockPrisma.customer.create).toHaveBeenCalledTimes(1);
  });

  // ── Hazardous / Perishable Flags ────────────────────────────────────────

  test('preserves hazardous and perishable flags', async () => {
    const mockCustomer = {
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
      email: null,
      phone: null,
      notifyEmail: false,
      notifySms: false,
    };

    mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
    mockPrisma.package.findFirst.mockResolvedValue(null);

    const now = new Date();
    mockPrisma.package.create.mockResolvedValue({
      id: 'pkg-haz',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'ups',
      senderName: null,
      packageType: 'medium',
      status: 'checked_in',
      hazardous: true,
      perishable: true,
      storageLocation: null,
      checkedInAt: now,
      lengthIn: null,
      widthIn: null,
      heightIn: null,
      weightLbs: null,
      dimensionSource: null,
      customer: mockCustomer,
    });

    const res = await POST(
      checkinRequest({
        ...validBody,
        hazardous: true,
        perishable: true,
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    const pkg = body.package as Record<string, unknown>;
    expect(pkg.hazardous).toBe(true);
    expect(pkg.perishable).toBe(true);
  });
});
