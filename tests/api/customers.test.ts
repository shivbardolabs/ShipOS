/**
 * Critical-Path Tests: Customers CRUD
 *
 * Tests:
 * - GET  /api/customers         — list with pagination and search
 * - POST /api/customers/provision — atomic customer creation
 * - GET  /api/customers/[id]    — single customer detail
 * - PATCH /api/customers/[id]   — update customer fields
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

jest.mock('@/lib/rts-service', () => ({
  autoRtsForCustomer: jest.fn().mockResolvedValue({ created: 0 }),
}));

jest.spyOn(console, 'error').mockImplementation(() => {});

/* ── Imports (after mocks) ───────────────────────────────────────────────── */

import { GET as listCustomers } from '../../src/app/api/customers/route';
import { POST as provisionCustomer } from '../../src/app/api/customers/provision/route';
import {
  GET as getCustomer,
  PATCH as patchCustomer,
} from '../../src/app/api/customers/[id]/route';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const mockUser = createMockUser();

const sampleCustomer = {
  id: 'cust-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0101',
  businessName: null,
  pmbNumber: 'PMB-100',
  platform: 'physical',
  status: 'active',
  dateOpened: new Date('2025-06-01'),
  dateClosed: null,
  renewalDate: new Date('2026-06-01'),
  idType: 'drivers_license',
  idExpiration: new Date('2028-01-15'),
  passportExpiration: null,
  form1583Status: 'approved',
  form1583Date: new Date('2025-06-01'),
  lastRenewalNotice: null,
  agreementSignedAt: new Date('2025-06-01'),
  smsConsentAt: null,
  smsOptOutAt: null,
  crdUploadDate: null,
  proofOfAddressDateOfIssue: null,
  deletedAt: null,
  tenantId: 'tenant-1',
  createdAt: new Date('2025-06-01'),
  updatedAt: new Date('2026-02-01'),
  _count: { packages: 5, mailPieces: 2, shipments: 1 },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  GET /api/customers                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('GET /api/customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
  });

  test('returns 401 when user is not authenticated', async () => {
    mockGetOrProvisionUser.mockResolvedValue(null);

    const res = await listCustomers(
      buildRequest('/api/customers') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  test('returns paginated customer list', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([sampleCustomer]);
    mockPrisma.customer.count.mockResolvedValue(1);

    const res = await listCustomers(
      buildRequest('/api/customers') as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.customers).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);

    const cust = (body.customers as Array<Record<string, unknown>>)[0];
    expect(cust.firstName).toBe('Jane');
    expect(cust.lastName).toBe('Doe');
    expect(cust.pmbNumber).toBe('PMB-100');
    // Dates should be serialized to ISO strings
    expect(typeof cust.createdAt).toBe('string');
    expect(typeof cust.dateOpened).toBe('string');
  });

  test('passes search parameter to Prisma query', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.customer.count.mockResolvedValue(0);

    await listCustomers(
      buildRequest('/api/customers', { searchParams: { search: 'jane' } }) as never,
      buildRouteContext() as never,
    );

    // Verify the where clause includes OR search conditions
    const callArgs = mockPrisma.customer.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ firstName: expect.objectContaining({ contains: 'jane' }) }),
      ]),
    );
  });

  test('respects page and limit parameters', async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.customer.count.mockResolvedValue(100);

    const res = await listCustomers(
      buildRequest('/api/customers', { searchParams: { page: '3', limit: '10' } }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.page).toBe(3);
    expect(body.limit).toBe(10);

    // Verify correct skip/take
    const callArgs = mockPrisma.customer.findMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(20); // (3-1) * 10
    expect(callArgs.take).toBe(10);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  POST /api/customers/provision                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('POST /api/customers/provision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await provisionCustomer(
      buildRequest('/api/customers/provision', {
        method: 'POST',
        body: { firstName: 'Jane' }, // missing lastName and email
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/required/i);
  });

  test('returns 400 when tenantId is missing from user', async () => {
    mockGetOrProvisionUser.mockResolvedValue(createMockUser({ tenantId: null }));

    const res = await provisionCustomer(
      buildRequest('/api/customers/provision', {
        method: 'POST',
        body: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(400);
    expect(body.error).toMatch(/no tenant/i);
  });

  test('provisions customer successfully with transaction', async () => {
    const mockCustomer = {
      id: 'new-cust-1',
      firstName: 'Jane',
      lastName: 'Doe',
      pmbNumber: 'PMB-ABC123',
    };
    const mockInvoice = { id: 'inv-1', invoiceNumber: 'NEW-abc12345' };

    // $transaction receives a callback; we simulate it
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
        return callback(mockPrisma);
      },
    );
    mockPrisma.customer.create.mockResolvedValue(mockCustomer);
    mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const res = await provisionCustomer(
      buildRequest('/api/customers/provision', {
        method: 'POST',
        body: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '555-0101',
          homeAddress: '456 Oak St',
          homeCity: 'Brooklyn',
          homeState: 'NY',
          homeZip: '11201',
        },
      }) as never,
      buildRouteContext() as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.customerId).toBe('new-cust-1');
    expect(body.invoiceId).toBe('inv-1');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  GET /api/customers/[id]                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('GET /api/customers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
  });

  test('returns 404 when customer does not exist', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);

    const res = await getCustomer(
      buildRequest('/api/customers/nonexistent') as never,
      buildRouteContext({ id: 'nonexistent' }) as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(404);
    expect(body.error).toMatch(/customer not found/i);
  });

  test('returns customer with related data', async () => {
    const detailedCustomer = {
      ...sampleCustomer,
      packages: [
        {
          id: 'pkg-1',
          trackingNumber: '1Z123',
          carrier: 'ups',
          status: 'checked_in',
          checkedInAt: new Date('2026-02-20'),
          notifiedAt: null,
          releasedAt: null,
          holdDeadline: null,
          carrierUploadedAt: null,
          createdAt: new Date('2026-02-20'),
          updatedAt: new Date('2026-02-20'),
        },
      ],
      mailPieces: [],
      shipments: [],
      notifications: [],
      loyaltyAccount: null,
    };

    mockPrisma.customer.findFirst.mockResolvedValue(detailedCustomer);

    const res = await getCustomer(
      buildRequest('/api/customers/cust-1') as never,
      buildRouteContext({ id: 'cust-1' }) as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.firstName).toBe('Jane');
    expect(body.lastName).toBe('Doe');
    expect(body.pmbNumber).toBe('PMB-100');

    // Packages should be serialized
    const packages = body.packages as Array<Record<string, unknown>>;
    expect(packages).toHaveLength(1);
    expect(typeof packages[0].checkedInAt).toBe('string');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PATCH /api/customers/[id]                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('PATCH /api/customers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrProvisionUser.mockResolvedValue(mockUser);
  });

  test('returns 404 when customer does not exist', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);

    const res = await patchCustomer(
      buildRequest('/api/customers/nonexistent', {
        method: 'PATCH',
        body: { firstName: 'Updated' },
      }) as never,
      buildRouteContext({ id: 'nonexistent' }) as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(404);
    expect(body.error).toMatch(/customer not found/i);
  });

  test('updates customer fields successfully', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      ...sampleCustomer,
      dateClosed: null,
      status: 'active',
    });

    const updatedCustomer = {
      ...sampleCustomer,
      firstName: 'Janet',
      phone: '555-9999',
    };
    mockPrisma.customer.update.mockResolvedValue(updatedCustomer);

    const res = await patchCustomer(
      buildRequest('/api/customers/cust-1', {
        method: 'PATCH',
        body: { firstName: 'Janet', phone: '555-9999' },
      }) as never,
      buildRouteContext({ id: 'cust-1' }) as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(body.firstName).toBe('Janet');
    expect(mockPrisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust-1' },
        data: expect.objectContaining({ firstName: 'Janet', phone: '555-9999' }),
      }),
    );
  });

  test('auto-sets dateClosed when status changes to closed', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({
      ...sampleCustomer,
      status: 'active',
      dateClosed: null,
    });

    const closedCustomer = {
      ...sampleCustomer,
      status: 'closed',
      dateClosed: new Date(),
    };
    mockPrisma.customer.update.mockResolvedValue(closedCustomer);

    const res = await patchCustomer(
      buildRequest('/api/customers/cust-1', {
        method: 'PATCH',
        body: { status: 'closed' },
      }) as never,
      buildRouteContext({ id: 'cust-1' }) as never,
    );
    const { status, body } = await parseJsonResponse(res);

    expect(status).toBe(200);

    // Verify update was called with dateClosed
    const updateCall = mockPrisma.customer.update.mock.calls[0][0];
    expect(updateCall.data.dateClosed).toBeDefined();
    expect(updateCall.data.status).toBe('closed');
  });
});
