import { NextResponse } from 'next/server';
import { withApiHandler, ok } from '@/lib/api-utils';
import { recordLogin } from '@/lib/auth';

/**
 * GET /api/users/me
 * Returns the current authenticated user with their tenant and role.
 * Auto-provisions a User + Tenant on first call.
 * Records a login session for tracking.
 *
 * Uses skipTenantCheck so the UI can load user data regardless of tenant
 * status — TenantStatusGate needs the user object to display the correct
 * status screen (BAR-399).
 *
 * Blocks access for inactive/suspended users by returning a 403
 * with a descriptive error message.
 */
export const GET = withApiHandler(async (_request, { user }) => {
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

  return ok(user);
}, { skipTenantCheck: true });
