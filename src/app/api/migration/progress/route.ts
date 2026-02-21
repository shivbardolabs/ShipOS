import { NextRequest, NextResponse } from 'next/server';
import { getMigrationProgress } from '@/lib/migration/engine';

/**
 * GET /api/migration/progress?id=mig_xxx
 *
 * Returns the current progress of a running migration.
 */
export async function GET(request: NextRequest) {
  const migrationId = request.nextUrl.searchParams.get('id');

  if (!migrationId) {
    return NextResponse.json(
      { error: 'Missing migration ID' },
      { status: 400 }
    );
  }

  const progress = getMigrationProgress(migrationId);

  if (!progress) {
    return NextResponse.json(
      { error: 'Migration not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    progress,
  });
}
