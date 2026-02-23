import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/users/invite
 * Lists all invitations for the current tenant.
 */
export async function GET() {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!me.tenantId) return NextResponse.json([], { status: 200 });

    const invitations = await prisma.invitation.findMany({
      where: { tenantId: me.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (err) {
    console.error('[GET /api/users/invite]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/users/invite
 * Creates an invitation. Admin only.
 * Body: { email: string, role: string }
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'admin' && me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }
    if (!me.tenantId) {
      return NextResponse.json({ error: 'No tenant configured' }, { status: 400 });
    }

    const { email, role } = await req.json();

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'manager', 'employee'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, manager, or employee.' }, { status: 400 });
    }

    // Check if user already exists in this tenant
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser && existingUser.tenantId === me.tenantId) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 });
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findUnique({
      where: { email_tenantId: { email: email.toLowerCase().trim(), tenantId: me.tenantId } },
    });

    if (existingInvite && existingInvite.status === 'pending') {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 409 });
    }

    // Create or upsert the invitation
    const invitation = await prisma.invitation.upsert({
      where: { email_tenantId: { email: email.toLowerCase().trim(), tenantId: me.tenantId } },
      update: { role, status: 'pending', invitedBy: me.id },
      create: {
        email: email.toLowerCase().trim(),
        role,
        status: 'pending',
        tenantId: me.tenantId,
        invitedBy: me.id,
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (err) {
    console.error('[POST /api/users/invite]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/invite
 * Revokes an invitation. Admin only.
 * Body: { invitationId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (me.role !== 'admin' && me.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    const { invitationId } = await req.json();

    // Ensure invitation belongs to same tenant
    const invite = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invite || invite.tenantId !== me.tenantId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'revoked' },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[DELETE /api/users/invite]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
