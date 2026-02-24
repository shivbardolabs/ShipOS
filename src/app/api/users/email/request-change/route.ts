import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/notifications/resend';
import { randomBytes } from 'crypto';

/**
 * POST /api/users/email/request-change
 *
 * Initiates an email address change:
 * 1. Validates the new email is not already in use
 * 2. Creates a verification token (24h expiry)
 * 3. Sends a verification email to the new address
 */
export async function POST(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { newEmail } = body;

    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if same as current
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: 'New email is the same as current' }, { status: 400 });
    }

    // Check if email is already in use
    const existing = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
    }

    // Invalidate any existing pending tokens for this user
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() }, // Mark as used to invalidate
    });

    // Create verification token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        newEmail: newEmail.toLowerCase(),
        token,
        expiresAt,
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/users/email/verify?token=${token}`;

    // Send verification email
    await sendEmail({
      to: newEmail,
      subject: '✉️ Verify your new email address — ShipOS Pro',
      text: `Hi ${user.name},\n\nYou requested to change your email address to ${newEmail}.\n\nClick the link below to verify this email (valid for 24 hours):\n${verifyUrl}\n\nIf you didn't request this change, you can safely ignore this email.\n\nBest,\nShipOS Pro`,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'email_change_requested',
        entityType: 'user',
        entityId: user.id,
        details: JSON.stringify({ currentEmail: user.email, newEmail }),
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your new email address.',
    });
  } catch (err) {
    console.error('[POST /api/users/email/request-change]', err);
    return NextResponse.json({ error: 'Failed to process email change' }, { status: 500 });
  }
}
