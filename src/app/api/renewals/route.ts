import { withApiHandler, ok, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/renewals
 * Returns the renewal pipeline — customers with approaching or past-due renewals.
 * Status is computed dynamically from renewalDate relative to today.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const customers = await prisma.customer.findMany({
    where: { tenantId: user.tenantId, status: 'active', deletedAt: null, renewalDate: { not: null } },
    orderBy: { renewalDate: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      pmbNumber: true,
      email: true,
      renewalDate: true,
      renewalReminderSent: true,
      planTierId: true,
      billingCycle: true,
    },
  });

  const now = new Date();

  const pipeline = customers.map((c) => {
    const renewalDate = new Date(c.renewalDate!);
    const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'overdue' | 'due_this_week' | 'due_this_month' | 'upcoming';
    if (daysUntil < 0) status = 'overdue';
    else if (daysUntil <= 7) status = 'due_this_week';
    else if (daysUntil <= 30) status = 'due_this_month';
    else status = 'upcoming';

    return {
      ...c,
      renewalDate: renewalDate.toISOString(),
      daysUntilRenewal: daysUntil,
      status,
    };
  });

  // Group counts
  const summary = {
    overdue: pipeline.filter((p) => p.status === 'overdue').length,
    dueThisWeek: pipeline.filter((p) => p.status === 'due_this_week').length,
    dueThisMonth: pipeline.filter((p) => p.status === 'due_this_month').length,
    upcoming: pipeline.filter((p) => p.status === 'upcoming').length,
    total: pipeline.length,
  };

  return ok({ pipeline, summary });
});
