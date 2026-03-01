import { withApiHandler, ok, unauthorized, validateQuery } from '@/lib/api-utils';
import { z } from 'zod';
import { generateDailyStorageCharges } from '@/lib/charge-event-service';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const QuerySchema = z.object({
  tenantId: z.string().optional(),
});

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
export const POST = withApiHandler(async (request) => {
  // Verify cron secret or allow manual trigger in dev
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    unauthorized('Unauthorized');
  }

  const query = validateQuery(request, QuerySchema);
  const tenantId = query.tenantId || undefined;

  const result = await generateDailyStorageCharges(tenantId);

  return ok({
    success: true,
    chargesCreated: result.chargesCreated,
    errors: result.errors,
    processedAt: new Date().toISOString(),
  });
}, { public: true });
