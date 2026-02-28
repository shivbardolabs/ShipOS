import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/customer-profile?customerId=xxx
 *
 * Returns the billing profile for a specific customer.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Verify customer belongs to this tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    let profile = await prisma.customerBillingProfile.findUnique({
      where: { customerId },
    });

    // Get tenant billing config for defaults
    const tenantConfig = await prisma.billingModelConfig.findUnique({
      where: { tenantId: user.tenantId },
    });

    // Get any outstanding ToS charges
    const tosCharges = await prisma.tosCharge.findMany({
      where: { customerId, status: { in: ['pending', 'invoiced'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const outstandingBalance = tosCharges
      .filter((c) => c.status === 'pending' || c.status === 'invoiced')
      .reduce((sum, c) => sum + c.total, 0);

    return NextResponse.json({
      profile: profile
        ? {
            id: profile.id,
            customerId: profile.customerId,
            billingModel: profile.billingModel,
            customPlanId: profile.customPlanId,
            customRate: profile.customRate,
            billingCycle: profile.billingCycle,
            customUsageCap: profile.customUsageCap,
            usageDiscount: profile.usageDiscount,
            tosMode: profile.tosMode,
            creditLimit: profile.creditLimit,
            accountBalance: profile.accountBalance,
            paymentTermDays: profile.paymentTermDays,
            autoPayEnabled: profile.autoPayEnabled,
            autoPayDay: profile.autoPayDay,
            notes: profile.notes,
          }
        : null,
      tenantConfig: tenantConfig
        ? {
            subscriptionEnabled: tenantConfig.subscriptionEnabled,
            usageBasedEnabled: tenantConfig.usageBasedEnabled,
            timeOfServiceEnabled: tenantConfig.timeOfServiceEnabled,
            tosDefaultMode: tenantConfig.tosDefaultMode,
          }
        : null,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      recentCharges: tosCharges.map((c) => ({
        id: c.id,
        description: c.description,
        amount: c.amount,
        tax: c.tax,
        total: c.total,
        status: c.status,
        mode: c.mode,
        createdAt: c.createdAt.toISOString(),
        paidAt: c.paidAt?.toISOString() ?? null,
        dueDate: c.dueDate?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error('[GET /api/billing/customer-profile]', err);
    return NextResponse.json(
      { error: 'Failed to fetch customer billing profile' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/billing/customer-profile
 *
 * Create or update a customer's billing profile.
 * Body: { customerId, billingModel, ... }
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await req.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Verify customer belongs to this tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const data = pickProfileFields(body);

    const profile = await prisma.customerBillingProfile.upsert({
      where: { customerId },
      create: { customerId, ...data },
      update: data,
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[PUT /api/billing/customer-profile]', err);
    return NextResponse.json(
      { error: 'Failed to update customer billing profile' },
      { status: 500 },
    );
  }
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function pickProfileFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const allowed = [
    'billingModel',
    'customPlanId',
    'customRate',
    'billingCycle',
    'customUsageCap',
    'usageDiscount',
    'tosMode',
    'creditLimit',
    'accountBalance',
    'paymentTermDays',
    'autoPayEnabled',
    'autoPayDay',
    'notes',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields[key] = body[key];
    }
  }
  return fields;
}
