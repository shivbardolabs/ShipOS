import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const StartMigrationBodySchema = z.object({
  sourceSystem: z.string().min(1),
  csvData: z.string().min(1),
  options: z.object({
    skipDuplicates: z.boolean().optional().default(true),
    defaultStatus: z.string().optional().default('active'),
    preserveDates: z.boolean().optional().default(false),
  }).optional().default({}),
});

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function normalizeCarrierName(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('ups')) return 'UPS';
  if (lower.includes('fedex') || lower.includes('fed ex')) return 'FedEx';
  if (lower.includes('usps') || lower.includes('postal')) return 'USPS';
  if (lower.includes('dhl')) return 'DHL';
  if (lower.includes('amazon') || lower.includes('amzn')) return 'Amazon';
  if (lower.includes('ontrac')) return 'OnTrac';
  if (lower.includes('lasership') || lower.includes('laser')) return 'LaserShip';
  return raw.trim() || 'Other';
}

function mapPackageType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('letter') || lower.includes('envelope')) return 'letter';
  if (lower.includes('small')) return 'small';
  if (lower.includes('large') || lower.includes('oversized')) return 'large';
  if (lower.includes('perishable')) return 'perishable';
  return 'medium';
}

function mapPackageStatus(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('released') || lower.includes('picked')) return 'released';
  if (lower.includes('notif')) return 'notified';
  if (lower.includes('return')) return 'returned';
  return 'checked_in';
}

/* ── Background executor ─────────────────────────────────────────────────── */

async function executeMigration(
  tenantId: string,
  userId: string,
  migrationRunId: string,
  csvData: string,
  options: { skipDuplicates: boolean; defaultStatus: string; preserveDates: boolean },
) {
  let successCount = 0;
  let errorCount = 0;

  try {
    const lines = csvData.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      await prisma.migrationRun.update({
        where: { id: migrationRunId },
        data: { status: 'failed', errorLog: 'No data rows found', completedAt: new Date() },
      });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const pmbNumber = row['PMB Number'] || row['Mailbox'] || row['Box'];
        if (!pmbNumber) { errorCount++; continue; }

        // Check for duplicates
        if (options.skipDuplicates) {
          const existing = await prisma.customer.findFirst({
            where: { tenantId, pmbNumber: { equals: pmbNumber, mode: 'insensitive' } },
          });
          if (existing) { errorCount++; continue; }
        }

        await prisma.customer.create({
          data: {
            tenantId,
            pmbNumber,
            firstName: row['First Name'] || 'Unknown',
            lastName: row['Last Name'] || '',
            email: row['Email'] || null,
            phone: row['Phone'] || null,
            status: options.defaultStatus,
            platform: 'migrated',
          },
        });

        successCount++;

        // Update progress periodically
        if (i % 50 === 0) {
          await prisma.migrationRun.update({
            where: { id: migrationRunId },
            data: { recordsSuccess: successCount, recordsFailed: errorCount },
          });
        }
      } catch {
        errorCount++;
      }
    }

    await prisma.migrationRun.update({
      where: { id: migrationRunId },
      data: {
        status: errorCount === 0 ? 'completed' : 'completed_with_errors',
        recordsSuccess: successCount,
        recordsFailed: errorCount,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[migration/start] executeMigration error:', err);
    await prisma.migrationRun.update({
      where: { id: migrationRunId },
      data: {
        status: 'failed',
        errorLog: err instanceof Error ? err.message : 'Unknown error',
        completedAt: new Date(),
      },
    });
  }
}

/**
 * POST /api/migration/start
 * Creates a MigrationRun and starts background execution.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return forbidden('Admin role required');
  }
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, StartMigrationBodySchema);

  const lines = body.csvData.split('\n').filter((l) => l.trim());
  const recordsTotal = Math.max(0, lines.length - 1); // minus header

  const migrationRun = await prisma.migrationRun.create({
    data: {
      tenantId: user.tenantId,
      type: body.sourceSystem,
      status: 'running',
      recordsTotal,
      startedBy: user.id,
      metadata: JSON.stringify({ sourceSystem: body.sourceSystem, options: body.options }),
    },
  });

  // Start background execution (fire and forget)
  executeMigration(
    user.tenantId,
    user.id,
    migrationRun.id,
    body.csvData,
    {
      skipDuplicates: body.options.skipDuplicates ?? true,
      defaultStatus: body.options.defaultStatus ?? 'active',
      preserveDates: body.options.preserveDates ?? false,
    },
  ).catch((err) => {
    console.error('[migration/start] Background execution error:', err);
  });

  return created({
    migrationRun: {
      id: migrationRun.id,
      status: migrationRun.status,
      recordsTotal,
    },
    message: 'Migration started. Poll /api/migration/progress?id=... for updates.',
  });
});
