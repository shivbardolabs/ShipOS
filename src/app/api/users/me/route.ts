import { NextResponse } from 'next/server';
import { getOrProvisionUser, recordLogin } from '@/lib/auth';

/**
 * GET /api/users/me
 * Returns the current authenticated user with their tenant and role.
 * Auto-provisions a User + Tenant on first call.
 * Records a login session for tracking.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Record login session (non-blocking, best-effort)
    recordLogin(user.id).catch(() => {});

    return NextResponse.json(user);
  } catch (err) {
    console.error('[GET /api/users/me]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
