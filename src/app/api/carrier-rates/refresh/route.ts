import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-utils';

/**
 * POST /api/carrier-rates/refresh
 * Triggers a refresh of carrier rates from upstream providers.
 * Currently a stub — returns success to allow the UI to re-fetch.
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // TODO: Integrate with carrier APIs to fetch latest wholesale rates
    // For now, this is a no-op that lets the UI reload the current rates.

    return NextResponse.json({ success: true, message: 'Rates refreshed' });
  } catch (err) {
    console.error('[POST /api/carrier-rates/refresh]', err);
    return NextResponse.json({ error: 'Failed to refresh rates' }, { status: 500 });
  }
});
