import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/payment-methods
 *
 * List payment methods. Filter by customerId.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Validate customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: { id: true, firstName: true, lastName: true, pmbNumber: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { customerId, tenantId: user.tenantId, status: { not: 'removed' } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ paymentMethods: methods, customer });
  } catch (err) {
    console.error('[GET /api/payment-methods]', err);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/payment-methods
 *
 * Add a new payment method for a customer.
 *
 * Body:
 *   - customerId: string (required)
 *   - type: 'card' | 'ach' | 'paypal' (required)
 *   - label: string (required) — e.g. "Visa ****4242"
 *   - isDefault?: boolean
 *   - cardBrand?: string
 *   - cardLast4?: string
 *   - cardExpMonth?: number
 *   - cardExpYear?: number
 *   - bankName?: string
 *   - accountLast4?: string
 *   - routingLast4?: string
 *   - paypalEmail?: string
 *   - externalId?: string
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { customerId, type, label, isDefault, ...rest } = body;

    if (!customerId || !type || !label) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, type, label' },
        { status: 400 },
      );
    }

    const validTypes = ['card', 'ach', 'paypal'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate customer
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first method — auto-set as default
    const existingCount = await prisma.paymentMethod.count({
      where: { customerId, status: 'active' },
    });
    const shouldBeDefault = isDefault || existingCount === 0;

    const method = await prisma.paymentMethod.create({
      data: {
        tenantId: user.tenantId,
        customerId,
        type,
        label,
        isDefault: shouldBeDefault,
        status: 'active',
        verifiedAt: new Date(),
        cardBrand: rest.cardBrand || null,
        cardLast4: rest.cardLast4 || null,
        cardExpMonth: rest.cardExpMonth || null,
        cardExpYear: rest.cardExpYear || null,
        bankName: rest.bankName || null,
        accountLast4: rest.accountLast4 || null,
        routingLast4: rest.routingLast4 || null,
        paypalEmail: rest.paypalEmail || null,
        externalId: rest.externalId || null,
      },
    });

    return NextResponse.json({ paymentMethod: method }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/payment-methods]', err);
    return NextResponse.json(
      { error: 'Failed to add payment method', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
