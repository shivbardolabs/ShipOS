import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validatePromoCode, normalizePromoCode } from '@/lib/pmb-billing/promo-codes';
import type { DiscountType, DiscountAppliesTo } from '@/lib/pmb-billing/promo-codes';

/**
 * GET /api/pmb/promo-codes
 * List promo codes or validate a specific code.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const code = req.nextUrl.searchParams.get('code');
    const customerId = req.nextUrl.searchParams.get('customerId');
    const tierSlug = req.nextUrl.searchParams.get('tierSlug');
    const billingCycle = req.nextUrl.searchParams.get('billingCycle') as 'monthly' | 'annual' | null;
    const price = req.nextUrl.searchParams.get('price');

    // Validate a specific code
    if (code) {
      const normalized = normalizePromoCode(code);
      const promo = await prisma.promoCode.findUnique({
        where: { tenantId_code: { tenantId: user.tenantId, code: normalized } },
        include: { _count: { select: { redemptions: true } } },
      });

      if (!promo) {
        return NextResponse.json({ valid: false, error: 'Promo code not found' });
      }

      const customerRedemptions = customerId
        ? await prisma.promoRedemption.count({
            where: { promoCodeId: promo.id, customerId },
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
          tierSlug: tierSlug ?? undefined,
          billingCycle: billingCycle ?? undefined,
          price: price ? parseFloat(price) : undefined,
        },
      );

      return NextResponse.json(result);
    }

    // List all promo codes (admin)
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const promoCodes = await prisma.promoCode.findMany({
      where: { tenantId: user.tenantId },
      include: { _count: { select: { redemptions: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      promoCodes: promoCodes.map((p) => ({
        ...p,
        applicableTierSlugs: p.applicableTierSlugs ? JSON.parse(p.applicableTierSlugs) : null,
        redemptionCount: p._count.redemptions,
      })),
    });
  } catch (err) {
    console.error('[GET /api/pmb/promo-codes]', err);
    return NextResponse.json({ error: 'Failed to fetch promo codes' }, { status: 500 });
  }
}

/**
 * POST /api/pmb/promo-codes
 * Create or update a promo code, or redeem one.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!user.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 400 });

    const body = await req.json();

    // If 'action' is 'redeem', process redemption
    if (body.action === 'redeem') {
      const { code, customerId, planTierId, billingCycle = 'monthly', discountAmount } = body;
      if (!code || !customerId) {
        return NextResponse.json({ error: 'code and customerId are required' }, { status: 400 });
      }

      const normalized = normalizePromoCode(code);
      const promo = await prisma.promoCode.findUnique({
        where: { tenantId_code: { tenantId: user.tenantId, code: normalized } },
      });

      if (!promo) {
        return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
      }

      // Calculate expiry for promo benefit
      const expiresAt = promo.discountType === 'free_months'
        ? new Date(Date.now() + promo.discountValue * 30 * 24 * 60 * 60 * 1000)
        : null;

      const redemption = await prisma.promoRedemption.create({
        data: {
          promoCodeId: promo.id,
          tenantId: user.tenantId,
          customerId,
          planTierId: planTierId ?? null,
          discountAmount: discountAmount ?? 0,
          billingCycle,
          expiresAt,
          status: 'active',
        },
      });

      return NextResponse.json({ redemption });
    }

    // Create/update promo code (admin only)
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      id, code, description, discountType, discountValue, discountAppliesTo,
      startsAt, expiresAt, maxRedemptions, maxPerCustomer, applicableTierSlugs, isActive,
    } = body;

    if (!code || !discountType) {
      return NextResponse.json({ error: 'code and discountType are required' }, { status: 400 });
    }

    const normalized = normalizePromoCode(code);
    const data = {
      tenantId: user.tenantId,
      code: normalized,
      description: description ?? null,
      discountType,
      discountValue: discountValue ?? 0,
      discountAppliesTo: discountAppliesTo ?? 'all',
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxRedemptions: maxRedemptions ?? 0,
      maxPerCustomer: maxPerCustomer ?? 1,
      applicableTierSlugs: applicableTierSlugs ? JSON.stringify(applicableTierSlugs) : null,
      isActive: isActive ?? true,
    };

    let promo;
    if (id) {
      promo = await prisma.promoCode.update({ where: { id }, data });
    } else {
      promo = await prisma.promoCode.create({ data });
    }

    return NextResponse.json({ promoCode: promo });
  } catch (err) {
    console.error('[POST /api/pmb/promo-codes]', err);
    return NextResponse.json({ error: 'Failed to save promo code' }, { status: 500 });
  }
}

/**
 * DELETE /api/pmb/promo-codes
 * Deactivate a promo code.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.promoCode.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/pmb/promo-codes]', err);
    return NextResponse.json({ error: 'Failed to delete promo code' }, { status: 500 });
  }
}
