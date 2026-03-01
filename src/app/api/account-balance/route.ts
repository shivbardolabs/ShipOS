import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, ok, notFound } from '@/lib/api-utils';
import {
  getAccountBalance,
  getOutstandingBalances,
} from '@/lib/tos-billing-service';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const GetBalanceQuerySchema = z.object({
  customerId: z.string().optional(),
});

/**
 * GET /api/account-balance
 *
 * Get account balance(s).
 *   - ?customerId=xxx → single customer balance
 *   - no customerId → all customers with outstanding balances
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetBalanceQuerySchema);

  if (query.customerId) {
    const balance = await getAccountBalance(query.customerId);
    if (!balance) return notFound('Customer not found');
    return ok({ balance });
  }

  const balances = await getOutstandingBalances(user.tenantId!);
  const totalOutstanding = balances.reduce((sum, b) => sum + b.accountBalance, 0);

  return ok({
    balances,
    total: balances.length,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
  });
});
