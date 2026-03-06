/**
 * BAR-424: Individual mailbox size operations
 *
 * PUT    /api/settings/mailbox-sizes/[id] — update name or active status
 * DELETE /api/settings/mailbox-sizes/[id] — delete size (blocked if active mailboxes exist)
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler, badRequest, forbidden, notFound } from '@/lib/api-utils';
import { getActiveMailboxesForSize } from '@/lib/mailbox-helpers';

/**
 * PUT /api/settings/mailbox-sizes/[id]
 * Update size name or active status. Superadmin only.
 * Body: { name?: string, isActive?: boolean }
 *
 * When disabling (isActive → false), checks for active mailboxes first.
 */
export const PUT = withApiHandler(async (request, { user, params }) => {
  if (user.role !== 'superadmin') {
    forbidden('Only Super-Admin users can edit mailbox sizes');
  }

  const id = params.id;
  const existing = await prisma.mailboxSize.findUnique({
    where: { id },
    include: { ranges: true },
  });

  if (!existing) {
    notFound('Mailbox size not found');
  }

  const body = await request.json();
  const { name, isActive } = body as { name?: string; isActive?: boolean };

  // If disabling, check for active mailboxes
  if (isActive === false && existing.isActive) {
    const activeMailboxes = await getActiveMailboxesForSize(id);
    if (activeMailboxes.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot disable size with active mailboxes',
          activeMailboxes,
          message: `${activeMailboxes.length} active mailbox(es) must be individually closed before disabling this size.`,
        },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.mailboxSize.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: { ranges: { orderBy: { rangeStart: 'asc' } } },
  });

  return NextResponse.json({ size: updated });
});

/**
 * DELETE /api/settings/mailbox-sizes/[id]
 * Delete a size and all its ranges. Superadmin only.
 * Blocked if any active mailboxes exist in any of the size's ranges.
 */
export const DELETE = withApiHandler(async (_request, { user, params }) => {
  if (user.role !== 'superadmin') {
    forbidden('Only Super-Admin users can delete mailbox sizes');
  }

  const id = params.id;
  const existing = await prisma.mailboxSize.findUnique({
    where: { id },
    include: { ranges: true },
  });

  if (!existing) {
    notFound('Mailbox size not found');
  }

  // Check for active mailboxes across all ranges in this size
  const activeMailboxes = await getActiveMailboxesForSize(id);
  if (activeMailboxes.length > 0) {
    return NextResponse.json(
      {
        error: 'Cannot delete size with active mailboxes',
        activeMailboxes,
        message: `${activeMailboxes.length} active mailbox(es) must be individually closed before deleting this size.`,
      },
      { status: 409 },
    );
  }

  // Delete ranges first, then size
  await prisma.mailboxRange.deleteMany({ where: { sizeId: id } });
  await prisma.mailboxSize.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
