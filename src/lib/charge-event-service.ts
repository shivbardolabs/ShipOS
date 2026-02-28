/**
 * BAR-308: Service-Based Automatic Charge Event Generation
 *
 * Core service that auto-generates ChargeEvent records when service actions
 * occur (package check-in, storage, checkout, shipping, mail scanning, etc.).
 *
 * Pricing resolution order:
 *   1. Customer-level override (action_price_overrides where target_type='customer')
 *   2. Segment-level override (action_price_overrides where target_type='segment')
 *   3. Tenant action price (action_prices table)
 *   4. Tenant default settings (Tenant model fields: receivingFeeRate, storageRate, etc.)
 *
 * Integrates with:
 *   - ChargeEvent model (BAR-309)
 *   - BillingModelConfig / CustomerBillingProfile (BAR-305)
 *   - Action Pricing tables (raw Postgres)
 *   - TosCharge for time-of-service billing
 *   - UsageRecord for usage-based billing
 */

import prisma from './prisma';
import { ensureTables } from './action-pricing-db';
import { processChargeViaTos } from './tos-billing-service';
import type { ChargeServiceType } from '@prisma/client';

/* ── Types ─────────────────────────────────────────────────────────────────── */

/** Input for generating a charge event. */
export interface ChargeEventInput {
  tenantId: string;
  customerId: string;
  pmbNumber: string;
  serviceType: ChargeServiceType;
  description: string;
  quantity?: number;

  /** Reference to the entity that triggered this charge. */
  packageId?: string;
  shipmentId?: string;
  mailPieceId?: string;

  /** User who triggered the action (for audit trail). */
  createdById?: string;
  notes?: string;
}

/** Resolved pricing for a charge event. */
interface ResolvedPricing {
  unitRate: number;
  costBasis: number;
  markup: number;
  totalCharge: number;
  source: 'customer_override' | 'segment_override' | 'action_price' | 'tenant_default';
}

/** Result of generating a charge event. */
export interface ChargeEventResult {
  chargeEventId: string;
  totalCharge: number;
  pricing: ResolvedPricing;
  tosChargeId?: string;
  usageRecordId?: string;
}

/* ── Action key mapping ────────────────────────────────────────────────────── */

/**
 * Maps ChargeServiceType to action_prices.key for pricing lookup.
 * These keys should match the action pricing dashboard entries.
 */
const SERVICE_TYPE_TO_ACTION_KEY: Record<string, string> = {
  receiving: 'package_receiving',
  storage: 'package_storage',
  forwarding: 'package_forwarding',
  scanning: 'mail_scanning',
  pickup: 'package_pickup',
  disposal: 'mail_disposal',
  shipping: 'shipping_label',
  custom: 'custom_service',
};

/* ── Pricing resolution ────────────────────────────────────────────────────── */

interface ActionPriceRow {
  id: string;
  retail_price: number;
  cogs: number;
  has_tiered_pricing: boolean;
  first_unit_price: number | null;
  additional_unit_price: number | null;
  cogs_first_unit: number | null;
  cogs_additional_unit: number | null;
}

interface OverrideRow {
  retail_price: number | null;
  cogs: number | null;
  first_unit_price: number | null;
  additional_unit_price: number | null;
  cogs_first_unit: number | null;
  cogs_additional_unit: number | null;
}

/**
 * Resolve pricing for a service action.
 *
 * Checks (in order): customer override → segment override → base action price → tenant defaults.
 */
async function resolvePricing(
  tenantId: string,
  customerId: string,
  serviceType: ChargeServiceType,
  quantity: number,
): Promise<ResolvedPricing> {
  const actionKey = SERVICE_TYPE_TO_ACTION_KEY[serviceType] || serviceType;

  try {
    await ensureTables();

    // 1. Look up the base action price
    const actionPrices = await prisma.$queryRawUnsafe<ActionPriceRow[]>(
      `SELECT id, retail_price, cogs, has_tiered_pricing,
              first_unit_price, additional_unit_price,
              cogs_first_unit, cogs_additional_unit
       FROM action_prices
       WHERE tenant_id = $1 AND key = $2 AND is_active = true
       LIMIT 1`,
      tenantId,
      actionKey,
    );

    if (actionPrices.length > 0) {
      const ap = actionPrices[0];

      // 2. Check for customer-level override
      const customerOverrides = await prisma.$queryRawUnsafe<OverrideRow[]>(
        `SELECT retail_price, cogs, first_unit_price, additional_unit_price,
                cogs_first_unit, cogs_additional_unit
         FROM action_price_overrides
         WHERE action_price_id = $1 AND target_type = 'customer' AND target_value = $2
         LIMIT 1`,
        ap.id,
        customerId,
      );

      if (customerOverrides.length > 0) {
        const co = customerOverrides[0];
        return buildPricingFromAction(ap, co, quantity, 'customer_override');
      }

      // 3. Check for segment-level override (based on customer platform)
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { platform: true },
      });

      if (customer?.platform) {
        const segmentOverrides = await prisma.$queryRawUnsafe<OverrideRow[]>(
          `SELECT retail_price, cogs, first_unit_price, additional_unit_price,
                  cogs_first_unit, cogs_additional_unit
           FROM action_price_overrides
           WHERE action_price_id = $1 AND target_type = 'segment' AND target_value = $2
           LIMIT 1`,
          ap.id,
          customer.platform,
        );

        if (segmentOverrides.length > 0) {
          const so = segmentOverrides[0];
          return buildPricingFromAction(ap, so, quantity, 'segment_override');
        }
      }

      // 4. Use base action price
      return buildPricingFromAction(ap, null, quantity, 'action_price');
    }
  } catch (err) {
    // If action_prices tables don't exist yet or query fails, fall through to tenant defaults
    console.warn('[charge-event-service] Action pricing lookup failed, using tenant defaults:', err);
  }

  // 5. Fall back to tenant default rates
  return resolveTenantDefaultPricing(tenantId, serviceType, quantity);
}

/**
 * Build pricing from action_prices + optional override.
 */
function buildPricingFromAction(
  base: ActionPriceRow,
  override: OverrideRow | null,
  quantity: number,
  source: ResolvedPricing['source'],
): ResolvedPricing {
  const retailPrice = override?.retail_price ?? base.retail_price;
  const cogs = override?.cogs ?? base.cogs;

  let unitRate: number;
  let costBasis: number;

  if (base.has_tiered_pricing && quantity > 1) {
    // Tiered: first unit at one rate, additional at another
    const firstRate = override?.first_unit_price ?? base.first_unit_price ?? retailPrice;
    const addlRate = override?.additional_unit_price ?? base.additional_unit_price ?? retailPrice;
    unitRate = (firstRate + addlRate * (quantity - 1)) / quantity; // avg unit rate
    const totalRetail = firstRate + addlRate * (quantity - 1);

    const firstCogs = override?.cogs_first_unit ?? base.cogs_first_unit ?? cogs;
    const addlCogs = override?.cogs_additional_unit ?? base.cogs_additional_unit ?? cogs;
    costBasis = round2(firstCogs + addlCogs * (quantity - 1));

    const markup = round2(totalRetail - costBasis);
    return {
      unitRate: round2(unitRate),
      costBasis,
      markup: Math.max(0, markup),
      totalCharge: round2(totalRetail),
      source,
    };
  }

  // Flat rate
  unitRate = retailPrice;
  costBasis = round2(cogs * quantity);
  const totalCharge = round2(unitRate * quantity);
  const markup = round2(totalCharge - costBasis);

  return {
    unitRate: round2(unitRate),
    costBasis,
    markup: Math.max(0, markup),
    totalCharge,
    source,
  };
}

/**
 * Resolve pricing from tenant default settings when no action price is configured.
 */
async function resolveTenantDefaultPricing(
  tenantId: string,
  serviceType: ChargeServiceType,
  quantity: number,
): Promise<ResolvedPricing> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      receivingFeeRate: true,
      storageRate: true,
    },
  });

  let unitRate = 0;
  switch (serviceType) {
    case 'receiving':
      unitRate = tenant?.receivingFeeRate ?? 3.0;
      break;
    case 'storage':
      unitRate = tenant?.storageRate ?? 1.0;
      break;
    case 'shipping':
      unitRate = 0; // Shipping costs come from the shipment record
      break;
    default:
      unitRate = 0;
      break;
  }

  const totalCharge = round2(unitRate * quantity);

  return {
    unitRate: round2(unitRate),
    costBasis: 0,
    markup: totalCharge, // Without COGS data, full amount is markup
    totalCharge,
    source: 'tenant_default',
  };
}

/* ── Core generator ────────────────────────────────────────────────────────── */

/**
 * Generate a charge event for a service action.
 *
 * This is the main entry point. It:
 * 1. Checks if auto-charge generation is enabled for the tenant
 * 2. Resolves pricing (action prices → overrides → defaults)
 * 3. Creates the ChargeEvent record
 * 4. Optionally creates a TosCharge (time-of-service billing)
 * 5. Optionally records a UsageRecord (usage-based billing)
 */
export async function generateChargeEvent(
  input: ChargeEventInput,
): Promise<ChargeEventResult | null> {
  const {
    tenantId,
    customerId,
    pmbNumber,
    serviceType,
    description,
    quantity = 1,
    packageId,
    shipmentId,
    mailPieceId,
    createdById,
    notes,
  } = input;

  // Check if billing/charge tracking is enabled for this tenant
  const billingConfig = await prisma.billingModelConfig.findUnique({
    where: { tenantId },
  });

  // If no billing config exists, still generate the charge event (for tracking)
  // but skip TosCharge and UsageRecord generation

  // Resolve pricing
  const pricing = await resolvePricing(tenantId, customerId, serviceType, quantity);

  // Skip zero-amount charges unless it's a tracked service
  if (pricing.totalCharge === 0 && serviceType !== 'receiving') {
    return null;
  }

  // Create the ChargeEvent
  const chargeEvent = await prisma.chargeEvent.create({
    data: {
      tenantId,
      customerId,
      pmbNumber,
      serviceType,
      description,
      quantity,
      unitRate: pricing.unitRate,
      costBasis: pricing.costBasis,
      markup: pricing.markup,
      totalCharge: pricing.totalCharge,
      status: 'pending',
      packageId: packageId || null,
      shipmentId: shipmentId || null,
      mailPieceId: mailPieceId || null,
      createdById: createdById || null,
      notes: notes || null,
    },
  });

  const result: ChargeEventResult = {
    chargeEventId: chargeEvent.id,
    totalCharge: pricing.totalCharge,
    pricing,
  };

  // Create TosCharge if time-of-service billing is enabled
  if (billingConfig?.timeOfServiceEnabled && pricing.totalCharge > 0) {
    try {
      const tosCharge = await createTosChargeForEvent(
        tenantId,
        customerId,
        description,
        pricing.totalCharge,
        billingConfig,
        serviceType,
        chargeEvent.id,
      );
      result.tosChargeId = tosCharge.id;
    } catch (err) {
      console.error('[charge-event-service] Failed to create TosCharge:', err);
    }
  }

  // Record usage if usage-based billing is enabled
  if (billingConfig?.usageBasedEnabled) {
    try {
      const usageRecord = await recordUsageForEvent(
        tenantId,
        customerId,
        serviceType,
        quantity,
        packageId,
      );
      if (usageRecord) {
        result.usageRecordId = usageRecord.id;
      }
    } catch (err) {
      console.error('[charge-event-service] Failed to record usage:', err);
    }
  }

  return result;
}

/* ── Service-specific generators ───────────────────────────────────────────── */

/**
 * Generate a charge event when a package is checked in.
 * Creates a "receiving" charge for the handling fee.
 */
export async function onPackageCheckIn(params: {
  tenantId: string;
  customerId: string;
  pmbNumber: string;
  packageId: string;
  carrier: string;
  packageType: string;
  createdById?: string;
}): Promise<ChargeEventResult | null> {
  return generateChargeEvent({
    tenantId: params.tenantId,
    customerId: params.customerId,
    pmbNumber: params.pmbNumber,
    serviceType: 'receiving',
    description: `Package receiving — ${params.carrier} ${params.packageType}`,
    quantity: 1,
    packageId: params.packageId,
    createdById: params.createdById,
  });
}

/**
 * Generate charge events when packages are released at checkout.
 * Creates "storage" charges for packages held beyond the free period.
 */
export async function onPackageCheckout(params: {
  tenantId: string;
  customerId: string;
  pmbNumber: string;
  packages: Array<{
    id: string;
    checkedInAt: Date;
    storageFee: number;
    billableDays: number;
  }>;
  createdById?: string;
}): Promise<ChargeEventResult[]> {
  const results: ChargeEventResult[] = [];

  for (const pkg of params.packages) {
    // Only generate storage charges for packages with billable days
    if (pkg.billableDays <= 0 || pkg.storageFee <= 0) continue;

    const result = await generateChargeEvent({
      tenantId: params.tenantId,
      customerId: params.customerId,
      pmbNumber: params.pmbNumber,
      serviceType: 'storage',
      description: `Package storage — ${pkg.billableDays} day(s) beyond free period`,
      quantity: pkg.billableDays,
      packageId: pkg.id,
      createdById: params.createdById,
    });

    if (result) results.push(result);
  }

  return results;
}

/**
 * Generate a charge event when a shipment is created.
 * Uses the shipment's retail price as the charge amount.
 */
export async function onShipmentCreated(params: {
  tenantId: string;
  customerId: string;
  pmbNumber: string;
  shipmentId: string;
  carrier: string;
  service?: string;
  retailPrice: number;
  wholesaleCost: number;
  createdById?: string;
}): Promise<ChargeEventResult | null> {
  if (params.retailPrice <= 0) return null;

  // For shipments, we use the actual shipping costs rather than action pricing
  const chargeEvent = await prisma.chargeEvent.create({
    data: {
      tenantId: params.tenantId,
      customerId: params.customerId,
      pmbNumber: params.pmbNumber,
      serviceType: 'shipping',
      description: `Shipping — ${params.carrier}${params.service ? ` ${params.service}` : ''}`,
      quantity: 1,
      unitRate: params.retailPrice,
      costBasis: params.wholesaleCost,
      markup: round2(params.retailPrice - params.wholesaleCost),
      totalCharge: params.retailPrice,
      status: 'pending',
      shipmentId: params.shipmentId,
      createdById: params.createdById || null,
    },
  });

  return {
    chargeEventId: chargeEvent.id,
    totalCharge: params.retailPrice,
    pricing: {
      unitRate: params.retailPrice,
      costBasis: params.wholesaleCost,
      markup: round2(params.retailPrice - params.wholesaleCost),
      totalCharge: params.retailPrice,
      source: 'action_price',
    },
  };
}

/**
 * Generate a charge event for a mail piece action.
 * Handles scanning, forwarding, and disposal.
 */
export async function onMailAction(params: {
  tenantId: string;
  customerId: string;
  pmbNumber: string;
  mailPieceId: string;
  action: 'scan' | 'forward' | 'discard';
  pageCount?: number;
  createdById?: string;
}): Promise<ChargeEventResult | null> {
  const serviceTypeMap: Record<string, ChargeServiceType> = {
    scan: 'scanning',
    forward: 'forwarding',
    discard: 'disposal',
  };

  const descriptionMap: Record<string, string> = {
    scan: `Mail scanning — ${params.pageCount || 1} page(s)`,
    forward: 'Mail forwarding',
    discard: 'Mail disposal / shredding',
  };

  const serviceType = serviceTypeMap[params.action];
  if (!serviceType) return null;

  return generateChargeEvent({
    tenantId: params.tenantId,
    customerId: params.customerId,
    pmbNumber: params.pmbNumber,
    serviceType,
    description: descriptionMap[params.action],
    quantity: params.action === 'scan' ? (params.pageCount || 1) : 1,
    mailPieceId: params.mailPieceId,
    createdById: params.createdById,
  });
}

/* ── Daily storage fee cron ────────────────────────────────────────────────── */

/**
 * Generate daily storage charge events for all packages held beyond the free period.
 * Called by the storage fees cron job.
 *
 * Returns the count of charge events created.
 */
export async function generateDailyStorageCharges(
  tenantId?: string,
): Promise<{ chargesCreated: number; errors: string[] }> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const errors: string[] = [];
  let chargesCreated = 0;

  // Get all tenants (or a specific one)
  const tenants = tenantId
    ? await prisma.tenant.findMany({
        where: { id: tenantId, status: 'active' },
        select: { id: true, storageFreedays: true, storageRate: true, storageCountWeekends: true },
      })
    : await prisma.tenant.findMany({
        where: { status: 'active' },
        select: { id: true, storageFreedays: true, storageRate: true, storageCountWeekends: true },
      });

  for (const tenant of tenants) {
    try {
      // Find all packages currently held beyond the free period
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - tenant.storageFreedays);

      const packages = await prisma.package.findMany({
        where: {
          customer: { tenantId: tenant.id },
          status: { in: ['checked_in', 'notified', 'ready'] },
          checkedInAt: { lt: cutoffDate },
        },
        include: {
          customer: {
            select: { id: true, pmbNumber: true, tenantId: true },
          },
        },
      });

      for (const pkg of packages) {
        // Check if a storage charge was already created today for this package
        const existingToday = await prisma.chargeEvent.findFirst({
          where: {
            packageId: pkg.id,
            serviceType: 'storage',
            createdAt: {
              gte: new Date(`${today}T00:00:00Z`),
              lt: new Date(`${today}T23:59:59Z`),
            },
          },
        });

        if (existingToday) continue; // Already charged today

        try {
          const result = await generateChargeEvent({
            tenantId: tenant.id,
            customerId: pkg.customer.id,
            pmbNumber: pkg.customer.pmbNumber,
            serviceType: 'storage',
            description: `Daily storage fee — Package ${pkg.trackingNumber || pkg.id.slice(-6)}`,
            quantity: 1,
            packageId: pkg.id,
            notes: `Auto-generated daily storage charge for ${today}`,
          });

          if (result) chargesCreated++;
        } catch (err) {
          const msg = `Failed to create storage charge for package ${pkg.id}: ${err instanceof Error ? err.message : 'Unknown'}`;
          errors.push(msg);
          console.error('[storage-cron]', msg);
        }
      }
    } catch (err) {
      const msg = `Failed to process tenant ${tenant.id}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      console.error('[storage-cron]', msg);
    }
  }

  return { chargesCreated, errors };
}

/* ── TosCharge integration (BAR-306) ───────────────────────────────────────── */

/**
 * Routes a charge event through the TOS billing pipeline (BAR-306).
 * Uses the centralized tos-billing-service which handles:
 *   - Path A: Immediate charge to card on file
 *   - Path B: Deferred charge to account balance
 *   - Failed payment fallback from immediate → deferred
 */
async function createTosChargeForEvent(
  tenantId: string,
  customerId: string,
  description: string,
  amount: number,
  _billingConfig: { tosDefaultMode: string; tosPaymentWindow: number; tosAutoInvoice: boolean },
  serviceType: string,
  chargeEventId: string,
): Promise<{ id: string }> {
  const result = await processChargeViaTos({
    tenantId,
    customerId,
    description,
    amount,
    serviceType,
    chargeEventId,
    referenceType: serviceType,
    referenceId: chargeEventId,
  });

  return { id: result.tosChargeId };
}

/* ── Usage recording integration ───────────────────────────────────────────── */

/**
 * Map service types to usage meter slugs.
 */
const SERVICE_TYPE_TO_METER_SLUG: Record<string, string> = {
  receiving: 'package_scans',
  storage: 'storage_days',
  scanning: 'mail_scans',
  shipping: 'shipping_labels',
  forwarding: 'mail_forwarding',
};

async function recordUsageForEvent(
  tenantId: string,
  customerId: string,
  serviceType: ChargeServiceType,
  quantity: number,
  packageId?: string,
): Promise<{ id: string } | null> {
  const meterSlug = SERVICE_TYPE_TO_METER_SLUG[serviceType];
  if (!meterSlug) return null;

  // Find the meter
  const meter = await prisma.usageMeter.findUnique({
    where: {
      tenantId_slug: { tenantId, slug: meterSlug },
    },
  });

  if (!meter || !meter.isActive) return null;

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const record = await prisma.usageRecord.create({
    data: {
      meterId: meter.id,
      tenantId,
      customerId,
      quantity,
      unitCost: 0, // Cost tracked in ChargeEvent, not duplicated here
      metadata: JSON.stringify({
        source: 'auto_charge_generation',
        serviceType,
        ...(packageId && { packageId }),
      }),
      period,
    },
  });

  return { id: record.id };
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
