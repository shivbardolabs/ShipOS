/**
 * Action Pricing — raw Postgres tables (no Prisma models).
 *
 * Two tables:
 *   action_prices          – one row per action, tenant-scoped, with universal price + COGS
 *   action_price_overrides – segment or customer-level price overrides
 *
 * Tables are auto-created on first query via ensureTables().
 */

import prisma from './prisma';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface ActionPrice {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  retail_price: number;
  unit_label: string;
  has_tiered_pricing: boolean;
  first_unit_price: number | null;
  additional_unit_price: number | null;
  cogs: number;
  cogs_first_unit: number | null;
  cogs_additional_unit: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ActionPriceOverride {
  id: string;
  action_price_id: string;
  target_type: string; // 'segment' | 'customer'
  target_value: string;
  target_label: string | null;
  retail_price: number | null;
  first_unit_price: number | null;
  additional_unit_price: number | null;
  cogs: number | null;
  cogs_first_unit: number | null;
  cogs_additional_unit: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ActionPriceWithOverrides extends ActionPrice {
  overrides: ActionPriceOverride[];
}

/* ── Table creation ────────────────────────────────────────────────────────── */

let _tablesReady = false;

export async function ensureTables(): Promise<void> {
  if (_tablesReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS action_prices (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id TEXT NOT NULL,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      retail_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      unit_label TEXT NOT NULL DEFAULT 'per item',
      has_tiered_pricing BOOLEAN NOT NULL DEFAULT false,
      first_unit_price DOUBLE PRECISION,
      additional_unit_price DOUBLE PRECISION,
      cogs DOUBLE PRECISION NOT NULL DEFAULT 0,
      cogs_first_unit DOUBLE PRECISION,
      cogs_additional_unit DOUBLE PRECISION,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(tenant_id, key)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS action_price_overrides (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      action_price_id TEXT NOT NULL REFERENCES action_prices(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_value TEXT NOT NULL,
      target_label TEXT,
      retail_price DOUBLE PRECISION,
      first_unit_price DOUBLE PRECISION,
      additional_unit_price DOUBLE PRECISION,
      cogs DOUBLE PRECISION,
      cogs_first_unit DOUBLE PRECISION,
      cogs_additional_unit DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(action_price_id, target_type, target_value)
    );
  `);

  _tablesReady = true;
}

/* ── Queries ───────────────────────────────────────────────────────────────── */

/** Fetch all action prices for a tenant (with overrides). */
export async function getActionPrices(tenantId: string): Promise<ActionPriceWithOverrides[]> {
  await ensureTables();

  const prices = await prisma.$queryRawUnsafe<ActionPrice[]>(
    `SELECT * FROM action_prices WHERE tenant_id = $1 ORDER BY category, sort_order, name`,
    tenantId,
  );

  if (prices.length === 0) return [];

  const ids = prices.map((p) => p.id);
  const overrides = await prisma.$queryRawUnsafe<ActionPriceOverride[]>(
    `SELECT * FROM action_price_overrides WHERE action_price_id = ANY($1) ORDER BY target_type, target_label`,
    ids,
  );

  const overrideMap = new Map<string, ActionPriceOverride[]>();
  for (const o of overrides) {
    const arr = overrideMap.get(o.action_price_id) || [];
    arr.push(o);
    overrideMap.set(o.action_price_id, arr);
  }

  return prices.map((p) => ({ ...p, overrides: overrideMap.get(p.id) || [] }));
}

/** Create a new action price. */
export async function createActionPrice(
  tenantId: string,
  data: {
    key: string;
    name: string;
    description?: string;
    category?: string;
    retailPrice?: number;
    unitLabel?: string;
    hasTieredPricing?: boolean;
    firstUnitPrice?: number;
    additionalUnitPrice?: number;
    cogs?: number;
    cogsFirstUnit?: number;
    cogsAdditionalUnit?: number;
  },
): Promise<ActionPrice> {
  await ensureTables();

  const rows = await prisma.$queryRawUnsafe<ActionPrice[]>(
    `INSERT INTO action_prices
       (tenant_id, key, name, description, category, retail_price, unit_label,
        has_tiered_pricing, first_unit_price, additional_unit_price,
        cogs, cogs_first_unit, cogs_additional_unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    tenantId,
    data.key,
    data.name,
    data.description ?? null,
    data.category ?? 'general',
    data.retailPrice ?? 0,
    data.unitLabel ?? 'per item',
    data.hasTieredPricing ?? false,
    data.firstUnitPrice ?? null,
    data.additionalUnitPrice ?? null,
    data.cogs ?? 0,
    data.cogsFirstUnit ?? null,
    data.cogsAdditionalUnit ?? null,
  );

  return rows[0];
}

/** Update an action price (universal fields). */
export async function updateActionPrice(
  id: string,
  tenantId: string,
  data: Partial<{
    name: string;
    description: string | null;
    category: string;
    retailPrice: number;
    unitLabel: string;
    hasTieredPricing: boolean;
    firstUnitPrice: number | null;
    additionalUnitPrice: number | null;
    cogs: number;
    cogsFirstUnit: number | null;
    cogsAdditionalUnit: number | null;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<ActionPrice | null> {
  await ensureTables();

  // Build SET clause dynamically
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    category: 'category',
    retailPrice: 'retail_price',
    unitLabel: 'unit_label',
    hasTieredPricing: 'has_tiered_pricing',
    firstUnitPrice: 'first_unit_price',
    additionalUnitPrice: 'additional_unit_price',
    cogs: 'cogs',
    cogsFirstUnit: 'cogs_first_unit',
    cogsAdditionalUnit: 'cogs_additional_unit',
    isActive: 'is_active',
    sortOrder: 'sort_order',
  };

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in data) {
      sets.push(`${dbCol} = $${idx}`);
      vals.push((data as Record<string, unknown>)[jsKey]);
      idx++;
    }
  }

  if (sets.length === 0) return null;

  sets.push('updated_at = now()');

  const rows = await prisma.$queryRawUnsafe<ActionPrice[]>(
    `UPDATE action_prices SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    ...vals,
    id,
    tenantId,
  );

  return rows[0] ?? null;
}

/** Delete an action price (cascades to overrides). */
export async function deleteActionPrice(id: string, tenantId: string): Promise<boolean> {
  await ensureTables();
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM action_prices WHERE id = $1 AND tenant_id = $2`,
    id,
    tenantId,
  );
  return result > 0;
}

/* ── Override CRUD ──────────────────────────────────────────────────────────── */

/** Upsert a price override for a segment or customer. */
export async function upsertOverride(
  actionPriceId: string,
  data: {
    targetType: string;
    targetValue: string;
    targetLabel?: string;
    retailPrice?: number | null;
    firstUnitPrice?: number | null;
    additionalUnitPrice?: number | null;
    cogs?: number | null;
    cogsFirstUnit?: number | null;
    cogsAdditionalUnit?: number | null;
  },
): Promise<ActionPriceOverride> {
  await ensureTables();

  const rows = await prisma.$queryRawUnsafe<ActionPriceOverride[]>(
    `INSERT INTO action_price_overrides
       (action_price_id, target_type, target_value, target_label,
        retail_price, first_unit_price, additional_unit_price,
        cogs, cogs_first_unit, cogs_additional_unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (action_price_id, target_type, target_value)
     DO UPDATE SET
       target_label = EXCLUDED.target_label,
       retail_price = EXCLUDED.retail_price,
       first_unit_price = EXCLUDED.first_unit_price,
       additional_unit_price = EXCLUDED.additional_unit_price,
       cogs = EXCLUDED.cogs,
       cogs_first_unit = EXCLUDED.cogs_first_unit,
       cogs_additional_unit = EXCLUDED.cogs_additional_unit,
       updated_at = now()
     RETURNING *`,
    actionPriceId,
    data.targetType,
    data.targetValue,
    data.targetLabel ?? null,
    data.retailPrice ?? null,
    data.firstUnitPrice ?? null,
    data.additionalUnitPrice ?? null,
    data.cogs ?? null,
    data.cogsFirstUnit ?? null,
    data.cogsAdditionalUnit ?? null,
  );

  return rows[0];
}

/** Delete an override. */
export async function deleteOverride(overrideId: string): Promise<boolean> {
  await ensureTables();
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM action_price_overrides WHERE id = $1`,
    overrideId,
  );
  return result > 0;
}

/* ── Categories ─────────────────────────────────────────────────────────────── */

export const ACTION_CATEGORIES = [
  { value: 'mail', label: 'Mail Services' },
  { value: 'package', label: 'Package Services' },
  { value: 'shipping', label: 'Shipping Services' },
  { value: 'scanning', label: 'Scanning & Copying' },
  { value: 'notary', label: 'Notary & Legal' },
  { value: 'general', label: 'General Services' },
] as const;

export const SEGMENT_OPTIONS = [
  { value: 'physical', label: 'Physical Store' },
  { value: 'iPostal', label: 'iPostal1' },
  { value: 'anytime', label: 'Anytime Mailbox' },
  { value: 'postscan', label: 'PostScan Mail' },
] as const;
