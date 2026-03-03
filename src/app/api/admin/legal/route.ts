import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/admin/legal?type=terms|privacy
 *
 * Returns legal documents for the given type (all versions, most recent first).
 * Superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get('type');
    if (type && !['terms', 'privacy'].includes(type)) {
      return NextResponse.json(
        { error: 'Query param "type" must be "terms" or "privacy"' },
        { status: 400 }
      );
    }

    const where = type ? { type } : {};
    const docs = await prisma.legalDocument.findMany({
      where,
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });

    return NextResponse.json({ docs });
  } catch (err) {
    console.error('[GET /api/admin/legal]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});

/**
 * POST /api/admin/legal
 *
 * Create a new version of a legal document (terms or privacy).
 * Automatically deactivates previous versions of the same type.
 * Superadmin only.
 *
 * Body: { type: 'terms' | 'privacy', content: string }
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { type, content } = await request.json();
    if (!type || !['terms', 'privacy'].includes(type)) {
      return NextResponse.json({ error: '"type" must be "terms" or "privacy"' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: '"content" is required' }, { status: 400 });
    }

    // Find the current highest version for this type
    const latest = await prisma.legalDocument.findFirst({
      where: { type },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    // Deactivate all previous versions, then create the new one
    await prisma.$transaction([
      prisma.legalDocument.updateMany({
        where: { type, isActive: true },
        data: { isActive: false },
      }),
      prisma.legalDocument.create({
        data: {
          type,
          content: content.trim(),
          version: nextVersion,
          publishedBy: user.id,
          isActive: true,
        },
      }),
    ]);

    // Re-fetch the newly created doc
    const doc = await prisma.legalDocument.findFirst({
      where: { type, version: nextVersion },
    });

    return NextResponse.json({ doc }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/legal]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
