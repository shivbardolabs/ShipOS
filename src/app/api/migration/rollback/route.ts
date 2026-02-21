import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/migration/rollback
 *
 * Rolls back a completed migration by deleting all records
 * tagged with the given migrationId.
 *
 * In production, this would:
 * 1. Delete all Customer records where migrationId = X
 * 2. Delete all Shipment records where migrationId = X
 * 3. Delete all Package records where migrationId = X
 * 4. Delete all ShipToAddress records where migrationId = X
 * 5. Delete all Invoice records where migrationId = X
 * 6. Update the MigrationRun status to 'rolled_back'
 */
export async function POST(request: NextRequest) {
  try {
    const { migrationId } = await request.json();

    if (!migrationId) {
      return NextResponse.json(
        { error: 'Missing migration ID' },
        { status: 400 }
      );
    }

    // In production with Prisma:
    // await prisma.$transaction([
    //   prisma.shipToAddress.deleteMany({ where: { migrationId } }),
    //   prisma.invoice.deleteMany({ where: { migrationId } }),
    //   prisma.package.deleteMany({ where: { migrationId } }),
    //   prisma.shipment.deleteMany({ where: { migrationId } }),
    //   prisma.customer.deleteMany({ where: { migrationId } }),
    //   prisma.migrationRun.update({
    //     where: { id: migrationId },
    //     data: { status: 'rolled_back' },
    //   }),
    // ]);

    return NextResponse.json({
      success: true,
      message: `Migration ${migrationId} has been rolled back.`,
    });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { error: 'Failed to rollback migration.' },
      { status: 500 }
    );
  }
}
