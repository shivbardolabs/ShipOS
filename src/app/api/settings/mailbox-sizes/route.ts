/**
 * BAR-424: Mailbox sizes API
 *
 * GET  /api/settings/mailbox-sizes — list all sizes with their ranges
 * POST /api/settings/mailbox-sizes — create a new size (superadmin only)
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler, badRequest, forbidden } from '@/lib/api-utils';

/**
 * GET /api/settings/mailbox-sizes
 * Returns all sizes with nested ranges, ordered by sortOrder.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  const sizes = await prisma.mailboxSize.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      ranges: {
        orderBy: { rangeStart: 'asc' },
      },
    },
  });

  return NextResponse.json({ sizes });
});

/**
 * POST /api/settings/mailbox-sizes
 * Create a new mailbox size. Superadmin only.
 * Body: { name: string }
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Only Super-Admin users can create mailbox sizes');
  }

  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    badRequest('Size name is required');
  }

  // Get next sort order
  const maxSort = await prisma.mailboxSize.aggregate({ _max: { sortOrder: true } });
  const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

  const size = await prisma.mailboxSize.create({
    data: {
      name: name.trim(),
      sortOrder: nextSort,
    },
    include: {
      ranges: true,
    },
  });

  return NextResponse.json({ size }, { status: 201 });
});
