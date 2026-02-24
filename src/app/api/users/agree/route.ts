import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/users/agree
 *
 * Records that the current user has accepted the Terms of Service
 * and Privacy Policy. Sets `agreedToTermsAt` to the current timestamp.
 * Called from the /agree page after first login.
 */
export async function POST() {
  try {
    const me = await getOrProvisionUser();
    if (!me) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { agreedToTermsAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/users/agree]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
