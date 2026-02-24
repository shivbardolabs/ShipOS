import { NextResponse } from 'next/server';
import { getOrProvisionUser, recordLogin } from '@/lib/auth';

/**
 * GET /api/users/me
 * Returns the current authenticated user with their tenant and role.
 * Auto-provisions a User + Tenant on first call.
 * Records a login session for tracking.
 *
 * Blocks access for inactive/suspended users by returning a 403
 * with a descriptive error message.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Block inactive or suspended users from logging in
    if (user.status === 'inactive' || user.status === 'suspended') {
      return NextResponse.json(
        {
          error: 'Account disabled',
          message:
            user.status === 'suspended'
              ? 'Your account has been suspended. Contact your administrator.'
              : 'Your account has been deactivated. Contact your administrator.',
          status: user.status,
        },
        { status: 403 }
      );
    }

    // Record login session (non-blocking, best-effort)
    recordLogin(user.id).catch(() => {});

    return NextResponse.json(user);
  } catch (err) {
    console.error('[GET /api/users/me]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
