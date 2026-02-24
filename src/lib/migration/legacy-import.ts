/**
 * BAR-196: Generic Legacy Data Migration Engine
 *
 * Supports importing data from various legacy systems beyond PMTools:
 * - Generic CSV/JSON with configurable field mapping
 * - PostalMate, Mail Manager, and custom formats
 * - Validation, dedup, dry-run, execute, and rollback
 */

export interface FieldMapping {
  source: string;     // Column/field name in source data
  target: string;     // Prisma model field name
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'phone' | 'date' | 'boolean' | 'number';
  required?: boolean;
  default?: string;
}

export interface MigrationConfig {
  sourceFormat: 'csv' | 'json' | 'tsv';
  targetModel: 'customer' | 'package' | 'mailPiece' | 'invoice';
  fieldMappings: FieldMapping[];
  deduplicateOn?: string;  // Field to check for duplicates (e.g., 'email')
  skipHeader?: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface MigrationResult {
  mode: 'dry_run' | 'execute';
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRows: number;
  errors: ValidationError[];
  importedIds?: string[];
}

// ── Pre-built mappings for common legacy systems ──────────────────────────

export const LEGACY_PRESETS: Record<string, MigrationConfig> = {
  postalmate: {
    sourceFormat: 'csv',
    targetModel: 'customer',
    deduplicateOn: 'email',
    fieldMappings: [
      { source: 'FIRSTNAME', target: 'firstName', transform: 'trim', required: true },
      { source: 'LASTNAME', target: 'lastName', transform: 'trim', required: true },
      { source: 'EMAIL', target: 'email', transform: 'lowercase', required: true },
      { source: 'PHONE', target: 'phone', transform: 'phone' },
      { source: 'BOX_NUM', target: 'pmbNumber', required: true },
      { source: 'ADDRESS', target: 'address' },
      { source: 'CITY', target: 'city' },
      { source: 'STATE', target: 'state', transform: 'uppercase' },
      { source: 'ZIP', target: 'zipCode' },
      { source: 'ID_TYPE', target: 'idType', default: 'drivers_license' },
      { source: 'ID_NUMBER', target: 'idNumber' },
      { source: 'STATUS', target: 'status', default: 'active' },
      { source: 'FORM_1583', target: 'form1583Status', default: 'pending' },
      { source: 'START_DATE', target: 'createdAt', transform: 'date' },
      { source: 'RENEW_DATE', target: 'renewalDate', transform: 'date' },
    ],
  },
  mail_manager: {
    sourceFormat: 'csv',
    targetModel: 'customer',
    deduplicateOn: 'email',
    fieldMappings: [
      { source: 'First Name', target: 'firstName', transform: 'trim', required: true },
      { source: 'Last Name', target: 'lastName', transform: 'trim', required: true },
      { source: 'Email Address', target: 'email', transform: 'lowercase', required: true },
      { source: 'Phone Number', target: 'phone', transform: 'phone' },
      { source: 'Mailbox #', target: 'pmbNumber', required: true },
      { source: 'Street Address', target: 'address' },
      { source: 'City', target: 'city' },
      { source: 'State', target: 'state', transform: 'uppercase' },
      { source: 'Zip Code', target: 'zipCode' },
      { source: 'Active', target: 'status', transform: 'boolean' },
    ],
  },
  generic_packages: {
    sourceFormat: 'csv',
    targetModel: 'package',
    deduplicateOn: 'trackingNumber',
    fieldMappings: [
      { source: 'tracking_number', target: 'trackingNumber', required: true },
      { source: 'carrier', target: 'carrier', transform: 'uppercase', required: true },
      { source: 'customer_pmb', target: 'customerPmb' },
      { source: 'status', target: 'status', default: 'checked_in' },
      { source: 'received_date', target: 'checkedInAt', transform: 'date' },
      { source: 'weight', target: 'weight', transform: 'number' },
      { source: 'location', target: 'storageLocation' },
      { source: 'notes', target: 'description' },
    ],
  },
};

// ── Transform helpers ─────────────────────────────────────────────────────

export function applyTransform(value: string, transform?: string): string | number | boolean | Date {
  if (!value && !transform) return value;
  const v = value?.trim() ?? '';

  switch (transform) {
    case 'uppercase': return v.toUpperCase();
    case 'lowercase': return v.toLowerCase();
    case 'trim': return v;
    case 'phone': return v.replace(/[^0-9+() -]/g, '');
    case 'date': {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toISOString();
    }
    case 'boolean': return ['true', '1', 'yes', 'active', 'y'].includes(v.toLowerCase()) ? 'active' : 'inactive';
    case 'number': return isNaN(Number(v)) ? v : String(Number(v));
    default: return v;
  }
}

// ── Parse CSV/TSV/JSON ────────────────────────────────────────────────────

export function parseSourceData(
  raw: string,
  format: 'csv' | 'json' | 'tsv',
): Record<string, string>[] {
  if (format === 'json') {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  const delimiter = format === 'tsv' ? '\t' : ',';
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0], delimiter);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Validate a single row ─────────────────────────────────────────────────

export function validateRow(
  row: Record<string, string>,
  config: MigrationConfig,
  rowIndex: number,
): { mapped: Record<string, unknown>; errors: ValidationError[] } {
  const mapped: Record<string, unknown> = {};
  const errors: ValidationError[] = [];

  for (const mapping of config.fieldMappings) {
    let value = row[mapping.source] ?? '';

    // Apply default
    if (!value && mapping.default) {
      value = mapping.default;
    }

    // Required check
    if (mapping.required && !value) {
      errors.push({
        row: rowIndex,
        field: mapping.source,
        value: '',
        message: `Required field "${mapping.source}" is empty`,
      });
      continue;
    }

    if (value) {
      mapped[mapping.target] = applyTransform(value, mapping.transform);
    }
  }

  return { mapped, errors };
}

// ── Full migration run ────────────────────────────────────────────────────

export function processMigration(
  raw: string,
  config: MigrationConfig,
): MigrationResult {
  const rows = parseSourceData(raw, config.sourceFormat);
  const allErrors: ValidationError[] = [];
  const validRows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const { mapped, errors } = validateRow(rows[i], config, i + 1);

    if (errors.length > 0) {
      allErrors.push(...errors);
      skipped++;
      continue;
    }

    // Dedup
    if (config.deduplicateOn && mapped[config.deduplicateOn]) {
      const key = String(mapped[config.deduplicateOn]).toLowerCase();
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
    }

    validRows.push(mapped);
  }

  return {
    mode: 'dry_run',
    totalRows: rows.length,
    validRows: validRows.length,
    skippedRows: skipped,
    duplicateRows: duplicates,
    errors: allErrors,
  };
}
