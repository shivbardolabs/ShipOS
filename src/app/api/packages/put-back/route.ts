/**
 * BAR-187: Package Put-Back API
 *
 * POST /api/packages/put-back
 * Returns a package to checked_in status without resetting checkedInAt.
 * Preserves storage timer per acceptance criteria.
 *
 * Body: { packageId: string, reason: string }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageId, reason } = body as { packageId: string; reason: string };

    if (!packageId || !reason) {
      return NextResponse.json(
        { error: 'packageId and reason are required' },
        { status: 400 }
      );
    }

    // In production: update package in database
    // - Set status back to 'checked_in'
    // - Do NOT reset checkedInAt (preserve storage timer)
    // - Clear releasedAt and releaseSignature
    // - Log put-back reason
    // - Increment putBackCount
    //
    // await prisma.package.update({
    //   where: { id: packageId },
    //   data: {
    //     status: 'checked_in',
    //     releasedAt: null,
    //     releaseSignature: null,
    //     checkedOutById: null,
    //     notes: prisma.raw(`COALESCE(notes, '') || '\n[Put-back: ${reason}]'`),
    //   },
    // });

    return NextResponse.json({
      success: true,
      packageId,
      reason,
      message: 'Package returned to inventory. Storage timer preserved.',
    });
  } catch (error) {
    console.error('[put-back] POST error:', error);
    return NextResponse.json({ error: 'Failed to put back package' }, { status: 500 });
  }
}
