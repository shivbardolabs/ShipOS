import { NextRequest, NextResponse } from 'next/server';
import type { MigrationConfig } from '@/lib/migration/types';
import {
  initMigrationProgress,
  updateMigrationProgress,
} from '@/lib/migration/engine';

/**
 * POST /api/migration/start
 *
 * Starts the PostalMate → ShipOS migration process.
 * Returns a migrationId that can be used to poll progress.
 *
 * In production, this would:
 * 1. Create a MigrationRun record in the database
 * 2. Start a background job to process the Firebird data
 * 3. Batch-insert transformed records into ShipOS
 * 4. Update progress in real-time
 */
export async function POST(request: NextRequest) {
  try {
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

    // Generate migration ID
    const migrationId = `mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

    // Start migration in background (simulated for now)
    // In production, this would process the actual Firebird data
    simulateMigration(migrationId).catch(console.error);

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
 * Simulates migration progress for the initial version.
 * In production, this would be replaced with actual Firebird data processing.
 */
async function simulateMigration(migrationId: string) {
  const entityOrder = ['customers', 'addresses', 'shipments', 'packages', 'invoices'];

  for (const entity of entityOrder) {
    const progress = await import('@/lib/migration/engine').then(m => m.getMigrationProgress(migrationId));
    if (!progress) return;

    const entityData = progress.entities[entity];
    if (!entityData || entityData.total === 0) {
      entityData.status = 'skipped';
      continue;
    }

    entityData.status = 'in_progress';
    updateMigrationProgress(migrationId, {
      currentEntity: entity,
    });

    // Simulate processing in batches
    const batchSize = Math.max(100, Math.ceil(entityData.total / 20));
    let processed = 0;

    while (processed < entityData.total) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

      const thisBatch = Math.min(batchSize, entityData.total - processed);
      const errors = Math.random() < 0.02 ? 1 : 0; // ~2% error rate

      processed += thisBatch;
      entityData.migrated = processed - errors;
      entityData.errors += errors;

      updateMigrationProgress(migrationId, {
        currentProgress: Object.values(progress.entities)
          .reduce((sum, e) => sum + e.migrated + e.errors, 0),
      });
    }

    entityData.status = 'completed';
  }

  // Mark complete
  updateMigrationProgress(migrationId, {
    status: 'completed',
    currentEntity: '',
  });
}
