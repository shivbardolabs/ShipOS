import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, badRequest } from '@/lib/api-utils';
import { z } from 'zod';

const RollbackBodySchema = z.object({
  migrationId: z.string().min(1),
});

/**
 * POST /api/migration/rollback
 * Rollback a migration run.
 *
 * SECURITY FIX: Now requires authentication.
 * NOTE: Production rollback logic is currently stubbed.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await validateBody(request, RollbackBodySchema);

  // TODO: Implement production rollback logic
  // The actual rollback would:
  // 1. Look up the MigrationRun by id
  // 2. Find all records created during that run
  // 3. Delete or revert them
  // 4. Update the MigrationRun status to 'rolled_back'

  return ok({
    migrationId: body.migrationId,
    status: 'rollback_not_implemented',
    message: 'Migration rollback is not yet implemented in production.',
  });
});
