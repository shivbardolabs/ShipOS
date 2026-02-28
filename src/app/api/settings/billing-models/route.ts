import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/billing-models
 *
 * Returns the tenant's billing model configuration.
 * Creates a default config if none exists.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    let config = await prisma.billingModelConfig.findUnique({
      where: { tenantId: user.tenantId },
    });

    // Auto-create default config if none exists
    if (!config) {
      config = await prisma.billingModelConfig.create({
        data: { tenantId: user.tenantId },
      });
    }

    // Also fetch usage meters for this tenant
    const meters = await prisma.usageMeter.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      config: {
        id: config.id,
        subscriptionEnabled: config.subscriptionEnabled,
        usageBasedEnabled: config.usageBasedEnabled,
        timeOfServiceEnabled: config.timeOfServiceEnabled,
        // Subscription settings
        defaultBillingCycle: config.defaultBillingCycle,
        allowMidCycleChanges: config.allowMidCycleChanges,
        prorateUpgrades: config.prorateUpgrades,
        prorateDowngrades: config.prorateDowngrades,
        autoRenew: config.autoRenew,
        gracePeriodDays: config.gracePeriodDays,
        // Usage settings
        usageResetCycle: config.usageResetCycle,
        usageAlertThreshold: config.usageAlertThreshold,
        overage: config.overage,
        usageInvoiceCycle: config.usageInvoiceCycle,
        // ToS settings
        tosDefaultMode: config.tosDefaultMode,
        tosPaymentWindow: config.tosPaymentWindow,
        tosAutoInvoice: config.tosAutoInvoice,
      },
      meters: meters.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        unit: m.unit,
        description: m.description,
        rateTiers: JSON.parse(m.rateTiers || '[]'),
        includedQuantity: m.includedQuantity,
        hardLimit: m.hardLimit,
        isActive: m.isActive,
        sortOrder: m.sortOrder,
      })),
    });
  } catch (err) {
    console.error('[GET /api/settings/billing-models]', err);
    return NextResponse.json({ error: 'Failed to fetch billing config' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/billing-models
 *
 * Updates the tenant's billing model configuration.
 * Admin or superadmin only.
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

    const config = await prisma.billingModelConfig.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        ...pickConfigFields(body),
      },
      update: pickConfigFields(body),
    });

    return NextResponse.json({ config });
  } catch (err) {
    console.error('[PUT /api/settings/billing-models]', err);
    return NextResponse.json({ error: 'Failed to update billing config' }, { status: 500 });
  }
}

/**
 * POST /api/settings/billing-models
 *
 * Create or update a usage meter for the tenant.
 */
export async function POST(req: NextRequest) {
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

    const { action, meter } = await req.json();

    if (action === 'create_meter' || action === 'update_meter') {
      if (!meter?.name || !meter?.slug) {
        return NextResponse.json({ error: 'Meter name and slug are required' }, { status: 400 });
      }

      const rateTiers = meter.rateTiers
        ? JSON.stringify(meter.rateTiers)
        : '[]';

      if (action === 'update_meter' && meter.id) {
        const updated = await prisma.usageMeter.update({
          where: { id: meter.id },
          data: {
            name: meter.name,
            slug: meter.slug,
            unit: meter.unit || 'unit',
            description: meter.description || null,
            rateTiers,
            includedQuantity: meter.includedQuantity ?? 0,
            hardLimit: meter.hardLimit ?? 0,
            isActive: meter.isActive ?? true,
            sortOrder: meter.sortOrder ?? 0,
          },
        });
        return NextResponse.json({ meter: updated });
      }

      const created = await prisma.usageMeter.create({
        data: {
          tenantId: user.tenantId,
          name: meter.name,
          slug: meter.slug,
          unit: meter.unit || 'unit',
          description: meter.description || null,
          rateTiers,
          includedQuantity: meter.includedQuantity ?? 0,
          hardLimit: meter.hardLimit ?? 0,
          sortOrder: meter.sortOrder ?? 0,
        },
      });
      return NextResponse.json({ meter: created });
    }

    if (action === 'delete_meter' && meter?.id) {
      await prisma.usageMeter.update({
        where: { id: meter.id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/settings/billing-models]', err);
    return NextResponse.json({ error: 'Failed to manage meter' }, { status: 500 });
  }
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function pickConfigFields(body: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  const allowed = [
    'subscriptionEnabled',
    'usageBasedEnabled',
    'timeOfServiceEnabled',
    'defaultBillingCycle',
    'allowMidCycleChanges',
    'prorateUpgrades',
    'prorateDowngrades',
    'autoRenew',
    'gracePeriodDays',
    'usageResetCycle',
    'usageAlertThreshold',
    'overage',
    'usageInvoiceCycle',
    'tosDefaultMode',
    'tosPaymentWindow',
    'tosAutoInvoice',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields[key] = body[key];
    }
  }
  return fields;
}
