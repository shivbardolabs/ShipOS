/**
 * BAR-196: Legacy Data Migration API
 *
 * POST /api/migration/legacy-import
 * Body: { source: string (raw CSV/JSON), preset?: string, config?: MigrationConfig, mode: 'dry_run' | 'execute' }
 *
 * Supports preset mappings (postalmate, mail_manager, generic_packages)
 * or custom field mappings.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@auth0/nextjs-auth0';
import { getOrProvisionUser } from '@/lib/auth';
import {
  LEGACY_PRESETS,
  processMigration,
  parseSourceData,
  validateRow,
  type MigrationConfig,
} from '@/lib/migration/legacy-import';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getOrProvisionUser();
  if (!user || !['admin', 'superadmin'].includes(user.role)) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { source, preset, config: customConfig, mode = 'dry_run' } = body;

    if (!source) {
      return NextResponse.json({ error: 'source data is required' }, { status: 400 });
    }

    // Resolve config
    let config: MigrationConfig;
    if (preset && LEGACY_PRESETS[preset]) {
      config = LEGACY_PRESETS[preset];
    } else if (customConfig) {
      config = customConfig as MigrationConfig;
    } else {
      return NextResponse.json({
        error: 'Either preset or config is required',
        availablePresets: Object.keys(LEGACY_PRESETS),
      }, { status: 400 });
    }

    // Dry run — validate and return stats
    const result = processMigration(source, config);

    if (mode === 'dry_run') {
      return NextResponse.json(result);
    }

    // Execute mode — actually import
    if (result.validRows === 0) {
      return NextResponse.json({ ...result, error: 'No valid rows to import' }, { status: 400 });
    }

    const rows = parseSourceData(source, config.sourceFormat);
    const importedIds: string[] = [];
    const tenantId = user.tenantId;

    for (let i = 0; i < rows.length; i++) {
      const { mapped, errors } = validateRow(rows[i], config, i + 1);
      if (errors.length > 0) continue;

      try {
        if (config.targetModel === 'customer') {
          const customer = await prisma.customer.create({
            data: {
              firstName: String(mapped.firstName ?? ''),
              lastName: String(mapped.lastName ?? ''),
              email: String(mapped.email ?? ''),
              phone: mapped.phone ? String(mapped.phone) : undefined,
              pmbNumber: String(mapped.pmbNumber ?? `IMPORT-${Date.now()}-${i}`),
              status: String(mapped.status ?? 'active'),
              form1583Status: String(mapped.form1583Status ?? 'pending'),
              idType: mapped.idType ? String(mapped.idType) : undefined,
              homeAddress: mapped.address ? String(mapped.address) : undefined,
              homeCity: mapped.city ? String(mapped.city) : undefined,
              homeState: mapped.state ? String(mapped.state) : undefined,
              homeZip: mapped.zipCode ? String(mapped.zipCode) : undefined,
              renewalDate: mapped.renewalDate ? new Date(String(mapped.renewalDate)) : undefined,
              tenantId,
            },
          });
          importedIds.push(customer.id);
        } else if (config.targetModel === 'package') {
          // Resolve customer by PMB if provided
          let customerId: string | undefined;
          if (mapped.customerPmb) {
            const cust = await prisma.customer.findFirst({
              where: { pmbNumber: String(mapped.customerPmb), tenantId },
            });
            customerId = cust?.id;
          }

          if (!customerId) continue; // Package requires a customerId

          const pkg = await prisma.package.create({
            data: {
              trackingNumber: String(mapped.trackingNumber ?? ''),
              carrier: String(mapped.carrier ?? 'Unknown'),
              status: String(mapped.status ?? 'checked_in'),
              storageLocation: mapped.storageLocation ? String(mapped.storageLocation) : undefined,
              notes: mapped.description ? String(mapped.description) : undefined,
              checkedInAt: mapped.checkedInAt ? new Date(String(mapped.checkedInAt)) : new Date(),
              customerId,
            },
          });
          importedIds.push(pkg.id);
        }
      } catch (err) {
        console.error(`Row ${i + 1} import error:`, err);
      }
    }

    // Log the migration
    await prisma.auditLog.create({
      data: {
        action: 'LEGACY_MIGRATION',
        entityType: 'migration',
        entityId: preset ?? 'custom',
        details: JSON.stringify({
          description: `Imported ${importedIds.length} ${config.targetModel}(s) from legacy ${preset ?? 'custom'} format`,
          preset, totalRows: result.totalRows,
          imported: importedIds.length, skipped: result.skippedRows,
        }),
        userId: user.id,
      },
    });

    return NextResponse.json({
      ...result,
      mode: 'execute',
      importedIds,
      importedCount: importedIds.length,
    });
  } catch (error) {
    console.error('Legacy import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

/** GET /api/migration/legacy-import — returns available presets */
export async function GET() {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    presets: Object.entries(LEGACY_PRESETS).map(([key, config]) => ({
      key,
      targetModel: config.targetModel,
      sourceFormat: config.sourceFormat,
      fieldCount: config.fieldMappings.length,
      requiredFields: config.fieldMappings.filter(f => f.required).map(f => f.source),
    })),
  });
}
