import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { parsePMToolsExport } from '@/lib/migration/pm-tools-parser';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const CsvImportBodySchema = z.object({
  csvData: z.string().min(1),
  mode: z.enum(['dry_run', 'execute']),
  mappings: z.record(z.string()).optional(),
});

/* ── Helper: execute migration ───────────────────────────────────────────── */

async function executeMigration(
  tenantId: string,
  userId: string,
  migrationRunId: string,
  records: Array<Record<string, string>>,
) {
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    try {
      const row = records[i];
      const pmbNumber = row['PMB Number'] || row['Box Number'] || row['Mailbox'];

      if (!pmbNumber) {
        errors.push({ row: i + 1, error: 'Missing PMB number' });
        errorCount++;
        continue;
      }

      // Check for duplicates
      const existing = await prisma.customer.findFirst({
        where: { tenantId, pmbNumber: { equals: pmbNumber, mode: 'insensitive' } },
      });

      if (existing) {
        errors.push({ row: i + 1, error: `Duplicate PMB: ${pmbNumber}` });
        errorCount++;
        continue;
      }

      await prisma.customer.create({
        data: {
          tenantId,
          firstName: row['First Name'] || 'Unknown',
          lastName: row['Last Name'] || '',
          email: row['Email'] || null,
          phone: row['Phone'] || null,
          pmbNumber,
          status: 'active',
          platform: 'migrated',
        },
      });

      successCount++;
    } catch (err) {
      errors.push({ row: i + 1, error: err instanceof Error ? err.message : 'Unknown error' });
      errorCount++;
    }
  }

  // Update migration run with results
  await prisma.migrationRun.update({
    where: { id: migrationRunId },
    data: {
      status: errorCount === 0 ? 'completed' : 'completed_with_errors',
      recordsSuccess: successCount,
      recordsFailed: errorCount,
      completedAt: new Date(),
      errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
    },
  });

  return { successCount, errorCount, errors };
}

/**
 * POST /api/migration/csv-import
 * Import customers from a CSV export. Supports dry_run and execute modes.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return forbidden('Admin role required');
  }
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, CsvImportBodySchema);

  // Parse CSV data
  const records = parsePMToolsExport(body.csvData, body.mappings);

  if (records.length === 0) {
    return badRequest('No valid records found in CSV data');
  }

  if (body.mode === 'dry_run') {
    return ok({
      mode: 'dry_run',
      totalRecords: records.length,
      preview: records.slice(0, 10),
      columns: records.length > 0 ? Object.keys(records[0]) : [],
    });
  }

  // Execute mode
  const migrationRun = await prisma.migrationRun.create({
    data: {
      tenantId: user.tenantId,
      type: 'csv_import',
      status: 'running',
      recordsTotal: records.length,
      startedBy: user.id,
    },
  });

  const result = await executeMigration(user.tenantId, user.id, migrationRun.id, records);

  return created({
    migrationRunId: migrationRun.id,
    ...result,
  });
});
