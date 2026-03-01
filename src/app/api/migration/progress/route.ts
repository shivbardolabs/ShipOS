import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, ok, badRequest } from '@/lib/api-utils';
import { getMigrationProgress } from '@/lib/migration/engine';
import { z } from 'zod';

const ProgressQuerySchema = z.object({
  id: z.string().min(1, 'Migration run id is required'),
});

/**
 * GET /api/migration/progress?id=...
 * Returns progress for a migration run.
 *
 * SECURITY FIX: Now requires authentication.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const query = validateQuery(request, ProgressQuerySchema);

  const progress = await getMigrationProgress(query.id);
  if (!progress) return badRequest('Migration run not found');

  return ok({ progress });
});
