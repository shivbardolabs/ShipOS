import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  parsePMToolsExport,
  dryRun,
  mapCustomer,
  mapPackage,
  mapBilling,
  type PMToolsCsvData,
} from '@/lib/migration/csv-parser';

/**
 * POST /api/migration/csv-import
 *
 * Handles PMTools CSV migration in two modes:
 * - mode=dry_run: Parse + validate + report conflicts without writing
 * - mode=execute: Create Customer, Package, Invoice records
 *
 * Body: { mode: 'dry_run' | 'execute', files: { CUSTOMER: string, MBDETAIL?: string, PACKAGES?: string, BILLING?: string } }
 */
export async function POST(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { mode, files } = body as {
      mode: 'dry_run' | 'execute';
      files: Record<string, string>;
    };

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No CSV files provided' }, { status: 400 });
    }

    // Parse CSV files
    const { data, stats } = parsePMToolsExport(files);

    if (mode === 'dry_run') {
      // Get existing PMBs for conflict detection
      const existingCustomers = await prisma.customer.findMany({
        where: { tenantId: user.tenantId, deletedAt: null },
        select: { pmbNumber: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingPmbs = existingCustomers.map((c: any) => c.pmbNumber);

      const dryRunResult = dryRun(data, existingPmbs);

      return NextResponse.json({
        mode: 'dry_run',
        parseStats: stats,
        validation: dryRunResult,
      });
    }

    // Execute mode — create records
    const migrationRun = await prisma.migrationRun.create({
      data: {
        sourceFile: 'csv-import',
        sourceSystem: 'pmtools',
        status: 'migrating',
        startedAt: new Date(),
        sourceCustomers: stats.customers,
        sourcePackages: stats.packages,
        sourceShipments: stats.billing,
      },
    });

    try {
      const results = await executeMigration(data, user.tenantId, migrationRun.id);

      // Update migration run
      await prisma.migrationRun.update({
        where: { id: migrationRun.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          migratedCustomers: results.customers,
          migratedPackages: results.packages,
          migratedInvoices: results.invoices,
          errorLog: results.errors.length > 0 ? JSON.stringify(results.errors) : null,
        },
      });

      return NextResponse.json({
        mode: 'execute',
        migrationId: migrationRun.id,
        results,
      });
    } catch (err) {
      await prisma.migrationRun.update({
        where: { id: migrationRun.id },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        },
      });
      throw err;
    }
  } catch (err) {
    console.error('[POST /api/migration/csv-import]', err);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}

async function executeMigration(
  data: PMToolsCsvData,
  tenantId: string,
  migrationId: string,
): Promise<{
  customers: number;
  packages: number;
  invoices: number;
  errors: Array<{ entity: string; sourceId: string; message: string }>;
}> {
  const errors: Array<{ entity: string; sourceId: string; message: string }> = [];
  let customersCreated = 0;
  let packagesCreated = 0;
  let invoicesCreated = 0;

  // Build mailbox lookup
  const mailboxByCustomer = new Map<number, (typeof data.mailboxes)[0]>();
  for (const mb of data.mailboxes) {
    if (mb.CUSTOMERREF) {
      mailboxByCustomer.set(mb.CUSTOMERREF, mb);
    }
  }

  // Customer source ID → ShipOS ID mapping
  const customerIdMap = new Map<string, string>();

  // 1. Migrate customers
  for (const pm of data.customers) {
    try {
      const mapped = mapCustomer(pm, mailboxByCustomer.get(pm.CUSTOMERID));

      // Check for duplicate PMB
      const existing = await prisma.customer.findUnique({
        where: { pmbNumber: mapped.pmbNumber },
      });
      if (existing) {
        errors.push({
          entity: 'customer',
          sourceId: mapped.sourceId,
          message: `PMB ${mapped.pmbNumber} already exists — skipped`,
        });
        customerIdMap.set(mapped.sourceId, existing.id);
        continue;
      }

      const customer = await prisma.customer.create({
        data: {
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          businessName: mapped.businessName,
          email: mapped.email,
          phone: mapped.phone,
          pmbNumber: mapped.pmbNumber,
          status: mapped.status,
          dateOpened: mapped.dateOpened || new Date(),
          renewalDate: mapped.renewalDate,
          renewalStatus: 'current',
          tenantId,
          sourceId: mapped.sourceId,
          migrationId,
        },
      });

      customerIdMap.set(mapped.sourceId, customer.id);
      customersCreated++;
    } catch (err) {
      errors.push({
        entity: 'customer',
        sourceId: String(pm.CUSTOMERID),
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // 2. Migrate packages
  for (const pm of data.packages) {
    try {
      const mapped = mapPackage(pm);
      const customerId = customerIdMap.get(mapped.customerSourceId);

      if (!customerId) {
        errors.push({
          entity: 'package',
          sourceId: mapped.sourceId,
          message: `Customer ${mapped.customerSourceId} not found — skipped`,
        });
        continue;
      }

      await prisma.package.create({
        data: {
          trackingNumber: mapped.trackingNumber,
          carrier: mapped.carrier,
          senderName: mapped.senderName,
          packageType: mapped.packageType,
          status: mapped.status,
          checkedInAt: mapped.checkedInAt,
          releasedAt: mapped.releasedAt,
          notes: mapped.notes,
          customerId,
          sourceId: mapped.sourceId,
          migrationId,
        },
      });

      packagesCreated++;
    } catch (err) {
      errors.push({
        entity: 'package',
        sourceId: String(pm.PKGRECVXNID),
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // 3. Migrate billing/invoices
  for (const pm of data.billing) {
    try {
      const mapped = mapBilling(pm);
      const customerId = customerIdMap.get(mapped.customerSourceId);

      await prisma.invoice.create({
        data: {
          invoiceNumber: mapped.invoiceNumber,
          customerId: customerId || null,
          type: mapped.type,
          amount: mapped.amount,
          status: mapped.status,
          sourceId: mapped.sourceId,
          migrationId,
        },
      });

      invoicesCreated++;
    } catch (err) {
      errors.push({
        entity: 'invoice',
        sourceId: String(pm.SHIPMENTXNID),
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return {
    customers: customersCreated,
    packages: packagesCreated,
    invoices: invoicesCreated,
    errors,
  };
}
