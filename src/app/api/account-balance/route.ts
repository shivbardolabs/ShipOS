import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import {
  getAccountBalance,
  getOutstandingBalances,
} from '@/lib/tos-billing-service';

/**
 * GET /api/account-balance
 *
 * Get account balance(s).
 *   - ?customerId=xxx → single customer balance
 *   - no customerId → all customers with outstanding balances
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (customerId) {
      const balance = await getAccountBalance(customerId);
      if (!balance) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      return NextResponse.json({ balance });
    }

    const balances = await getOutstandingBalances(user.tenantId);
    const totalOutstanding = balances.reduce((sum, b) => sum + b.accountBalance, 0);

    return NextResponse.json({
      balances,
      total: balances.length,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    });
  } catch (err) {
    console.error('[GET /api/account-balance]', err);
    return NextResponse.json(
      { error: 'Failed to fetch balances', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
