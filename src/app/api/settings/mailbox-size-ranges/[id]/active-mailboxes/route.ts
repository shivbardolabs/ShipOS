/**
 * BAR-424: Check active mailboxes for a specific range
 *
 * GET /api/settings/mailbox-size-ranges/[id]/active-mailboxes
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler, notFound } from '@/lib/api-utils';
import { getActiveMailboxesForRange } from '@/lib/mailbox-helpers';

/**
 * GET /api/settings/mailbox-size-ranges/[id]/active-mailboxes
 * Returns list of active mailboxes whose PMB number falls within this range.
 */
export const GET = withApiHandler(async (_request, { user, params }) => {
  const id = params.id;
  const range = await prisma.mailboxRange.findUnique({ where: { id } });
  if (!range) {
    notFound('Mailbox range not found');
  }

  const activeMailboxes = await getActiveMailboxesForRange(range.rangeStart, range.rangeEnd);

  return NextResponse.json({ activeMailboxes, count: activeMailboxes.length });
});
