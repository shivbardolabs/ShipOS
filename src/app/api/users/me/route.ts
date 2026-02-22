import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';

/**
 * GET /api/users/me
 * Returns the current authenticated user with their tenant and role.
 * Auto-provisions a User + Tenant on first call.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json(user);
  } catch (err) {
    console.error('[GET /api/users/me]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
