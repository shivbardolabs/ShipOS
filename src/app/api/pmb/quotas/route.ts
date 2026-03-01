import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { getCurrentPeriod, buildQuotaSnapshot } from '@/lib/pmb-billing/quotas';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetQuotasQuerySchema = z.object({
  customerId: z.string().optional(),
  period: z.string().optional(),
});

const RecordQuotaBodySchema = z.object({
  customerId: z.string().min(1),
  service: z.enum(['mailItems', 'scans', 'storageDays', 'forwarding', 'shredding', 'packages']),
  quantity: z.number().int().min(1).default(1),
});

/**
 * GET /api/pmb/quotas?customerId=...
 * Get quota usage for a customer in the current billing period.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const query = validateQuery(request, GetQuotasQuerySchema);
  const period = query.period ?? getCurrentPeriod();

  if (query.customerId) {
    // Single customer quota
    const usage = await prisma.pmbQuotaUsage.findUnique({
      where: {
        tenantId_customerId_period: {
          tenantId: user.tenantId,
          customerId: query.customerId,
          period,
        },
      },
    });

    if (!usage) {
      return ok({ quota: null, period });
    }

    const snapshot = buildQuotaSnapshot(usage);
    return ok({ quota: snapshot });
  }

  // All customers for the period
  const usages = await prisma.pmbQuotaUsage.findMany({
    where: { tenantId: user.tenantId, period },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const snapshots = usages.map(buildQuotaSnapshot);
  return ok({ quotas: snapshots, period });
});

/**
 * POST /api/pmb/quotas
 * Record quota consumption (increment usage counters).
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, RecordQuotaBodySchema);
  const period = getCurrentPeriod();
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Map service type to field
  const fieldMap: Record<string, string> = {
    mailItems: 'mailItemsUsed',
    scans: 'scansUsed',
    storageDays: 'storageDaysUsed',
    forwarding: 'forwardingUsed',
    shredding: 'shreddingUsed',
    packages: 'packagesReceived',
  };

  const field = fieldMap[body.service];

  // Upsert quota usage
  const usage = await prisma.pmbQuotaUsage.upsert({
    where: {
      tenantId_customerId_period: {
        tenantId: user.tenantId,
        customerId: body.customerId,
        period,
      },
    },
    create: {
      tenantId: user.tenantId,
      customerId: body.customerId,
      period,
      periodStart,
      periodEnd,
      [field]: body.quantity,
    },
    update: {
      [field]: { increment: body.quantity },
    },
  });

  return ok({ usage });
});
