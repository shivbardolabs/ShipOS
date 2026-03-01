import { NextRequest, NextResponse } from 'next/server';
import { parseFirebirdBackup } from '@/lib/migration/firebird-parser';
import type { MigrationAnalysis } from '@/lib/migration/types';

/**
 * POST /api/migration/analyze
 *
 * Accepts a PostalMate .7z backup file, parses its structure,
 * and returns an analysis of the data to be migrated.
 *
 * Flow:
 * 1. Validate the uploaded file (.7z extension)
 * 2. Read the file into a buffer
 * 3. Parse using the Firebird binary parser
 * 4. Map parser results to the MigrationAnalysis format
 * 5. Return analysis with table counts and confidence level
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.7z') && !file.name.endsWith('.fbk') && !file.name.endsWith('.gbk')) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a PostalMate .7z backup, .fbk, or .gbk file.' },
        { status: 400 }
      );
    }

    const fileSizeMB = file.size / (1024 * 1024);

    // Read file into buffer for parsing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse using the Firebird binary parser
    const parseResult = await parseFirebirdBackup(buffer, file.name);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to parse backup file.',
          details: parseResult.errors,
          fileInfo: parseResult.fileInfo,
        },
        { status: 400 }
      );
    }

    // Map parser results to MigrationAnalysis format for UI compatibility
    const tableCountMap: Record<string, number> = {};
    for (const table of parseResult.tables) {
      tableCountMap[table.name] = table.recordCount;
    }

    const analysis: MigrationAnalysis = {
      sourceFile: file.name,
      databaseVersion: parseResult.databaseVersion || 'Unknown',
      dateRange: {
        min: '2007-05-21', // PostalMate typical start date
        max: new Date().toISOString().split('T')[0],
      },
      counts: {
        customers: tableCountMap['CUSTOMER'] ?? 0,
        shipToAddresses: tableCountMap['SHIPTO'] ?? 0,
        shipments: tableCountMap['SHIPMENTXN'] ?? 0,
        packages: tableCountMap['PACKAGEXN'] ?? 0,
        packageCheckins: tableCountMap['PKGRECVXN'] ?? 0,
        products: tableCountMap['PRODUCTTBL'] ?? 0,
        transactions: tableCountMap['INVOICETBL'] ?? 0,
        lineItems: tableCountMap['INVOICEITEM'] ?? 0,
        payments: tableCountMap['PAYMENTTBL'] ?? 0,
        mailboxes: tableCountMap['MBDETAIL'] ?? 0,
        carriers: tableCountMap['CARRIER'] ?? 0,
        departments: tableCountMap['DEPARTMENT'] ?? 0,
      },
      carriers: [
        { id: 2, name: 'United Parcel Service', status: 'A' },
        { id: 3, name: 'United States Postal Service', status: 'A' },
        { id: 4, name: 'FedEx Express', status: 'A' },
        { id: 5, name: 'FedEx Ground', status: 'A' },
        { id: 6, name: 'DHL', status: 'A' },
      ],
      departments: [],
    };

    // Include detailed table info for the advanced view
    const tables = parseResult.tables.map((t) => ({
      name: t.name,
      recordCount: t.recordCount,
      columns: t.columns,
      sampleRecordCount: t.sampleRecords.length,
    }));

    return NextResponse.json({
      success: true,
      analysis,
      tables,
      parseInfo: {
        mode: parseResult.parseMode,
        confidence: parseResult.confidence,
        format: parseResult.fileInfo.format,
        containedFiles: parseResult.fileInfo.containedFiles,
        warnings: parseResult.errors,
      },
      fileInfo: {
        name: file.name,
        sizeMB: Math.round(fileSizeMB * 10) / 10,
        format: parseResult.fileInfo.format === '7z'
          ? '7z (PostalMate Firebird Backup)'
          : `Firebird Backup (${parseResult.fileInfo.format})`,
      },
    });
  } catch (error) {
    console.error('Migration analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze backup file.' },
      { status: 500 }
    );
  }
}
