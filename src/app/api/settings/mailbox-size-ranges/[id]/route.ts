/**
 * BAR-424: Individual range operations (within a mailbox size)
 *
 * PUT    /api/settings/mailbox-size-ranges/[id] — update a range
 * DELETE /api/settings/mailbox-size-ranges/[id] — delete a range
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler, badRequest, forbidden, notFound } from '@/lib/api-utils';
import { checkRangeOverlap, getActiveMailboxesForRange } from '@/lib/mailbox-helpers';

/**
 * PUT /api/settings/mailbox-size-ranges/[id]
 * Update a range's start/end values. Superadmin only.
 * Body: { rangeStart?: number, rangeEnd?: number, isActive?: boolean }
 */
export const PUT = withApiHandler(async (request, { user, params }) => {
  if (user.role !== 'superadmin') {
    forbidden('Only Super-Admin users can edit mailbox ranges');
  }

  const id = params.id;
  const existing = await prisma.mailboxRange.findUnique({ where: { id } });
  if (!existing) {
    notFound('Mailbox range not found');
  }

  const body = await request.json();
  const { rangeStart, rangeEnd, isActive } = body as {
    rangeStart?: number;
    rangeEnd?: number;
    isActive?: boolean;
  };

  const newStart = rangeStart ?? existing.rangeStart;
  const newEnd = rangeEnd ?? existing.rangeEnd;

  if (newStart < 0 || newEnd < 0) {
    badRequest('Range values must be non-negative');
  }

  if (newStart >= newEnd) {
    badRequest('Range start must be less than range end');
  }

  // If changing range values, check overlap (exclude self)
  if (rangeStart !== undefined || rangeEnd !== undefined) {
    const overlap = await checkRangeOverlap(newStart, newEnd, id);
    if (overlap.overlaps) {
      return NextResponse.json(
        {
          error: `Range ${newStart}–${newEnd} overlaps with ${overlap.conflictLabel}`,
          overlap: true,
        },
        { status: 400 },
      );
    }
  }

  // If disabling or changing range, check for active mailboxes in old range
  if (isActive === false && existing.isActive) {
    const activeMailboxes = await getActiveMailboxesForRange(existing.rangeStart, existing.rangeEnd);
    if (activeMailboxes.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot disable range with active mailboxes',
          activeMailboxes,
          message: `${activeMailboxes.length} active mailbox(es) must be individually closed before disabling this range.`,
        },
        { status: 409 },
      );
    }
  }

  // If shrinking range, check that no active mailboxes fall outside new bounds
  if (
    (rangeStart !== undefined && rangeStart > existing.rangeStart) ||
    (rangeEnd !== undefined && rangeEnd < existing.rangeEnd)
  ) {
    // Check mailboxes in the old range that would be excluded from new range
    const mailboxesInOld = await getActiveMailboxesForRange(existing.rangeStart, existing.rangeEnd);
    const excluded = mailboxesInOld.filter((m) => {
      const num = parseInt(m.pmbNumber, 10);
      return num < newStart || num > newEnd;
    });
    if (excluded.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot shrink range — active mailboxes would be excluded',
          activeMailboxes: excluded,
          message: `${excluded.length} active mailbox(es) would fall outside the new range. Close them first.`,
        },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.mailboxRange.update({
    where: { id },
    data: {
      ...(rangeStart !== undefined ? { rangeStart } : {}),
      ...(rangeEnd !== undefined ? { rangeEnd } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json({ range: updated });
});

/**
 * DELETE /api/settings/mailbox-size-ranges/[id]
 * Delete a range. Superadmin only.
 * Blocked if active mailboxes exist in this range.
 */
export const DELETE = withApiHandler(async (_request, { user, params }) => {
  if (user.role !== 'superadmin') {
    forbidden('Only Super-Admin users can delete mailbox ranges');
  }

  const id = params.id;
  const existing = await prisma.mailboxRange.findUnique({ where: { id } });
  if (!existing) {
    notFound('Mailbox range not found');
  }

  // Check for active mailboxes
  const activeMailboxes = await getActiveMailboxesForRange(existing.rangeStart, existing.rangeEnd);
  if (activeMailboxes.length > 0) {
    return NextResponse.json(
      {
        error: 'Cannot delete range with active mailboxes',
        activeMailboxes,
        message: `${activeMailboxes.length} active mailbox(es) must be individually closed before deleting this range.`,
      },
      { status: 409 },
    );
  }

  await prisma.mailboxRange.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
