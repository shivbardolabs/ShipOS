import { NextResponse } from 'next/server';
import { withApiHandler, validateBody, ok, created, forbidden, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/**
 * GET /api/users/invite
 * Lists all invitations for the current tenant.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) return ok([]);

  const invitations = await prisma.invitation.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return ok(invitations);
});

/**
 * POST /api/users/invite
 * Creates an invitation. Admin only.
 * Body: { email: string, role: string }
 */

const CreateInviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'manager', 'employee'], {
    errorMap: () => ({ message: 'Invalid role. Must be admin, manager, or employee.' }),
  }),
});

export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Admin role required');
  }
  if (!user.tenantId) {
    badRequest('No tenant configured');
  }

  const { email, role } = await validateBody(request, CreateInviteSchema);
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists in this tenant
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser && existingUser.tenantId === user.tenantId) {
    return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 });
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.invitation.findUnique({
    where: { email_tenantId: { email: normalizedEmail, tenantId: user.tenantId! } },
  });

  if (existingInvite && existingInvite.status === 'pending') {
    return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 409 });
  }

  // Create or upsert the invitation
  const invitation = await prisma.invitation.upsert({
    where: { email_tenantId: { email: normalizedEmail, tenantId: user.tenantId! } },
    update: { role, status: 'pending', invitedBy: user.id },
    create: {
      email: normalizedEmail,
      role,
      status: 'pending',
      tenantId: user.tenantId!,
      invitedBy: user.id,
    },
  });

  return created(invitation);
});

/**
 * DELETE /api/users/invite
 * Revokes an invitation. Admin only.
 * Body: { invitationId: string }
 */

const RevokeInviteSchema = z.object({
  invitationId: z.string().min(1, 'invitationId is required'),
});

export const DELETE = withApiHandler(async (request, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    forbidden('Admin role required');
  }

  const { invitationId } = await validateBody(request, RevokeInviteSchema);

  // Ensure invitation belongs to same tenant
  const invite = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invite || invite.tenantId !== user.tenantId) {
    notFound('Invitation not found');
  }

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: 'revoked' },
  });

  return ok(updated);
});
