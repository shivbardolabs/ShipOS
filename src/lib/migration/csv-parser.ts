/**
 * PMTools CSV Migration Parser
 *
 * Parses CSV exports from PMTools into structured data that can
 * be mapped to ShipOS schema. Supports the standard PMTools export
 * tables: CUSTOMER, MBDETAIL, PACKAGES, BILLING.
 */

import {
  PMCustomer,
  PMMailbox,
  PMPackageReceive,
  PMShipment,
  CARRIER_MAP,
  MB_STATUS_MAP,
  PKG_TYPE_MAP,
  PKG_STATUS_MAP,
} from './types';

/* ── Generic CSV Parser ───────────────────────────────────────────────────── */

interface CsvParseResult<T> {
  headers: string[];
  rows: T[];
  errors: Array<{ line: number; message: string }>;
}

/**
 * Parse a CSV string into an array of objects.
 * Handles quoted fields, commas within quotes, and newlines within quotes.
 */
export function parseCsv<T>(
  csv: string,
  fieldMapping?: Record<string, string>
): CsvParseResult<T> {
  const lines = splitCsvLines(csv);
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ line: 0, message: 'Empty CSV file' }] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: T[] = [];
  const errors: Array<{ line: number; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCsvLine(line);
      const row: Record<string, unknown> = {};

      headers.forEach((header, idx) => {
        const key = fieldMapping?.[header] || header;
        const val = values[idx] ?? null;
        // Auto-detect types
        if (val === null || val === '') {
          row[key] = null;
        } else if (/^\d+$/.test(val)) {
          row[key] = parseInt(val, 10);
        } else if (/^\d+\.\d+$/.test(val)) {
          row[key] = parseFloat(val);
        } else {
          row[key] = val;
        }
      });

      rows.push(row as T);
    } catch (err) {
      errors.push({
        line: i + 1,
        message: err instanceof Error ? err.message : 'Parse error',
      });
    }
  }

  return { headers, rows, errors };
}

function splitCsvLines(csv: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = '';
      // Skip \r\n
      if (char === '\r' && csv[i + 1] === '\n') i++;
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);

  return lines;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/* ── PMTools-specific Parsers ─────────────────────────────────────────────── */

export interface PMToolsCsvData {
  customers: PMCustomer[];
  mailboxes: PMMailbox[];
  packages: PMPackageReceive[];
  billing: PMShipment[];
}

/**
 * Parse multiple PMTools CSV files into structured data.
 * Accepts a map of tableName → csvContent.
 */
export function parsePMToolsExport(files: Record<string, string>): {
  data: PMToolsCsvData;
  stats: {
    customers: number;
    mailboxes: number;
    packages: number;
    billing: number;
    errors: Array<{ table: string; line: number; message: string }>;
  };
} {
  const allErrors: Array<{ table: string; line: number; message: string }> = [];
  const data: PMToolsCsvData = {
    customers: [],
    mailboxes: [],
    packages: [],
    billing: [],
  };

  // CUSTOMER table
  if (files.CUSTOMER || files.customer || files.customers) {
    const csv = files.CUSTOMER || files.customer || files.customers;
    const result = parseCsv<PMCustomer>(csv);
    data.customers = result.rows;
    allErrors.push(...result.errors.map((e) => ({ table: 'CUSTOMER', ...e })));
  }

  // MBDETAIL table (mailbox details)
  if (files.MBDETAIL || files.mbdetail || files.mailboxes) {
    const csv = files.MBDETAIL || files.mbdetail || files.mailboxes;
    const result = parseCsv<PMMailbox>(csv);
    data.mailboxes = result.rows;
    allErrors.push(...result.errors.map((e) => ({ table: 'MBDETAIL', ...e })));
  }

  // PACKAGES table
  if (files.PACKAGES || files.packages) {
    const csv = files.PACKAGES || files.packages;
    const result = parseCsv<PMPackageReceive>(csv);
    data.packages = result.rows;
    allErrors.push(...result.errors.map((e) => ({ table: 'PACKAGES', ...e })));
  }

  // BILLING table (shipments/transactions)
  if (files.BILLING || files.billing) {
    const csv = files.BILLING || files.billing;
    const result = parseCsv<PMShipment>(csv);
    data.billing = result.rows;
    allErrors.push(...result.errors.map((e) => ({ table: 'BILLING', ...e })));
  }

  return {
    data,
    stats: {
      customers: data.customers.length,
      mailboxes: data.mailboxes.length,
      packages: data.packages.length,
      billing: data.billing.length,
      errors: allErrors,
    },
  };
}

/* ── Field Mapping: PMTools → ShipOS ──────────────────────────────────────── */

export interface MappedCustomer {
  firstName: string;
  lastName: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  pmbNumber: string;
  status: string;
  dateOpened: Date | null;
  renewalDate: Date | null;
  sourceId: string;
}

export interface MappedPackage {
  trackingNumber: string | null;
  carrier: string;
  senderName: string | null;
  packageType: string;
  status: string;
  checkedInAt: Date;
  releasedAt: Date | null;
  customerSourceId: string;
  sourceId: string;
  notes: string | null;
}

export interface MappedInvoice {
  invoiceNumber: string;
  type: string;
  amount: number;
  status: string;
  customerSourceId: string;
  sourceId: string;
}

/**
 * Map PMTools customer to ShipOS schema.
 */
export function mapCustomer(
  pm: PMCustomer,
  mailbox?: PMMailbox
): MappedCustomer {
  return {
    firstName: pm.FIRSTNAME || 'Unknown',
    lastName: pm.LASTNAME || 'Customer',
    businessName: pm.COMPANYNAME || null,
    email: pm.EMAIL || null,
    phone: pm.VOICEPHONENO || null,
    pmbNumber: mailbox
      ? `PMB-${String(mailbox.MAILBOXNUMBER).padStart(4, '0')}`
      : `PMB-PM${pm.CUSTOMERID}`,
    status: mailbox ? (MB_STATUS_MAP[mailbox.STATUS] === 'active' ? 'active' : 'closed') : 'active',
    dateOpened: pm.ADDDATE ? parseDate(pm.ADDDATE) : null,
    renewalDate: mailbox?.NEXTDUEDATE ? parseDate(mailbox.NEXTDUEDATE) : null,
    sourceId: String(pm.CUSTOMERID),
  };
}

/**
 * Map PMTools package to ShipOS schema.
 */
export function mapPackage(pm: PMPackageReceive): MappedPackage {
  return {
    trackingNumber: pm.TRACKINGNUMBER || null,
    carrier: pm.CARRIERNAME
      ? (CARRIER_MAP[pm.CARRIERNAME] || pm.CARRIERNAME.toLowerCase().replace(/\s+/g, '_'))
      : 'other',
    senderName: pm.SENDER || null,
    packageType: PKG_TYPE_MAP[pm.PKGTYPE] || 'medium',
    status: PKG_STATUS_MAP[pm.STATUS] || 'checked_in',
    checkedInAt: parseDate(pm.DTG) || new Date(),
    releasedAt: pm.DTGCOMPLETE ? parseDate(pm.DTGCOMPLETE) : null,
    customerSourceId: String(pm.CUSTOMERREF),
    sourceId: String(pm.PKGRECVXNID),
    notes: pm.NOTES || null,
  };
}

/**
 * Map PMTools shipment/billing to ShipOS invoice.
 */
export function mapBilling(pm: PMShipment): MappedInvoice {
  return {
    invoiceNumber: `PM-${pm.SHIPMENTXNID}`,
    type: 'shipping',
    amount: pm.SHIPMENTRETAIL || 0,
    status: pm.VOIDED ? 'void' : 'paid',
    customerSourceId: String(pm.CUSTOMERREF),
    sourceId: String(pm.SHIPMENTXNID),
  };
}

/* ── Dry Run: Validate & Report ───────────────────────────────────────────── */

export interface DryRunResult {
  valid: boolean;
  customers: {
    total: number;
    valid: number;
    duplicates: number;
    errors: Array<{ sourceId: string; message: string }>;
  };
  packages: {
    total: number;
    valid: number;
    orphaned: number; // Packages without matching customer
    errors: Array<{ sourceId: string; message: string }>;
  };
  invoices: {
    total: number;
    valid: number;
    errors: Array<{ sourceId: string; message: string }>;
  };
  warnings: string[];
}

/**
 * Perform a dry run: parse, validate, and report conflicts without writing.
 */
export function dryRun(
  data: PMToolsCsvData,
  existingPmbs: string[]
): DryRunResult {
  const pmbSet = new Set(existingPmbs.map((p) => p.toLowerCase()));
  const customerIds = new Set<string>();
  const result: DryRunResult = {
    valid: true,
    customers: { total: 0, valid: 0, duplicates: 0, errors: [] },
    packages: { total: 0, valid: 0, orphaned: 0, errors: [] },
    invoices: { total: 0, valid: 0, errors: [] },
    warnings: [],
  };

  // Build mailbox lookup
  const mailboxByCustomer = new Map<number, PMMailbox>();
  for (const mb of data.mailboxes) {
    if (mb.CUSTOMERREF) {
      mailboxByCustomer.set(mb.CUSTOMERREF, mb);
    }
  }

  // Validate customers
  for (const pm of data.customers) {
    result.customers.total++;
    const mapped = mapCustomer(pm, mailboxByCustomer.get(pm.CUSTOMERID));

    if (pmbSet.has(mapped.pmbNumber.toLowerCase())) {
      result.customers.duplicates++;
      result.customers.errors.push({
        sourceId: String(pm.CUSTOMERID),
        message: `PMB ${mapped.pmbNumber} already exists`,
      });
    } else if (!mapped.firstName || !mapped.lastName) {
      result.customers.errors.push({
        sourceId: String(pm.CUSTOMERID),
        message: 'Missing first or last name',
      });
    } else {
      result.customers.valid++;
      customerIds.add(String(pm.CUSTOMERID));
    }
  }

  // Validate packages
  for (const pm of data.packages) {
    result.packages.total++;
    if (!customerIds.has(String(pm.CUSTOMERREF))) {
      result.packages.orphaned++;
    } else {
      result.packages.valid++;
    }
  }

  // Validate invoices
  for (const pm of data.billing) {
    result.invoices.total++;
    if (pm.VOIDED) {
      result.invoices.errors.push({
        sourceId: String(pm.SHIPMENTXNID),
        message: 'Voided transaction — will be imported as void',
      });
    }
    result.invoices.valid++;
  }

  // Warnings
  if (result.customers.duplicates > 0) {
    result.warnings.push(
      `${result.customers.duplicates} customer(s) have PMB numbers that already exist`
    );
  }
  if (result.packages.orphaned > 0) {
    result.warnings.push(
      `${result.packages.orphaned} package(s) reference customers not in this export`
    );
  }

  result.valid = result.customers.errors.length === 0 && result.warnings.length === 0;

  return result;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
