import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, validateQuery, ok, created, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const UploadCheckoutBodySchema = z.object({
  program: z.string().min(1),
  records: z.array(z.object({
    trackingNumber: z.string().min(1),
    checkoutDate: z.string(),
    customerId: z.string().optional(),
    carrier: z.string().optional(),
  })).min(1),
});

const GetReconciliationQuerySchema = z.object({
  program: z.string().optional(),
  month: z.string().optional(), // YYYY-MM
});

/**
 * POST /api/carrier-program/upload
 * Upload batch checkout data to carrier program.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, UploadCheckoutBodySchema);
  const tenantId = user.tenantId!;

  let uploaded = 0;
  let failed = 0;
  const errors: Array<{ trackingNumber: string; error: string }> = [];

  for (const record of body.records) {
    try {
      await prisma.carrierProgramUpload.create({
        data: {
          tenantId,
          program: body.program,
          trackingNumber: record.trackingNumber,
          checkoutDate: new Date(record.checkoutDate),
          customerId: record.customerId ?? null,
          carrier: record.carrier ?? null,
          uploadedBy: user.id,
          status: 'uploaded',
        },
      });
      uploaded++;
    } catch (err) {
      failed++;
      errors.push({
        trackingNumber: record.trackingNumber,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'carrier_program.upload_batch',
      entityType: 'carrier_program_upload',
      entityId: `batch_${Date.now()}`,
      userId: user.id,
      details: JSON.stringify({ program: body.program, uploaded, failed }),
    },
  });

  return created({
    uploaded,
    failed,
    total: body.records.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

/**
 * GET /api/carrier-program/upload
 * Monthly reconciliation report for carrier program uploads.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetReconciliationQuerySchema);
  const tenantId = user.tenantId!;

  // Default to current month
  const now = new Date();
  const month = query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  const where: Record<string, unknown> = {
    tenantId,
    checkoutDate: { gte: startDate, lte: endDate },
  };
  if (query.program) where.program = query.program;

  const uploads = await prisma.carrierProgramUpload.findMany({
    where,
    orderBy: { checkoutDate: 'desc' },
  });

  // Group by program
  const byProgram: Record<string, number> = {};
  for (const u of uploads) {
    byProgram[u.program] = (byProgram[u.program] || 0) + 1;
  }

  return ok({
    month,
    uploads,
    summary: {
      total: uploads.length,
      byProgram,
    },
  });
});
