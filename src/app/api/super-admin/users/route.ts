import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/super-admin/users
 * Lists all super admin users (role = 'superadmin').
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const superAdmins = await prisma.user.findMany({
      where: { role: 'superadmin', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const users = superAdmins.map((a) => {
      const nameParts = a.name.split(' ');
      return {
        id: a.id,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: a.email,
        status: a.status as 'active' | 'inactive' | 'pending',
        invitedBy: null,
        inviteExpiresAt: null,
        lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
        loginCount: a.loginCount,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ users, currentUserId: user.id });
  } catch (err) {
    console.error('[GET /api/super-admin/users]', err);
    return NextResponse.json({ error: 'Failed to fetch super admins' }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/users
 * Creates a new super admin user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { firstName, lastName, email } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'All fields are required: firstName, lastName, email' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    // Create user with pending status (no tenantId — superadmins are platform-level)
    const newAdmin = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email,
        role: 'superadmin',
        status: 'inactive', // becomes active after password setup
      },
    });

    // TODO: Generate invitation token and send email via Resend
    // const token = crypto.randomBytes(32).toString('hex');

    const nameParts = newAdmin.name.split(' ');
    return NextResponse.json({
      success: true,
      user: {
        id: newAdmin.id,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        email: newAdmin.email,
        status: newAdmin.status,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/super-admin/users]', err);
    return NextResponse.json({ error: 'Failed to create super admin' }, { status: 500 });
  }
}

/**
 * PATCH /api/super-admin/users
 * Updates a super admin user (status, name, email).
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { userId, status, firstName, lastName, email } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: userId, role: 'superadmin', deletedAt: null },
    });
    if (!target) {
      return NextResponse.json({ error: 'Super admin not found' }, { status: 404 });
    }

    // Prevent self-deactivation
    if (userId === user.id && status === 'inactive') {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    // Prevent deactivating the last active super admin
    if (status === 'inactive' && target.status === 'active') {
      const activeCount = await prisma.user.count({
        where: { role: 'superadmin', status: 'active', deletedAt: null },
      });
      if (activeCount <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate the last active super admin' }, { status: 400 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (firstName && lastName) updateData.name = `${firstName} ${lastName}`;
    if (email) {
      // Check uniqueness
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      updateData.email = email;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // If deactivated, terminate active sessions
    if (status === 'inactive') {
      // LoginSession doesn't have a "terminated" field, but we could add one.
      // For now, login sessions are read-only audit records.
      console.log(`[PATCH /api/super-admin/users] Deactivated user ${userId}`);
    }

    const nameParts = updated.name.split(' ');
    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' '),
        email: updated.email,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error('[PATCH /api/super-admin/users]', err);
    return NextResponse.json({ error: 'Failed to update super admin' }, { status: 500 });
  }
}
