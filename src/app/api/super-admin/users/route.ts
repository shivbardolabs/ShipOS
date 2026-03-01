import { withApiHandler, validateBody, ok, created, notFound, badRequest, forbidden, ApiError } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const CreateSuperAdminSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email('Invalid email format'),
});

const PatchSuperAdminSchema = z.object({
  userId: z.string().min(1),
  status: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
});

/**
 * GET /api/super-admin/users
 * Lists all super admin users (role = 'superadmin').
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

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

  return ok({ users, currentUserId: user.id });
});

/**
 * POST /api/super-admin/users
 * Creates a new super admin user.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const { firstName, lastName, email } = await validateBody(request, CreateSuperAdminSchema);

  // Check uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError('Email already in use', 409);
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
  return created({
    success: true,
    user: {
      id: newAdmin.id,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      email: newAdmin.email,
      status: newAdmin.status,
    },
  });
});

/**
 * PATCH /api/super-admin/users
 * Updates a super admin user (status, name, email).
 */
export const PATCH = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') forbidden('Forbidden');

  const body = await validateBody(request, PatchSuperAdminSchema);
  const { userId, status, firstName, lastName, email } = body;

  const target = await prisma.user.findFirst({
    where: { id: userId, role: 'superadmin', deletedAt: null },
  });
  if (!target) notFound('Super admin not found');

  // Prevent self-deactivation
  if (userId === user.id && status === 'inactive') {
    badRequest('Cannot deactivate yourself');
  }

  // Prevent deactivating the last active super admin
  if (status === 'inactive' && target!.status === 'active') {
    const activeCount = await prisma.user.count({
      where: { role: 'superadmin', status: 'active', deletedAt: null },
    });
    if (activeCount <= 1) {
      badRequest('Cannot deactivate the last active super admin');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (firstName && lastName) updateData.name = `${firstName} ${lastName}`;
  if (email) {
    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { email, id: { not: userId } },
    });
    if (existing) {
      throw new ApiError('Email already in use', 409);
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
  return ok({
    success: true,
    user: {
      id: updated.id,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' '),
      email: updated.email,
      status: updated.status,
    },
  });
});
