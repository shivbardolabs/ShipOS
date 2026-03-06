import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { validatePromoCode, normalizePromoCode } from '@/lib/pmb-billing/promo-codes';
import type { DiscountType, DiscountAppliesTo } from '@/lib/pmb-billing/promo-codes';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetPromoQuerySchema = z.object({
  code: z.string().optional(),
  customerId: z.string().optional(),
  tierSlug: z.string().optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
  price: z.coerce.number().optional(),
});

const PromoCodeBodySchema = z.object({
  // For redeem action
  action: z.enum(['redeem', 'create']).optional(),
  code: z.string().min(1),
  customerId: z.string().optional(),
  planTierId: z.string().optional(),
  billingCycle: z.enum(['monthly', 'annual']).optional().default('monthly'),
  discountAmount: z.number().optional(),
  // For create/update
  id: z.string().optional(),
  description: z.string().optional(),
  discountType: z.string().optional(),
  discountValue: z.number().optional(),
  discountAppliesTo: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  maxRedemptions: z.number().optional(),
  maxPerCustomer: z.number().optional(),
  applicableTierSlugs: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const DeletePromoBodySchema = z.object({
  id: z.string().min(1),
});

/**
 * GET /api/pmb/promo-codes
 * List promo codes or validate a specific code.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const query = validateQuery(request, GetPromoQuerySchema);

  // Validate a specific code
  if (query.code) {
    const normalized = normalizePromoCode(query.code);
    const promo = await prisma.promoCode.findUnique({
      where: { tenantId_code: { tenantId: user.tenantId, code: normalized } },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!promo) {
      return ok({ valid: false, error: 'Promo code not found' });
    }

    const customerRedemptions = query.customerId
      ? await prisma.promoRedemption.count({
          where: { promoCodeId: promo.id, customerId: query.customerId },
        })
      : 0;

    const result = validatePromoCode(
      {
        code: promo.code,
        discountType: promo.discountType as DiscountType,
        discountValue: promo.discountValue,
        discountAppliesTo: promo.discountAppliesTo as DiscountAppliesTo,
        startsAt: promo.startsAt,
        expiresAt: promo.expiresAt,
        maxRedemptions: promo.maxRedemptions,
        maxPerCustomer: promo.maxPerCustomer,
        applicableTierSlugs: promo.applicableTierSlugs ? JSON.parse(promo.applicableTierSlugs) : null,
        isActive: promo.isActive,
      },
      {
        totalRedemptions: promo._count.redemptions,
        customerRedemptions,
        tierSlug: query.tierSlug ?? undefined,
        billingCycle: query.billingCycle ?? undefined,
        price: query.price ?? undefined,
      },
    );

    return ok(result);
  }

  // List all promo codes (admin)
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return forbidden('Forbidden');
  }

  const promoCodes = await prisma.promoCode.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return ok({
    promoCodes: promoCodes.map((p) => ({
      ...p,
      applicableTierSlugs: p.applicableTierSlugs ? JSON.parse(p.applicableTierSlugs) : null,
      redemptionCount: p._count.redemptions,
    })),
  });
});

/**
 * POST /api/pmb/promo-codes
 * Create or update a promo code, or redeem one.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, PromoCodeBodySchema);

  // If 'action' is 'redeem', process redemption
  if (body.action === 'redeem') {
    if (!body.customerId) {
      return badRequest('customerId is required for redemption');
    }

    const normalized = normalizePromoCode(body.code);
    const promo = await prisma.promoCode.findUnique({
      where: { tenantId_code: { tenantId: user.tenantId, code: normalized } },
    });

    if (!promo) return notFound('Promo code not found');

    // Calculate expiry for promo benefit
    const expiresAt = promo.discountType === 'free_months'
      ? new Date(Date.now() + promo.discountValue * 30 * 24 * 60 * 60 * 1000)
      : null;

    const redemption = await prisma.promoRedemption.create({
      data: {
        promoCodeId: promo.id,
        tenantId: user.tenantId,
        customerId: body.customerId,
        planTierId: body.planTierId ?? null,
        discountAmount: body.discountAmount ?? 0,
        billingCycle: body.billingCycle,
        expiresAt,
        status: 'active',
      },
    });

    return created({ redemption });
  }

  // Create/update promo code (admin only)
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return forbidden('Forbidden');
  }

  if (!body.discountType) {
    return badRequest('discountType is required');
  }

  const normalized = normalizePromoCode(body.code);
  const data = {
    tenantId: user.tenantId,
    code: normalized,
    description: body.description ?? null,
    discountType: body.discountType,
    discountValue: body.discountValue ?? 0,
    discountAppliesTo: body.discountAppliesTo ?? 'all',
    startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    maxRedemptions: body.maxRedemptions ?? 0,
    maxPerCustomer: body.maxPerCustomer ?? 1,
    applicableTierSlugs: body.applicableTierSlugs ? JSON.stringify(body.applicableTierSlugs) : null,
    isActive: body.isActive ?? true,
  };

  let promo;
  if (body.id) {
    promo = await prisma.promoCode.update({ where: { id: body.id }, data });
  } else {
    promo = await prisma.promoCode.create({ data });
  }

  return ok({ promoCode: promo });
});

/**
 * DELETE /api/pmb/promo-codes
 * Deactivate a promo code.
 */
export const DELETE = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return forbidden('Forbidden');
  }

  const body = await validateBody(request, DeletePromoBodySchema);

  await prisma.promoCode.update({
    where: { id: body.id },
    data: { isActive: false },
  });

  return ok({ success: true });
});
