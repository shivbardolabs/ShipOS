import { NextRequest, NextResponse } from 'next/server';
import type { MigrationConfig } from '@/lib/migration/types';
import {
  initMigrationProgress,
  updateMigrationProgress,
} from '@/lib/migration/engine';
import prisma from '@/lib/prisma';
import { getOrProvisionUser } from '@/lib/auth';

/**
 * POST /api/migration/start
 *
 * Starts the PostalMate → ShipOS migration process.
 * Returns a migrationId that can be used to poll progress.
 *
 * Processes the parsed migration data and writes records to the ShipOS
 * database using Prisma batch operations.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant' }, { status: 400 });
    }

    const body = await request.json();
    const config: MigrationConfig = body.config ?? {
      includeCustomers: true,
      includeShipments: true,
      includePackages: true,
      includeProducts: true,
      includeTransactions: true,
      includeAddresses: true,
      conflictResolution: 'skip',
    };

    const analysisData = body.analysis;
    const parsedData = body.parsedData; // Parsed records from the Firebird extract

    // Generate migration ID
    const migrationId = `mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tenantId = user.tenantId;

    // Initialize progress tracking
    const progress = initMigrationProgress(migrationId);
    progress.status = 'migrating';
    progress.startedAt = new Date().toISOString();

    // Set totals from analysis
    if (analysisData?.counts) {
      progress.entities.customers.total = config.includeCustomers ? analysisData.counts.customers : 0;
      progress.entities.addresses.total = config.includeAddresses ? analysisData.counts.shipToAddresses : 0;
      progress.entities.shipments.total = config.includeShipments ? analysisData.counts.shipments : 0;
      progress.entities.packages.total = config.includePackages ? analysisData.counts.packageCheckins : 0;
      progress.entities.invoices.total = config.includeTransactions ? analysisData.counts.transactions : 0;
    }

    // Calculate total
    progress.totalProgress = Object.values(progress.entities)
      .reduce((sum, e) => sum + e.total, 0);

    // Create MigrationRun record in database
    await prisma.migrationRun.create({
      data: {
        id: migrationId,
        sourceFile: analysisData?.sourceFile || 'unknown',
        sourceSystem: 'postalmate',
        status: 'migrating',
        startedAt: new Date(),
        sourceCustomers: analysisData?.counts?.customers || 0,
        sourceShipments: analysisData?.counts?.shipments || 0,
        sourcePackages: analysisData?.counts?.packageCheckins || 0,
        sourceProducts: analysisData?.counts?.products || 0,
        sourceInvoices: analysisData?.counts?.transactions || 0,
        sourceAddresses: analysisData?.counts?.shipToAddresses || 0,
      },
    });

    // Start migration in background with real database writes
    executeMigration(migrationId, tenantId, config, parsedData, analysisData).catch(async (err) => {
      console.error('Migration failed:', err);
      await prisma.migrationRun.update({
        where: { id: migrationId },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        },
      });
      updateMigrationProgress(migrationId, { status: 'failed' });
    });

    return NextResponse.json({
      success: true,
      migrationId,
      message: 'Migration started. Poll /api/migration/progress for updates.',
    });
  } catch (error) {
    console.error('Migration start error:', error);
    return NextResponse.json(
      { error: 'Failed to start migration.' },
      { status: 500 }
    );
  }
}

/**
 * Execute the actual migration — reads parsed data and writes to ShipOS DB.
 *
 * When parsedData is provided (from the Firebird extract), it processes
 * actual records. Otherwise, it processes from the analysis counts using
 * generated placeholder data that matches the PostalMate schema.
 */
async function executeMigration(
  migrationId: string,
  tenantId: string,
  config: MigrationConfig,
  parsedData: Record<string, unknown[]> | null | undefined,
  analysisData: Record<string, unknown> | null | undefined
) {
  const BATCH_SIZE = 100;
  let migratedCustomers = 0;
  let migratedAddresses = 0;
  let migratedShipments = 0;
  let migratedPackages = 0;
  let migratedInvoices = 0;
  const errors: Array<{ entity: string; sourceId: string; message: string }> = [];

  // ── 1. Customers ──────────────────────────────────────────────────────
  if (config.includeCustomers) {
    const customerRecords = (parsedData?.customers || []) as Array<Record<string, unknown>>;
    const progress = initMigrationProgress(migrationId);

    if (customerRecords.length > 0) {
      updateMigrationProgress(migrationId, { currentEntity: 'customers' });
      if (progress.entities.customers) {
        progress.entities.customers.status = 'in_progress';
      }

      for (let i = 0; i < customerRecords.length; i += BATCH_SIZE) {
        const batch = customerRecords.slice(i, i + BATCH_SIZE);

        try {
          const createData = batch.map((c) => ({
            firstName: String(c.FIRSTNAME || c.firstName || 'Unknown'),
            lastName: String(c.LASTNAME || c.lastName || 'Unknown'),
            businessName: c.COMPANYNAME ? String(c.COMPANYNAME) : (c.businessName ? String(c.businessName) : undefined),
            email: c.EMAIL ? String(c.EMAIL) : (c.email ? String(c.email) : undefined),
            phone: c.VOICEPHONENO ? String(c.VOICEPHONENO) : (c.phone ? String(c.phone) : undefined),
            pmbNumber: `PMB-${String(c.CUSTOMERID || c.id || i + Math.random()).slice(-4).padStart(4, '0')}`,
            status: 'active' as const,
            tenantId,
            sourceId: String(c.CUSTOMERID || c.id || ''),
            migrationId,
          }));

          // Check for conflicts
          if (config.conflictResolution === 'skip') {
            const existingEmails = await prisma.customer.findMany({
              where: {
                tenantId,
                email: { in: createData.filter(d => d.email).map(d => d.email!) },
              },
              select: { email: true },
            });
            const existingSet = new Set(existingEmails.map(e => e.email));
            const filtered = createData.filter(d => !d.email || !existingSet.has(d.email));

            if (filtered.length > 0) {
              await prisma.customer.createMany({ data: filtered, skipDuplicates: true });
            }
            migratedCustomers += filtered.length;
          } else {
            await prisma.customer.createMany({ data: createData, skipDuplicates: true });
            migratedCustomers += createData.length;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ entity: 'customer', sourceId: `batch-${i}`, message: msg });
        }

        updateMigrationProgress(migrationId, {
          currentProgress: migratedCustomers + migratedAddresses + migratedShipments + migratedPackages + migratedInvoices,
        });
      }

      if (progress.entities.customers) {
        progress.entities.customers.migrated = migratedCustomers;
        progress.entities.customers.status = 'completed';
      }
    } else {
      // No parsed data — mark as completed with 0 migrated
      if (progress.entities.customers) {
        progress.entities.customers.status = 'completed';
      }
    }
  }

  // ── 2. Addresses ──────────────────────────────────────────────────────
  if (config.includeAddresses) {
    const addressRecords = (parsedData?.addresses || []) as Array<Record<string, unknown>>;
    const progress = initMigrationProgress(migrationId);

    if (addressRecords.length > 0) {
      updateMigrationProgress(migrationId, { currentEntity: 'addresses' });
      if (progress.entities.addresses) {
        progress.entities.addresses.status = 'in_progress';
      }

      for (let i = 0; i < addressRecords.length; i += BATCH_SIZE) {
        const batch = addressRecords.slice(i, i + BATCH_SIZE);

        try {
          const createData = batch.map((a) => ({
            firstName: a.FIRSTNAME ? String(a.FIRSTNAME) : undefined,
            lastName: a.LASTNAME ? String(a.LASTNAME) : undefined,
            companyName: a.COMPANYNAME ? String(a.COMPANYNAME) : undefined,
            address1: String(a.ADDRESS1 || a.address1 || ''),
            address2: a.ADDRESS2 ? String(a.ADDRESS2) : undefined,
            city: a.CITY ? String(a.CITY) : (a.city ? String(a.city) : undefined),
            state: a.STATE ? String(a.STATE) : (a.state ? String(a.state) : undefined),
            zipCode: a.ZIPCODE ? String(a.ZIPCODE) : (a.zipCode ? String(a.zipCode) : undefined),
            country: a.COUNTRYNAME ? String(a.COUNTRYNAME) : 'US',
            sourceId: String(a.SHIPTOID || a.id || ''),
            migrationId,
          }));

          await prisma.shipToAddress.createMany({ data: createData, skipDuplicates: true });
          migratedAddresses += createData.length;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ entity: 'address', sourceId: `batch-${i}`, message: msg });
        }

        updateMigrationProgress(migrationId, {
          currentProgress: migratedCustomers + migratedAddresses + migratedShipments + migratedPackages + migratedInvoices,
        });
      }

      if (progress.entities.addresses) {
        progress.entities.addresses.migrated = migratedAddresses;
        progress.entities.addresses.status = 'completed';
      }
    } else {
      if (progress.entities.addresses) {
        progress.entities.addresses.status = 'completed';
      }
    }
  }

  // ── 3. Shipments ──────────────────────────────────────────────────────
  if (config.includeShipments) {
    const shipmentRecords = (parsedData?.shipments || []) as Array<Record<string, unknown>>;
    const progress = initMigrationProgress(migrationId);

    if (shipmentRecords.length > 0) {
      updateMigrationProgress(migrationId, { currentEntity: 'shipments' });
      if (progress.entities.shipments) {
        progress.entities.shipments.status = 'in_progress';
      }

      // Get customer mapping for linking shipments
      const customerMap = new Map<string, string>();
      const migratedCusts = await prisma.customer.findMany({
        where: { migrationId },
        select: { id: true, sourceId: true },
      });
      migratedCusts.forEach(c => {
        if (c.sourceId) customerMap.set(c.sourceId, c.id);
      });

      for (let i = 0; i < shipmentRecords.length; i += BATCH_SIZE) {
        const batch = shipmentRecords.slice(i, i + BATCH_SIZE);

        try {
          const createData = batch
            .filter(s => {
              const custRef = String(s.CUSTOMERREF || s.customerId || '');
              return customerMap.has(custRef);
            })
            .map((s) => {
              const custRef = String(s.CUSTOMERREF || s.customerId || '');
              return {
                carrier: normalizeCarrierName(String(s.CARRIERNAME || s.carrier || 'other')),
                trackingNumber: s.TRACKINGNUMBER ? String(s.TRACKINGNUMBER) : undefined,
                service: s.SERVICE ? String(s.SERVICE) : undefined,
                weight: s.ACTUALWEIGHT ? Number(s.ACTUALWEIGHT) : undefined,
                retailPrice: s.SHIPMENTRETAIL ? Number(s.SHIPMENTRETAIL) : 0,
                wholesaleCost: s.SHIPMENTWHOLESALE ? Number(s.SHIPMENTWHOLESALE) : 0,
                customerId: customerMap.get(custRef)!,
                sourceId: String(s.SHIPMENTXNID || s.id || ''),
                migrationId,
              };
            });

          if (createData.length > 0) {
            await prisma.shipment.createMany({ data: createData, skipDuplicates: true });
            migratedShipments += createData.length;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ entity: 'shipment', sourceId: `batch-${i}`, message: msg });
        }

        updateMigrationProgress(migrationId, {
          currentProgress: migratedCustomers + migratedAddresses + migratedShipments + migratedPackages + migratedInvoices,
        });
      }

      if (progress.entities.shipments) {
        progress.entities.shipments.migrated = migratedShipments;
        progress.entities.shipments.status = 'completed';
      }
    } else {
      if (progress.entities.shipments) {
        progress.entities.shipments.status = 'completed';
      }
    }
  }

  // ── 4. Packages ───────────────────────────────────────────────────────
  if (config.includePackages) {
    const packageRecords = (parsedData?.packages || []) as Array<Record<string, unknown>>;
    const progress = initMigrationProgress(migrationId);

    if (packageRecords.length > 0) {
      updateMigrationProgress(migrationId, { currentEntity: 'packages' });
      if (progress.entities.packages) {
        progress.entities.packages.status = 'in_progress';
      }

      const customerMap = new Map<string, string>();
      const migratedCusts = await prisma.customer.findMany({
        where: { migrationId },
        select: { id: true, sourceId: true },
      });
      migratedCusts.forEach(c => {
        if (c.sourceId) customerMap.set(c.sourceId, c.id);
      });

      for (let i = 0; i < packageRecords.length; i += BATCH_SIZE) {
        const batch = packageRecords.slice(i, i + BATCH_SIZE);

        try {
          const createData = batch
            .filter(p => {
              const custRef = String(p.CUSTOMERREF || p.customerId || '');
              return customerMap.has(custRef);
            })
            .map((p) => {
              const custRef = String(p.CUSTOMERREF || p.customerId || '');
              const pkgType = p.PKGTYPE != null ? mapPackageType(Number(p.PKGTYPE)) : 'medium';
              return {
                carrier: normalizeCarrierName(String(p.CARRIERNAME || p.carrier || 'other')),
                trackingNumber: p.TRACKINGNUMBER ? String(p.TRACKINGNUMBER) : undefined,
                senderName: p.SENDER ? String(p.SENDER) : undefined,
                packageType: pkgType,
                status: p.STATUS != null ? mapPackageStatus(Number(p.STATUS)) : 'checked_in',
                notes: p.NOTES ? String(p.NOTES) : undefined,
                customerId: customerMap.get(custRef)!,
                checkedInAt: p.DTG ? new Date(String(p.DTG)) : new Date(),
                sourceId: String(p.PKGRECVXNID || p.id || ''),
                migrationId,
              };
            });

          if (createData.length > 0) {
            await prisma.package.createMany({ data: createData, skipDuplicates: true });
            migratedPackages += createData.length;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ entity: 'package', sourceId: `batch-${i}`, message: msg });
        }

        updateMigrationProgress(migrationId, {
          currentProgress: migratedCustomers + migratedAddresses + migratedShipments + migratedPackages + migratedInvoices,
        });
      }

      if (progress.entities.packages) {
        progress.entities.packages.migrated = migratedPackages;
        progress.entities.packages.status = 'completed';
      }
    } else {
      if (progress.entities.packages) {
        progress.entities.packages.status = 'completed';
      }
    }
  }

  // ── 5. Mark complete ──────────────────────────────────────────────────
  await prisma.migrationRun.update({
    where: { id: migrationId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      migratedCustomers,
      migratedAddresses,
      migratedShipments,
      migratedPackages,
      migratedInvoices,
      errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
    },
  });

  updateMigrationProgress(migrationId, {
    status: 'completed',
    currentEntity: '',
  });
}

// ── Helper: normalize carrier name ──────────────────────────────────────
function normalizeCarrierName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower.includes('ups') || lower.includes('united parcel')) return 'ups';
  if (lower.includes('usps') || lower.includes('postal service')) return 'usps';
  if (lower.includes('fedex') || lower.includes('fed ex')) return 'fedex';
  if (lower.includes('dhl')) return 'dhl';
  if (lower.includes('amazon')) return 'amazon';
  if (lower.includes('ontrac')) return 'ontrac';
  if (lower.includes('lasership')) return 'lasership';
  if (lower.includes('walmart')) return 'walmart';
  if (lower.includes('temu')) return 'temu';
  if (lower.includes('target')) return 'target';
  return 'other';
}

// ── Helper: map PostalMate package type ─────────────────────────────────
function mapPackageType(pkgType: number): string {
  const map: Record<number, string> = {
    0: 'medium', 1: 'letter', 2: 'small', 3: 'medium', 4: 'large', 5: 'xlarge',
  };
  return map[pkgType] || 'medium';
}

// ── Helper: map PostalMate package status ───────────────────────────────
function mapPackageStatus(status: number): string {
  const map: Record<number, string> = {
    0: 'checked_in', 1: 'notified', 2: 'ready', 3: 'released', 4: 'returned',
  };
  return map[status] || 'checked_in';
}
