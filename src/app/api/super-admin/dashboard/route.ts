import { NextResponse } from 'next/server';

/**
 * GET /api/super-admin/dashboard
 * Returns summary metrics for the super admin dashboard.
 * In production, this would query Prisma for real tenant/store/billing data.
 */
export async function GET() {
  // TODO: Replace with real DB queries (Prisma) once auth & middleware are wired up
  const summary = {
    totalClients: 24,
    activeClients: 18,
    inactiveClients: 6,
    totalStores: 67,
    activeStores: 52,
    inactiveStores: 15,
    totalMRR: 6500.0,
    overduePayments: 3,
    pendingPayments: 2,
    totalSuperAdmins: 4,
    activeSuperAdmins: 3,
  };

  return NextResponse.json(summary);
}
