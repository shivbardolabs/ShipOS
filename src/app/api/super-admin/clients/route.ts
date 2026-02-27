/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/super-admin/clients
 * Lists all platform client accounts (tenants) with their stores, admins, and subscriptions.
 * Supports query params: ?status=active&search=query
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
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

    const clients = tenants.map((t: any) => {
      // Store model doesn't have status, so all stores belonging to active tenant are "active"
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
        stores: t.stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          zipCode: s.zipCode || '',
          status: 'active' as const,
          cmraProof: null,
        })),
        admins: t.users.map((u: any) => ({
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

    return NextResponse.json({ clients });
  } catch (err) {
    console.error('[GET /api/super-admin/clients]', err);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/clients
 * Creates a new client account (tenant) with buyer contact info.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { firstName, lastName, email, phone, companyName, subscriptionFee } = body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const phoneRegex = /^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check slug uniqueness
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return NextResponse.json({ error: 'A client with a similar name already exists' }, { status: 409 });
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

    return NextResponse.json({
      success: true,
      client: {
        id: tenant.id,
        companyName: tenant.name,
        status: tenant.status,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/super-admin/clients]', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
