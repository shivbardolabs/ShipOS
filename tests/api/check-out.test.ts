/**
 * Critical-Path Tests: Package Check-Out
 *
 * Tests POST /api/packages/check-out for:
 * - Input validation (missing packageIds, customerId)
 * - Customer not found (404)
 * - No eligible packages (404)
 * - Successful release with correct counts
 * - Delegate pickup flow
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

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/lib/auth', () => ({
  getOrProvisionUser: mockGetOrProvisionUser,
}));

jest.spyOn(console, 'error').mockImplementation(() => {});

import { POST } from '../../src/app/api/packages/check-out/route';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const mockUser = createMockUser();

function checkoutRequest(body: Record<string, unknown>): Request {
  return buildRequest('/api/packages/check-out', { method: 'POST', body });
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('POST /api/packages/check-out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // check-out route is public: true, but we still mock auth
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
    // Default: audit log admin user
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  // ── Validation ──────────────────────────────────────────────────────────

  test('returns 400 when packageIds is missing', async () => {
    const res = await POST(
      checkoutRequest({ customerId: 'cust-1' }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/packageIds.*customerId|required/i);
  });

  test('returns 400 when customerId is missing', async () => {
    const res = await POST(
      checkoutRequest({ packageIds: ['pkg-1'] }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/packageIds.*customerId|required/i);
  });

  test('returns 400 when packageIds is empty array', async () => {
    const res = await POST(
      checkoutRequest({ packageIds: [], customerId: 'cust-1' }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/packageIds.*customerId|required/i);
  });

  // ── Customer Lookup ─────────────────────────────────────────────────────

  test('returns 404 when customer is not found', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null);

    const res = await POST(
      checkoutRequest({ packageIds: ['pkg-1'], customerId: 'nonexistent' }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(404);
    expect(body.error).toMatch(/customer not found/i);
  });

  // ── No Eligible Packages ────────────────────────────────────────────────

  test('returns 404 when no eligible packages found', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
    });
    mockPrisma.package.findMany.mockResolvedValue([]); // No matching packages

    const res = await POST(
      checkoutRequest({
        packageIds: ['pkg-released-already'],
        customerId: 'cust-1',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(404);
    expect(body.error).toMatch(/no eligible packages/i);
  });

  // ── Happy Path ──────────────────────────────────────────────────────────

  test('releases packages successfully', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
    });

    mockPrisma.package.findMany.mockResolvedValue([
      { id: 'pkg-1', customerId: 'cust-1', status: 'checked_in' },
      { id: 'pkg-2', customerId: 'cust-1', status: 'notified' },
    ]);

    mockPrisma.package.updateMany.mockResolvedValue({ count: 2 });

    const res = await POST(
      checkoutRequest({
        packageIds: ['pkg-1', 'pkg-2'],
        customerId: 'cust-1',
        releaseSignature: 'data:image/png;base64,abc123',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.released).toBe(2);
    expect(body.skipped).toBe(0);

    const packages = body.packages as Array<Record<string, unknown>>;
    expect(packages).toHaveLength(2);
    expect(packages[0].status).toBe('released');

    // Verify updateMany was called with released status
    expect(mockPrisma.package.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'released',
          releaseSignature: 'data:image/png;base64,abc123',
        }),
      }),
    );
  });

  test('reports correct skipped count for partial matches', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
    });

    // Only 1 of 3 requested packages is eligible
    mockPrisma.package.findMany.mockResolvedValue([
      { id: 'pkg-1', customerId: 'cust-1', status: 'checked_in' },
    ]);

    mockPrisma.package.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(
      checkoutRequest({
        packageIds: ['pkg-1', 'pkg-already-released', 'pkg-nonexistent'],
        customerId: 'cust-1',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.released).toBe(1);
    expect(body.skipped).toBe(2);
  });

  // ── Delegate Pickup ─────────────────────────────────────────────────────

  test('records delegate name on release', async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-100',
    });

    mockPrisma.package.findMany.mockResolvedValue([
      { id: 'pkg-1', customerId: 'cust-1', status: 'checked_in' },
    ]);

    mockPrisma.package.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(
      checkoutRequest({
        packageIds: ['pkg-1'],
        customerId: 'cust-1',
        delegateName: 'John Smith',
        delegateIdType: 'drivers_license',
        delegateIdNumber: 'DL-12345',
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);

    // Verify delegate info was passed to updateMany
    expect(mockPrisma.package.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delegateName: 'John Smith',
          delegateIdType: 'drivers_license',
          delegateIdNumber: 'DL-12345',
        }),
      }),
    );
  });
});
