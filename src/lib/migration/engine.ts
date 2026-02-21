/**
 * PostalMate → ShipOS Migration Engine
 *
 * Handles the server-side logic for migrating data from a PostalMate
 * Firebird backup into the ShipOS database.
 *
 * Architecture:
 * 1. Upload: .7z file → extract TMPBCK (Firebird backup)
 * 2. Restore: gbak → temporary .fdb file
 * 3. Read: query Firebird DB for source data
 * 4. Transform: map PostalMate schema → ShipOS schema
 * 5. Write: batch insert into ShipOS SQLite via Prisma
 */

import {
  MigrationAnalysis,
  MigrationProgress,
  MigrationError,
  CARRIER_MAP,
} from './types';

// ── Carrier name normalizer ──────────────────────────────────────────────────

export function normalizeCarrier(pmCarrierName: string | null): string {
  if (!pmCarrierName) return 'other';
  const mapped = CARRIER_MAP[pmCarrierName.trim()];
  if (mapped) return mapped;
  // Fallback: lowercase, remove spaces
  return pmCarrierName.trim().toLowerCase().replace(/\s+/g, '_');
}

// ── Address formatter ────────────────────────────────────────────────────────

export function formatDestination(fields: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): string {
  const parts: string[] = [];

  const name = [fields.firstName, fields.lastName].filter(Boolean).join(' ');
  if (name) parts.push(name);
  if (fields.companyName) parts.push(fields.companyName);
  if (fields.address1) parts.push(fields.address1);
  if (fields.address2) parts.push(fields.address2);
  if (fields.address3) parts.push(fields.address3);

  const cityStateZip = [
    fields.city,
    fields.state ? `, ${fields.state}` : '',
    fields.zip ? ` ${fields.zip}` : '',
  ].join('');
  if (cityStateZip.trim()) parts.push(cityStateZip.trim());

  if (fields.country && fields.country !== 'UNITED STATES' && fields.country !== 'US') {
    parts.push(fields.country);
  }

  return parts.join('\n');
}

// ── Dimensions formatter ─────────────────────────────────────────────────────

export function formatDimensions(
  l: number | null | undefined,
  w: number | null | undefined,
  h: number | null | undefined
): string | undefined {
  if (!l && !w && !h) return undefined;
  return `${l || 0}x${w || 0}x${h || 0}`;
}

// ── PMB number generator ─────────────────────────────────────────────────────

export function generatePmbNumber(
  mailboxNumber: number | null,
  customerId: number
): string {
  if (mailboxNumber && mailboxNumber > 0) {
    return `PMB-${String(mailboxNumber).padStart(3, '0')}`;
  }
  return `WI-${customerId}`;
}

// ── Date parser ──────────────────────────────────────────────────────────────

export function parseFirebirdDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Skip sentinel dates
  if (d.getFullYear() < 1970) return null;
  return d;
}

// ── Batch processor ──────────────────────────────────────────────────────────

export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  onProgress?: (processed: number, total: number) => void
): Promise<{ results: R[]; errors: MigrationError[] }> {
  const results: R[] = [];
  const errors: MigrationError[] = [];
  let processed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const batchResults = await processor(batch);
      results.push(...batchResults);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        entity: 'batch',
        sourceId: `${i}-${i + batch.length}`,
        message,
        timestamp: new Date().toISOString(),
      });
    }
    processed += batch.length;
    onProgress?.(processed, items.length);
  }

  return { results, errors };
}

// ── Migration status manager (in-memory for real-time progress) ──────────────

const migrationStatus = new Map<string, MigrationProgress>();

export function initMigrationProgress(migrationId: string): MigrationProgress {
  const progress: MigrationProgress = {
    migrationId,
    status: 'pending',
    currentEntity: '',
    currentProgress: 0,
    totalProgress: 0,
    entities: {
      customers: { total: 0, migrated: 0, skipped: 0, errors: 0, status: 'pending' },
      addresses: { total: 0, migrated: 0, skipped: 0, errors: 0, status: 'pending' },
      shipments: { total: 0, migrated: 0, skipped: 0, errors: 0, status: 'pending' },
      packages:  { total: 0, migrated: 0, skipped: 0, errors: 0, status: 'pending' },
      invoices:  { total: 0, migrated: 0, skipped: 0, errors: 0, status: 'pending' },
    },
    errors: [],
  };
  migrationStatus.set(migrationId, progress);
  return progress;
}

export function getMigrationProgress(migrationId: string): MigrationProgress | null {
  return migrationStatus.get(migrationId) ?? null;
}

export function updateMigrationProgress(
  migrationId: string,
  update: Partial<MigrationProgress>
): void {
  const current = migrationStatus.get(migrationId);
  if (current) {
    Object.assign(current, update);
  }
}

// ── Demo / mock data for when Firebird is not available ──────────────────────
// In production, this would query the actual Firebird database.
// For the initial release, we provide a structured migration pipeline
// that processes exported JSON data from the Firebird backup.

export function createMigrationAnalysis(sourceFile: string): MigrationAnalysis {
  return {
    sourceFile,
    databaseVersion: '',
    dateRange: { min: '', max: '' },
    counts: {
      customers: 0,
      shipToAddresses: 0,
      shipments: 0,
      packages: 0,
      packageCheckins: 0,
      products: 0,
      transactions: 0,
      lineItems: 0,
      payments: 0,
      mailboxes: 0,
      carriers: 0,
      departments: 0,
    },
    carriers: [],
    departments: [],
  };
}
