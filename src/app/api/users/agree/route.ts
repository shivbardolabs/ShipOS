import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/users/agree
 *
 * Records that the current user has accepted the Terms of Service
 * and Privacy Policy. Sets `agreedToTermsAt` to the current timestamp
 * and stores the version numbers if provided.
 *
 * Called from the /agree page after first login or when new versions
 * of legal documents require re-acceptance.
 *
 * Body (optional): { termsVersion?: number, privacyVersion?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const me = await getOrProvisionUser();
    if (!me) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse optional version numbers from body
    let termsVersion: number | null = null;
    let privacyVersion: number | null = null;

    try {
      const body = await req.json();
      if (typeof body.termsVersion === 'number') termsVersion = body.termsVersion;
      if (typeof body.privacyVersion === 'number') privacyVersion = body.privacyVersion;
    } catch {
      // No body or invalid JSON — that's fine, just record the timestamp
    }

    const updateData: Record<string, unknown> = {
      agreedToTermsAt: new Date(),
    };

    if (termsVersion !== null) {
      updateData.termsVersionAccepted = termsVersion;
    }
    if (privacyVersion !== null) {
      updateData.privacyVersionAccepted = privacyVersion;
    }

    await prisma.user.update({
      where: { id: me.id },
      data: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/users/agree]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
