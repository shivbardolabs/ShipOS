import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler, badRequest } from '@/lib/api-utils';

/**
 * POST /api/migration/analyze
 * Accepts a .7z file upload (formData) and estimates record counts
 * based on file size ratios.
 *
 * SECURITY FIX: Now requires authentication.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return badRequest('No file uploaded');
  }

  // Validate it looks like a 7z file (magic bytes: 37 7A BC AF 27 1C)
  const buffer = Buffer.from(await file.arrayBuffer());
  const header = buffer.subarray(0, 6);
  const sevenZipMagic = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
  if (!header.equals(sevenZipMagic)) {
    return badRequest('File does not appear to be a valid .7z archive');
  }

  const fileSizeBytes = buffer.length;
  const fileSizeMb = fileSizeBytes / (1024 * 1024);

  // Estimate based on observed ratios from past migrations
  const estimatedCustomers = Math.round(fileSizeMb * 120);
  const estimatedPackages = Math.round(fileSizeMb * 850);
  const estimatedMailPieces = Math.round(fileSizeMb * 400);
  const estimatedShipments = Math.round(fileSizeMb * 200);

  return NextResponse.json({
    fileName: file.name,
    fileSizeBytes,
    fileSizeMb: parseFloat(fileSizeMb.toFixed(2)),
    estimates: {
      customers: estimatedCustomers,
      packages: estimatedPackages,
      mailPieces: estimatedMailPieces,
      shipments: estimatedShipments,
      total: estimatedCustomers + estimatedPackages + estimatedMailPieces + estimatedShipments,
    },
    note: 'These are rough estimates based on file size. Actual counts may vary.',
  });
});
