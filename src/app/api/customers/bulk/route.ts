import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withApiHandler } from '@/lib/api-utils';

/**
 * POST /api/customers/bulk
 *
 * Bulk-create customers from a CSV import.
 * Body: { customers: Array<{ firstName, lastName, email?, phone?, businessName?, pmbNumber?, platform?, billingTerms?, notes? }> }
 *
 * Returns created/skipped/error counts and the created customer IDs.
 */
export const POST = withApiHandler(async (request, { user }) => {
  try {
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await request.json();
    const { customers } = body as {
      customers: Array<{
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        businessName?: string;
        pmbNumber?: string;
        platform?: string;
        billingTerms?: string;
        notes?: string;
      }>;
    };

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: 'No customers provided' }, { status: 400 });
    }

    // Cap at 500 per request to avoid timeouts
    if (customers.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 customers per import. Please split into smaller batches.' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; field: string; message: string }>,
      createdIds: [] as string[],
    };

    for (let i = 0; i < customers.length; i++) {
      const row = customers[i];

      // Validate required fields
      if (!row.firstName?.trim() || !row.lastName?.trim()) {
        results.errors.push({
          row: i + 1,
          field: !row.firstName?.trim() ? 'firstName' : 'lastName',
          message: 'First name and last name are required',
        });
        results.skipped++;
        continue;
      }

      // Generate PMB number if not provided
      const pmbNumber =
        row.pmbNumber?.trim() || `PMB-${Date.now().toString(36).toUpperCase()}${i}`;

      // Check for duplicate PMB
      const existing = await prisma.customer.findUnique({
        where: { pmbNumber },
      });
      if (existing) {
        results.errors.push({
          row: i + 1,
          field: 'pmbNumber',
          message: `PMB ${pmbNumber} already exists — skipped`,
        });
        results.skipped++;
        continue;
      }

      // Validate platform value
      const validPlatforms = ['physical', 'iPostal', 'anytime', 'postscan', 'other'];
      const platform = validPlatforms.includes(row.platform ?? '')
        ? row.platform!
        : 'physical';

      try {
        const customer = await prisma.customer.create({
          data: {
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            businessName: row.businessName?.trim() || null,
            pmbNumber,
            platform,
            billingTerms: row.billingTerms?.trim() || null,
            notes: row.notes?.trim() || null,
            status: 'active',
            form1583Status: 'pending',
            tenantId: user.tenantId,
          },
        });
        results.created++;
        results.createdIds.push(customer.id);
      } catch (err) {
        results.errors.push({
          row: i + 1,
          field: '',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        results.skipped++;
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'BULK_CUSTOMER_IMPORT',
        entityType: 'customer',
        entityId: 'bulk',
        details: JSON.stringify({
          description: `Bulk imported ${results.created} customer(s) from CSV`,
          total: customers.length,
          created: results.created,
          skipped: results.skipped,
          errorCount: results.errors.length,
        }),
        userId: user.id,
      },
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error('[POST /api/customers/bulk]', err);
    return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 });
  }
});
