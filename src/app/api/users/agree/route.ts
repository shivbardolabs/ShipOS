import { withApiHandler, ok } from '@/lib/api-utils';
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
export const POST = withApiHandler(async (request, { user }) => {
  // Parse optional version numbers from body
  let termsVersion: number | null = null;
  let privacyVersion: number | null = null;

  try {
    const body = await request.json();
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
    where: { id: user.id },
    data: updateData,
  });

  return ok({ ok: true });
});
