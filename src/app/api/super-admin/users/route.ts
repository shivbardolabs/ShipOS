import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/super-admin/users
 * Lists all super admin users (role = 'superadmin').
 */
export async function GET() {
  // TODO: Replace with Prisma query
  // const superAdmins = await prisma.user.findMany({
  //   where: { role: 'superadmin', deletedAt: null },
  //   orderBy: { createdAt: 'desc' },
  //   select: {
  //     id: true,
  //     name: true,
  //     email: true,
  //     status: true,
  //     lastLoginAt: true,
  //     loginCount: true,
  //     createdAt: true,
  //     updatedAt: true,
  //   },
  // });

  return NextResponse.json({ users: [], message: 'Endpoint ready — connect to Prisma for live data' });
}

/**
 * POST /api/super-admin/users
 * Creates a new super admin user and sends an invitation email.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email } = body;

  // Validation
  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'All fields are required: firstName, lastName, email' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // TODO: Check uniqueness
  // const existing = await prisma.user.findUnique({ where: { email } });
  // if (existing) {
  //   return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  // }

  // TODO: Create user with pending status
  // const user = await prisma.user.create({
  //   data: {
  //     name: `${firstName} ${lastName}`,
  //     email,
  //     role: 'superadmin',
  //     status: 'inactive', // becomes active after password setup
  //   },
  // });

  // TODO: Generate invitation token and send email via Resend
  // const token = crypto.randomBytes(32).toString('hex');
  // Send email with link: /setup-password?token=XXX

  return NextResponse.json({ success: true, message: 'Super admin invitation sent (mock)' }, { status: 201 });
}

/**
 * PATCH /api/super-admin/users
 * Updates a super admin user (status, name, email).
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // TODO: Prevent self-deactivation
  // TODO: Prevent deactivating the last active super admin
  // TODO: Update user via Prisma
  // TODO: If deactivated, terminate all active sessions

  return NextResponse.json({ success: true, message: 'Super admin updated (mock)' });
}
