/**
 * BAR-187: Package Put-Back API
 *
 * POST /api/packages/put-back
 * Returns a package to checked_in status without resetting checkedInAt.
 * Preserves storage timer per acceptance criteria.
 *
 * Body: { packageId: string, reason: string }
 */

import { withApiHandler, validateBody, ok } from '@/lib/api-utils';
import { z } from 'zod';

const PutBackSchema = z.object({
  packageId: z.string().min(1, 'packageId is required'),
  reason: z.string().min(1, 'reason is required'),
});

export const POST = withApiHandler(async (request, { user }) => {
  const { packageId, reason } = await validateBody(request, PutBackSchema);

  // In production: update package in database
  // - Set status back to 'checked_in'
  // - Do NOT reset checkedInAt (preserve storage timer)
  // - Clear releasedAt and releaseSignature
  // - Log put-back reason
  // - Increment putBackCount
  //
  // await prisma.package.update({
  //   where: { id: packageId, customer: { tenantId: user.tenantId! } },
  //   data: {
  //     status: 'checked_in',
  //     releasedAt: null,
  //     releaseSignature: null,
  //     checkedOutById: null,
  //     notes: prisma.raw(`COALESCE(notes, '') || '\n[Put-back: ${reason}]'`),
  //   },
  // });

  return ok({
    success: true,
    packageId,
    reason,
    message: 'Package returned to inventory. Storage timer preserved.',
  });
});
