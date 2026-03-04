/**
 * Critical-Path Tests: CMRA Compliance
 *
 * Tests GET /api/compliance for:
 * - Auth guard
 * - Summary stats computation
 * - Correct status classification (expired, critical, warning, missing, compliant)
 * - Filter parameter
 * - CSV export format
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

import { GET as getCompliance } from '../../src/app/api/compliance/route';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const mockUser = createMockUser();

const now = new Date();
const daysFromNow = (days: number): Date =>
  new Date(now.getTime() + days * 86400000);

/** Build a mock customer for compliance testing. */
function makeCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-default',
    firstName: 'Test',
    lastName: 'Customer',
    pmbNumber: 'PMB-001',
    email: 'test@example.com',
    phone: '555-0100',
    status: 'active',
    idType: 'drivers_license',
    idExpiration: daysFromNow(365),  // Valid for a year
    form1583Status: 'approved',
    form1583Date: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    proofOfAddressType: 'home_vehicle_insurance',
    proofOfAddressDateOfIssue: new Date('2025-01-01'),
    ...overrides,
  };
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

describe('GET /api/compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  test('returns 401 when not authenticated', async () => {
    mockGetOrProvisionUser.mockResolvedValue(null);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  test('returns 400 when user has no tenantId', async () => {
    mockGetOrProvisionUser.mockResolvedValue(createMockUser({ tenantId: null }));

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/no tenant/i);
  });

  // ── Summary Stats ──────────────────────────────────────────────────────

  test('returns correct summary stats', async () => {
    const customers = [
      makeCustomer({ id: 'c1', pmbNumber: 'PMB-001' }), // compliant
      makeCustomer({ id: 'c2', pmbNumber: 'PMB-002', idExpiration: daysFromNow(15) }), // critical (< 30 days)
      makeCustomer({ id: 'c3', pmbNumber: 'PMB-003', idExpiration: daysFromNow(-5) }), // expired
      makeCustomer({ id: 'c4', pmbNumber: 'PMB-004', idType: null, idExpiration: null }), // missing
      makeCustomer({ id: 'c5', pmbNumber: 'PMB-005', idExpiration: daysFromNow(60) }), // warning (< 90 days)
    ];
    mockPrisma.customer.findMany.mockResolvedValue(customers);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);

    const summary = body.summary as Record<string, number>;
    expect(summary.total).toBe(5);
    expect(summary.compliant).toBe(1);
    expect(summary.critical).toBe(1);
    expect(summary.expired).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.warning).toBe(1);

    // Compliance score = 1 compliant / 5 total = 20%
    expect(summary.complianceScore).toBe(20);
  });

  // ── Classification Logic ───────────────────────────────────────────────

  test('classifies customer with expired ID as "expired"', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([
      makeCustomer({
        id: 'c-expired',
        pmbNumber: 'PMB-EXP',
        idExpiration: daysFromNow(-10), // ID expired 10 days ago
      }),
    ]);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { body } = await parseJsonResponse(res);
    const records = body.records as Array<Record<string, unknown>>;

    expect(records).toHaveLength(1);
    expect(records[0].complianceStatus).toBe('expired');
    expect((records[0].issues as string[]).length).toBeGreaterThan(0);
  });

  test('classifies customer expiring within 30 days as "critical"', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([
      makeCustomer({
        id: 'c-critical',
        pmbNumber: 'PMB-CRIT',
        idExpiration: daysFromNow(20), // Expires in 20 days
      }),
    ]);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { body } = await parseJsonResponse(res);
    const records = body.records as Array<Record<string, unknown>>;

    expect(records[0].complianceStatus).toBe('critical');
  });

  test('classifies customer with missing Form 1583 as "missing"', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([
      makeCustomer({
        id: 'c-missing',
        pmbNumber: 'PMB-MISS',
        form1583Status: 'pending', // Not approved
      }),
    ]);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { body } = await parseJsonResponse(res);
    const records = body.records as Array<Record<string, unknown>>;

    expect(records[0].complianceStatus).toBe('missing');
    expect(records[0].issues).toContain('Form 1583 not approved');
  });

  test('classifies fully compliant customer correctly', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([
      makeCustomer({
        id: 'c-ok',
        pmbNumber: 'PMB-OK',
        idExpiration: daysFromNow(365), // Valid for a year
        form1583Status: 'approved',
        proofOfAddressType: 'mortgage_deed_of_trust',
      }),
    ]);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { body } = await parseJsonResponse(res);
    const records = body.records as Array<Record<string, unknown>>;

    expect(records[0].complianceStatus).toBe('compliant');
    expect((records[0].issues as string[])).toHaveLength(0);
  });

  // ── Filter Parameter ──────────────────────────────────────────────────

  test('filters records by compliance status', async () => {
    const customers = [
      makeCustomer({ id: 'c1', pmbNumber: 'PMB-001' }), // compliant
      makeCustomer({ id: 'c2', pmbNumber: 'PMB-002', idExpiration: daysFromNow(-5) }), // expired
      makeCustomer({ id: 'c3', pmbNumber: 'PMB-003', idExpiration: daysFromNow(-1) }), // expired
    ];
    mockPrisma.customer.findMany.mockResolvedValue(customers);

    const res = await getCompliance(
      buildRequest('/api/compliance', { searchParams: { filter: 'expired' } }) as never,
      buildRouteContext() as never,
    );
    const { body } = await parseJsonResponse(res);

    // Summary should count all customers
    const summary = body.summary as Record<string, number>;
    expect(summary.total).toBe(3);

    // But records should only contain expired ones
    const records = body.records as Array<Record<string, unknown>>;
    expect(records.every((r) => r.complianceStatus === 'expired')).toBe(true);
    expect(records).toHaveLength(2);
  });

  // ── CSV Export ──────────────────────────────────────────────────────────

  test('exports compliance data as CSV', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([
      makeCustomer({ id: 'c1', pmbNumber: 'PMB-001' }),
    ]);

    const res = await getCompliance(
      buildRequest('/api/compliance', { searchParams: { export: 'csv' } }) as never,
      buildRouteContext() as never,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('compliance-report');

    const csvText = await res.text();
    expect(csvText).toContain('PMB');
    expect(csvText).toContain('Compliance Status');
    expect(csvText).toContain('PMB-001');
  });

  // ── Sorting ─────────────────────────────────────────────────────────────

  test('sorts records by urgency (expired first)', async () => {
    const customers = [
      makeCustomer({ id: 'c1', firstName: 'Compliant', pmbNumber: 'PMB-C' }),
      makeCustomer({
        id: 'c2', firstName: 'Expired', pmbNumber: 'PMB-E',
        idExpiration: daysFromNow(-5),
      }),
      makeCustomer({
        id: 'c3', firstName: 'Critical', pmbNumber: 'PMB-CR',
        idExpiration: daysFromNow(10),
      }),
    ];
    mockPrisma.customer.findMany.mockResolvedValue(customers);

    const res = await getCompliance(
      buildRequest('/api/compliance') as never,
      buildRouteContext() as never,
    );
    const { body } = await parseJsonResponse(res);
    const records = body.records as Array<Record<string, unknown>>;

    // Should be sorted: expired → critical → compliant
    expect(records[0].complianceStatus).toBe('expired');
    expect(records[1].complianceStatus).toBe('critical');
    expect(records[2].complianceStatus).toBe('compliant');
  });
});
