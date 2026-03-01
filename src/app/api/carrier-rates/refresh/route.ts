import { withApiHandler, ok, forbidden } from '@/lib/api-utils';

/**
 * POST /api/carrier-rates/refresh
 * Refresh carrier rates from upstream APIs.
 * Stub — implementation pending.
 */
export const POST = withApiHandler(async (_request, { user }) => {
  if (!['admin', 'manager', 'superadmin'].includes(user.role)) {
    return forbidden('Admin or manager role required');
  }

  // TODO: Implement rate refresh from carrier APIs
  return ok({
    message: 'Rate refresh not yet implemented',
    tenantId: user.tenantId,
  });
});
