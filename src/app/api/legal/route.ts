import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/legal?type=terms|privacy
 *
 * Public endpoint — returns the current active legal document for the given type.
 * No authentication required so public /terms and /privacy pages can load content.
 */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    if (!type || !['terms', 'privacy'].includes(type)) {
      return NextResponse.json(
        { error: 'Query param "type" must be "terms" or "privacy"' },
        { status: 400 }
      );
    }

    const doc = await prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        type: true,
        content: true,
        version: true,
        publishedAt: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ doc: null });
    }

    return NextResponse.json({ doc });
  } catch (err) {
    console.error('[GET /api/legal]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
