import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/users/email/verify?token=xxx
 *
 * Completes the email change flow:
 * 1. Validates the token exists and hasn't expired
 * 2. Updates the user's email in the database
 * 3. Marks the token as used
 * 4. Redirects to profile page with success message
 *
 * Note: Auth0 email update would require Management API integration.
 * For now, we update the local DB record. Auth0 sync is handled on next login.
 *
 * This is a public endpoint (accessed via email verification link).
 */
export const GET = withApiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return redirectWithError('Missing verification token');
  }

  // Find the token
  const verification = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!verification) {
    return redirectWithError('Invalid verification token');
  }

  if (verification.usedAt) {
    return redirectWithError('This verification link has already been used');
  }

  if (verification.expiresAt < new Date()) {
    return redirectWithError('This verification link has expired');
  }

  // Check the new email isn't taken (double-check)
  const existing = await prisma.user.findUnique({
    where: { email: verification.newEmail },
  });
  if (existing && existing.id !== verification.userId) {
    return redirectWithError('This email address is now in use by another account');
  }

  // Update the user's email
  const oldUser = await prisma.user.findUnique({
    where: { id: verification.userId },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verification.userId },
      data: { email: verification.newEmail },
    }),
    prisma.emailVerificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: 'email_changed',
        entityType: 'user',
        entityId: verification.userId,
        details: JSON.stringify({
          oldEmail: oldUser?.email,
          newEmail: verification.newEmail,
        }),
        oldData: JSON.stringify({ email: oldUser?.email }),
        newData: JSON.stringify({ email: verification.newEmail }),
        userId: verification.userId,
      },
    }),
  ]);

  // Redirect to profile with success
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  return NextResponse.redirect(`${baseUrl}/dashboard/profile?email_updated=true`);
}, { public: true });

function redirectWithError(message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  return NextResponse.redirect(
    `${baseUrl}/dashboard/profile?email_error=${encodeURIComponent(message)}`
  );
}
