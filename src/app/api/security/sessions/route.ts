import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * GET /api/security/sessions
 * Returns active login sessions for the current user.
 */
export const GET = withApiHandler(async (request, { user }) => {
  try {

    const sessions = await prisma.loginSession.findMany({
      where: { userId: user.id },
      orderBy: { loginAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        success: s.success,
        failureReason: s.failureReason,
        loginAt: s.loginAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[GET /api/security/sessions]', err);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
});
