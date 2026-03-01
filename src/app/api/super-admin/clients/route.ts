import { withApiHandler, validateBody, validateQuery, ok, created, badRequest, forbidden, ApiError } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const ClientsQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().max(200).optional(),
});

const CreateClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, 'Invalid phone number format'),
  companyName: z.string().min(1),
  subscriptionFee: z.string().optional(),
});

/**
 * GET /api/super-admin/clients
 * Lists all platform client accounts (tenants) with their stores, admins, and subscriptions.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const query = validateQuery(request, ClientsQuerySchema);

  const where: Prisma.TenantWhereInput = {};
  if (query.status && query.status !== 'all') where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      stores: {
        orderBy: { createdAt: 'desc' },
      },
      users: {
        where: { role: { in: ['admin', 'manager'] }, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          role: true,
        },
      },
      subscriptions: {
        where: { status: { in: ['active', 'past_due', 'trialing'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      paymentRecords: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const clients = tenants.map((t) => {
    const activeSub = t.subscriptions[0];
    const subscriptionFee = activeSub?.plan?.priceMonthly ?? 125;
    const monthlyRevenue = subscriptionFee * t.stores.length;
    const lastPayment = t.paymentRecords[0];

    // Determine payment status from subscription + payment records
    let paymentStatus: 'paid' | 'pending' | 'overdue' = 'paid';
    if (activeSub?.status === 'past_due') paymentStatus = 'overdue';
    else if (lastPayment?.status === 'pending') paymentStatus = 'pending';

    // Split name into first/last for the buyer contact
    const primaryAdmin = t.users[0];
    const nameParts = (primaryAdmin?.name || t.name || '').split(' ');

    return {
      id: t.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: primaryAdmin?.email || t.email || '',
      phone: t.phone || '',
      companyName: t.name,
      status: t.status as 'active' | 'inactive' | 'paused',
      subscriptionFee,
      feeOverrideReason: null,
      paymentMethod: t.stripeCustomerId ? 'Stripe' : null,
      paymentStatus,
      monthlyRevenue,
      stores: t.stores.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address || '',
        city: s.city || '',
        state: s.state || '',
        zipCode: s.zipCode || '',
        status: 'active' as const,
        cmraProof: null,
      })),
      admins: t.users.map((u) => ({
        id: u.id,
        firstName: u.name.split(' ')[0] || '',
        lastName: u.name.split(' ').slice(1).join(' ') || '',
        email: u.email,
        status: u.status,
      })),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  return ok({ clients });
});

/**
 * POST /api/super-admin/clients
 * Creates a new client account (tenant) with buyer contact info.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const { firstName, lastName, email, phone, companyName, subscriptionFee } =
    await validateBody(request, CreateClientSchema);

  // Check slug uniqueness
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    throw new ApiError('A client with a similar name already exists', 409);
  }

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: companyName,
      slug,
      email,
      phone,
      status: 'active',
      subscriptionTier: 'pro',
      receivingFeeRate: subscriptionFee ? parseFloat(subscriptionFee) : 3.0,
    },
  });

  // Create admin user for the tenant
  await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      email,
      role: 'admin',
      status: 'active',
      tenantId: tenant.id,
    },
  });

  return created({
    success: true,
    client: {
      id: tenant.id,
      companyName: tenant.name,
      status: tenant.status,
    },
  });
});
