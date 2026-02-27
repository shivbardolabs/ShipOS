import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/super-admin/clients
 * Lists all platform client accounts (tenants) with their stores.
 * Supports query params: ?status=active&search=query
 */
export async function GET() {
  // Supported query params: ?status=active&search=query
  // const { searchParams } = new URL(req.url);
  // const status = searchParams.get('status');
  // const search = searchParams.get('search');

  // TODO: Replace with Prisma query
  // const clients = await prisma.tenant.findMany({
  //   where: {
  //     ...(status && status !== 'all' ? { status } : {}),
  //     ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  //   },
  //   include: {
  //     stores: true,
  //     users: { where: { role: 'admin' } },
  //     subscriptions: true,
  //   },
  //   orderBy: { createdAt: 'desc' },
  // });

  return NextResponse.json({ clients: [], message: 'Endpoint ready — connect to Prisma for live data' });
}

/**
 * POST /api/super-admin/clients
 * Creates a new client account (tenant) with buyer contact info.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, phone, companyName } = body;

  // Validation
  if (!firstName || !lastName || !email || !phone || !companyName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate US phone format
  const phoneRegex = /^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
  if (!phoneRegex.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // TODO: Create tenant in Prisma
  // const tenant = await prisma.tenant.create({
  //   data: {
  //     name: companyName,
  //     slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  //     email,
  //     phone,
  //     status: 'active',
  //     subscriptionTier: 'pro',
  //   },
  // });

  return NextResponse.json({ success: true, message: 'Client created (mock)' }, { status: 201 });
}
