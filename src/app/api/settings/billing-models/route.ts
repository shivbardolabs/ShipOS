import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const UpdateConfigSchema = z.object({
  subscriptionEnabled: z.boolean().optional(),
  usageBasedEnabled: z.boolean().optional(),
  timeOfServiceEnabled: z.boolean().optional(),
  defaultBillingCycle: z.string().optional(),
  allowMidCycleChanges: z.boolean().optional(),
  prorateUpgrades: z.boolean().optional(),
  prorateDowngrades: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
  usageResetCycle: z.string().optional(),
  usageAlertThreshold: z.number().optional(),
  overage: z.string().optional(),
  usageInvoiceCycle: z.string().optional(),
  tosDefaultMode: z.string().optional(),
  tosPaymentWindow: z.number().int().optional(),
  tosAutoInvoice: z.boolean().optional(),
});

const MeterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  unit: z.string().optional(),
  description: z.string().nullable().optional(),
  rateTiers: z.array(z.record(z.unknown())).optional(),
  includedQuantity: z.number().int().optional(),
  hardLimit: z.number().int().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const MeterActionSchema = z.object({
  action: z.enum(['create_meter', 'update_meter', 'delete_meter']),
  meter: MeterSchema,
});

/**
 * GET /api/settings/billing-models
 *
 * Returns the tenant's billing model configuration.
 * Creates a default config if none exists.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (!user.tenantId) badRequest('No tenant found');

  let config = await prisma.billingModelConfig.findUnique({
    where: { tenantId: user.tenantId! },
  });

  // Auto-create default config if none exists
  if (!config) {
    config = await prisma.billingModelConfig.create({
      data: { tenantId: user.tenantId! },
    });
  }

  // Also fetch usage meters for this tenant
  const meters = await prisma.usageMeter.findMany({
    where: { tenantId: user.tenantId!, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return ok({
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
});

/**
 * PUT /api/settings/billing-models
 *
 * Updates the tenant's billing model configuration.
 * Admin or superadmin only.
 */
export const PUT = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    forbidden('Forbidden');
  }
  if (!user.tenantId) badRequest('No tenant found');

  const body = await validateBody(request, UpdateConfigSchema);

  const config = await prisma.billingModelConfig.upsert({
    where: { tenantId: user.tenantId! },
    create: {
      tenantId: user.tenantId!,
      ...pickConfigFields(body),
    },
    update: pickConfigFields(body),
  });

  return ok({ config });
});

/**
 * POST /api/settings/billing-models
 *
 * Create or update a usage meter for the tenant.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    forbidden('Forbidden');
  }
  if (!user.tenantId) badRequest('No tenant found');

  const { action, meter } = await validateBody(request, MeterActionSchema);

  if (action === 'create_meter' || action === 'update_meter') {
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
      return ok({ meter: updated });
    }

    const created = await prisma.usageMeter.create({
      data: {
        tenantId: user.tenantId!,
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
    return ok({ meter: created });
  }

  if (action === 'delete_meter' && meter?.id) {
    await prisma.usageMeter.update({
      where: { id: meter.id },
      data: { isActive: false },
    });
    return ok({ success: true });
  }

  badRequest('Invalid action');
});

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
