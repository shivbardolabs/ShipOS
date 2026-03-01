import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, badRequest, notFound } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ────────────────────────────────────────────────────────────────── */

const GetQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  customerId: z.string().optional(),
});

const PostBodySchema = z.object({
  meterSlug: z.string().min(1, 'meterSlug is required'),
  quantity: z.number().min(0).default(1),
  customerId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/billing/usage
 *
 * Returns usage summary for the current period.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const query = validateQuery(request, GetQuerySchema);
  const now = new Date();
  const period =
    query.period ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get all active meters for this tenant
  const meters = await prisma.usageMeter.findMany({
    where: { tenantId: user.tenantId!, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // Aggregate usage per meter
  const usageSummary = await Promise.all(
    meters.map(async (meter) => {
      const where: Record<string, unknown> = {
        meterId: meter.id,
        tenantId: user.tenantId,
        period,
      };
      if (query.customerId) {
        where.customerId = query.customerId;
      }

      const records = await prisma.usageRecord.aggregate({
        where,
        _sum: { quantity: true, unitCost: true },
        _count: true,
      });

      const totalQuantity = records._sum.quantity ?? 0;
      const totalCost = records._sum.unitCost ?? 0;
      const rateTiers = JSON.parse(meter.rateTiers || '[]');

      return {
        meterId: meter.id,
        meterName: meter.name,
        meterSlug: meter.slug,
        unit: meter.unit,
        period,
        totalQuantity,
        totalCost: Math.round(totalCost * 100) / 100,
        includedQuantity: meter.includedQuantity,
        hardLimit: meter.hardLimit,
        recordCount: records._count,
        rateTiers,
        percentUsed:
          meter.hardLimit > 0
            ? Math.round((totalQuantity / meter.hardLimit) * 100)
            : meter.includedQuantity > 0
              ? Math.round((totalQuantity / meter.includedQuantity) * 100)
              : 0,
      };
    }),
  );

  return ok({ period, usage: usageSummary });
});

/**
 * POST /api/billing/usage
 *
 * Record a usage event.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) {
    badRequest('No tenant found');
  }

  const body = await validateBody(request, PostBodySchema);
  const { meterSlug, quantity, customerId, metadata } = body;

  // Find the meter
  const meter = await prisma.usageMeter.findUnique({
    where: {
      tenantId_slug: {
        tenantId: user.tenantId!,
        slug: meterSlug,
      },
    },
  });

  if (!meter || !meter.isActive) {
    notFound('Meter not found or inactive');
  }

  // Determine the current period
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Check hard limit
  if (meter.hardLimit > 0) {
    const currentUsage = await prisma.usageRecord.aggregate({
      where: { meterId: meter.id, tenantId: user.tenantId!, period },
      _sum: { quantity: true },
    });
    const currentQty = currentUsage._sum.quantity ?? 0;

    // Check billing model config for overage behavior
    const config = await prisma.billingModelConfig.findUnique({
      where: { tenantId: user.tenantId! },
    });

    if (currentQty + quantity > meter.hardLimit) {
      if (config?.overage === 'block') {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            currentUsage: currentQty,
            limit: meter.hardLimit,
          },
          { status: 429 },
        );
      }
      // For 'charge' or 'alert_only', continue but track overage
    }
  }

  // Calculate unit cost based on rate tiers
  const unitCost = calculateTieredCost(meter, quantity);

  const record = await prisma.usageRecord.create({
    data: {
      meterId: meter.id,
      tenantId: user.tenantId!,
      customerId: customerId || null,
      quantity,
      unitCost,
      metadata: metadata ? JSON.stringify(metadata) : null,
      period,
    },
  });

  return ok({
    record: {
      id: record.id,
      quantity: record.quantity,
      unitCost: record.unitCost,
      period: record.period,
    },
  });
});

/* ── Helpers ────────────────────────────────────────────────────────────────── */

interface RateTier {
  upTo: number | null;
  rate: number;
}

function calculateTieredCost(
  meter: { rateTiers: string; includedQuantity: number },
  quantity: number,
): number {
  const tiers: RateTier[] = JSON.parse(meter.rateTiers || '[]');
  if (tiers.length === 0) return 0;

  let remaining = quantity;
  let cost = 0;
  let prevCeiling = 0;

  for (const tier of tiers) {
    if (remaining <= 0) break;

    const ceiling = tier.upTo ?? Infinity;
    const tierCapacity = ceiling - prevCeiling;
    const usedInTier = Math.min(remaining, tierCapacity);

    cost += usedInTier * tier.rate;
    remaining -= usedInTier;
    prevCeiling = ceiling;
  }

  return Math.round(cost * 100) / 100;
}
