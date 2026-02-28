import { NextRequest, NextResponse } from 'next/server';
import { generateDailyStorageCharges } from '@/lib/charge-event-service';

/**
 * POST /api/cron/storage-fees
 *
 * BAR-308: Daily cron job that generates storage charge events for packages
 * held beyond their free storage period.
 *
 * Can be called:
 *   - By Vercel Cron (with CRON_SECRET header)
 *   - Manually by superadmin for a specific tenant (?tenantId=xxx)
 *
 * Idempotent: skips packages that already have a storage charge for today.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or allow manual trigger in dev
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || undefined;

    const result = await generateDailyStorageCharges(tenantId);

    return NextResponse.json({
      success: true,
      chargesCreated: result.chargesCreated,
      errors: result.errors,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[POST /api/cron/storage-fees]', err);
    return NextResponse.json(
      { error: 'Storage fee cron failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
