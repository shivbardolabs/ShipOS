/**
 * BAR-424: Add range to a mailbox size
 *
 * POST /api/settings/mailbox-sizes/[id]/ranges — add a new range
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler, badRequest, forbidden, notFound } from '@/lib/api-utils';
import { checkRangeOverlap } from '@/lib/mailbox-helpers';

/**
 * POST /api/settings/mailbox-sizes/[id]/ranges
 * Add a new number range to a physical mailbox size. Superadmin only.
 * Body: { rangeStart: number, rangeEnd: number }
 */
export const POST = withApiHandler(async (request, { user, params }) => {
  if (user.role !== 'superadmin') {
    forbidden('Only Super-Admin users can add mailbox ranges');
  }

  const sizeId = params.id;
  const size = await prisma.mailboxSize.findUnique({ where: { id: sizeId } });
  if (!size) {
    notFound('Mailbox size not found');
  }

  const body = await request.json();
  const { rangeStart, rangeEnd } = body as { rangeStart?: number; rangeEnd?: number };

  if (typeof rangeStart !== 'number' || typeof rangeEnd !== 'number') {
    badRequest('rangeStart and rangeEnd are required numbers');
  }

  if (rangeStart < 0 || rangeEnd < 0) {
    badRequest('Range values must be non-negative');
  }

  if (rangeStart >= rangeEnd) {
    badRequest('Range start must be less than range end');
  }

  // Check for overlaps with all existing active ranges
  const overlap = await checkRangeOverlap(rangeStart, rangeEnd);
  if (overlap.overlaps) {
    return NextResponse.json(
      {
        error: `Range ${rangeStart}–${rangeEnd} overlaps with ${overlap.conflictLabel}`,
        overlap: true,
      },
      { status: 400 },
    );
  }

  const range = await prisma.mailboxRange.create({
    data: {
      platform: 'physical',
      label: size.name,
      rangeStart,
      rangeEnd,
      sizeId,
      isActive: true,
    },
  });

  return NextResponse.json({ range }, { status: 201 });
});
