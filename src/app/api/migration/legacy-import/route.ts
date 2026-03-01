import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Preset configurations ────────────────────────────────────────────────── */

const PRESETS: Record<string, { name: string; description: string; mappings: Record<string, string> }> = {
  postalmate: {
    name: 'PostalMate',
    description: 'Import from PostalMate database exports (.csv)',
    mappings: {
      'Box Number': 'pmbNumber',
      'First Name': 'firstName',
      'Last Name': 'lastName',
      'Email Address': 'email',
      'Home Phone': 'phone',
      'Company': 'businessName',
    },
  },
  mail_manager: {
    name: 'Mail Manager',
    description: 'Import from Mail Manager exports (.csv)',
    mappings: {
      'Mailbox': 'pmbNumber',
      'FName': 'firstName',
      'LName': 'lastName',
      'Email': 'email',
      'Phone1': 'phone',
      'Business': 'businessName',
    },
  },
  generic_packages: {
    name: 'Generic Packages',
    description: 'Import package history from a generic CSV',
    mappings: {
      'Tracking': 'trackingNumber',
      'Carrier': 'carrier',
      'PMB': 'pmbNumber',
      'Date': 'checkedInAt',
      'Status': 'status',
    },
  },
};

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const LegacyImportBodySchema = z.object({
  preset: z.string().optional(),
  customMappings: z.record(z.string()).optional(),
  csvData: z.string().min(1),
  mode: z.enum(['dry_run', 'execute']).default('dry_run'),
});

/**
 * GET /api/migration/legacy-import
 * Returns available import presets.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return forbidden('Admin role required');
  }

  return ok({
    presets: Object.entries(PRESETS).map(([key, preset]) => ({
      key,
      ...preset,
    })),
  });
});

/**
 * POST /api/migration/legacy-import
 * Import data using a preset or custom field mappings.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return forbidden('Admin role required');
  }
  if (!user.tenantId) return badRequest('No tenant');

  const body = await validateBody(request, LegacyImportBodySchema);

  // Determine mappings
  let mappings: Record<string, string>;
  if (body.preset && PRESETS[body.preset]) {
    mappings = PRESETS[body.preset].mappings;
  } else if (body.customMappings) {
    mappings = body.customMappings;
  } else {
    return badRequest('Either preset or customMappings is required');
  }

  // Parse CSV using mappings
  const lines = body.csvData.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return badRequest('CSV must have a header row and at least one data row');

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const records = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      const mappedField = mappings[header];
      if (mappedField) record[mappedField] = values[i] || '';
    });
    return record;
  });

  if (body.mode === 'dry_run') {
    return ok({
      mode: 'dry_run',
      preset: body.preset ?? 'custom',
      mappingsUsed: mappings,
      totalRecords: records.length,
      preview: records.slice(0, 10),
    });
  }

  // Execute
  const migrationRun = await prisma.migrationRun.create({
    data: {
      tenantId: user.tenantId,
      type: 'legacy_import',
      status: 'running',
      recordsTotal: records.length,
      startedBy: user.id,
      metadata: JSON.stringify({ preset: body.preset, mappings }),
    },
  });

  let successCount = 0;
  let errorCount = 0;

  for (const record of records) {
    try {
      if (record.pmbNumber) {
        await prisma.customer.create({
          data: {
            tenantId: user.tenantId,
            pmbNumber: record.pmbNumber,
            firstName: record.firstName || 'Unknown',
            lastName: record.lastName || '',
            email: record.email || null,
            phone: record.phone || null,
            businessName: record.businessName || null,
            status: 'active',
            platform: 'migrated',
          },
        });
        successCount++;
      } else {
        errorCount++;
      }
    } catch {
      errorCount++;
    }
  }

  await prisma.migrationRun.update({
    where: { id: migrationRun.id },
    data: {
      status: errorCount === 0 ? 'completed' : 'completed_with_errors',
      recordsSuccess: successCount,
      recordsFailed: errorCount,
      completedAt: new Date(),
    },
  });

  return created({
    migrationRunId: migrationRun.id,
    successCount,
    errorCount,
    total: records.length,
  });
});
