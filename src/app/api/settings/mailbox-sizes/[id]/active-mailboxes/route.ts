/**
 * BAR-424: Check active mailboxes for a size
 *
 * GET /api/settings/mailbox-sizes/[id]/active-mailboxes
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler, notFound } from '@/lib/api-utils';
import { getActiveMailboxesForSize } from '@/lib/mailbox-helpers';

/**
 * GET /api/settings/mailbox-sizes/[id]/active-mailboxes
 * Returns list of active mailboxes whose PMB number falls within this size's ranges.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const sizeId = params.id;
  const size = await prisma.mailboxSize.findUnique({ where: { id: sizeId } });
  if (!size) {
    notFound('Mailbox size not found');
  }

  const activeMailboxes = await getActiveMailboxesForSize(sizeId);

  return NextResponse.json({ activeMailboxes, count: activeMailboxes.length });
});
