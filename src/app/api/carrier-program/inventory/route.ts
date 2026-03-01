import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, validateQuery, ok, created, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function daysRemaining(checkedInAt: Date, maxHoldDays: number): number {
  const held = Math.floor((Date.now() - checkedInAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, maxHoldDays - held);
}

function holdStatus(checkedInAt: Date, maxHoldDays: number): 'ok' | 'warning' | 'overdue' {
  const remaining = daysRemaining(checkedInAt, maxHoldDays);
  if (remaining === 0) return 'overdue';
  if (remaining <= 3) return 'warning';
  return 'ok';
}

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetInventoryQuerySchema = z.object({
  program: z.string().optional(),
  status: z.string().optional(),
  holdStatus: z.enum(['ok', 'warning', 'overdue']).optional(),
});

const IntakePackageBodySchema = z.object({
  enrollmentId: z.string().min(1),
  trackingNumber: z.string().min(1),
  carrier: z.string().min(1),
  packageType: z.string().optional().default('medium'),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
});

const MAX_HOLD_DAYS = 14;

/**
 * GET /api/carrier-program/inventory
 * List carrier program hold inventory with aging status.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetInventoryQuerySchema);
  const tenantId = user.tenantId!;

  const packages = await prisma.carrierProgramPackage.findMany({
    where: {
      enrollment: { tenantId },
      status: query.status ?? 'held',
      ...(query.program ? { enrollment: { tenantId, program: query.program } } : {}),
    },
    orderBy: { checkedInAt: 'asc' },
    include: {
      enrollment: {
        select: {
          id: true,
          program: true,
          customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true } },
        },
      },
    },
  });

  const enriched = packages.map((pkg) => ({
    ...pkg,
    daysRemaining: daysRemaining(pkg.checkedInAt, MAX_HOLD_DAYS),
    holdStatus: holdStatus(pkg.checkedInAt, MAX_HOLD_DAYS),
    daysHeld: Math.floor((Date.now() - pkg.checkedInAt.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Filter by holdStatus if requested
  const filtered = query.holdStatus
    ? enriched.filter((p) => p.holdStatus === query.holdStatus)
    : enriched;

  return ok({
    packages: filtered,
    summary: {
      total: filtered.length,
      ok: enriched.filter((p) => p.holdStatus === 'ok').length,
      warning: enriched.filter((p) => p.holdStatus === 'warning').length,
      overdue: enriched.filter((p) => p.holdStatus === 'overdue').length,
    },
  });
});

/**
 * POST /api/carrier-program/inventory
 * Intake a carrier program package.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, IntakePackageBodySchema);
  const tenantId = user.tenantId!;

  // Verify enrollment belongs to tenant
  const enrollment = await prisma.carrierProgramEnrollment.findFirst({
    where: { id: body.enrollmentId, tenantId },
    include: { customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true } } },
  });

  if (!enrollment) return notFound('Enrollment not found');

  const pkg = await prisma.carrierProgramPackage.create({
    data: {
      enrollmentId: body.enrollmentId,
      trackingNumber: body.trackingNumber,
      carrier: body.carrier,
      packageType: body.packageType,
      storageLocation: body.storageLocation ?? null,
      notes: body.notes ?? null,
      status: 'held',
      checkedInAt: new Date(),
      checkedInBy: user.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'carrier_program.package_intake',
      entityType: 'carrier_program_package',
      entityId: pkg.id,
      userId: user.id,
      details: JSON.stringify({
        trackingNumber: body.trackingNumber,
        carrierProgram: enrollment.program,
        customerName: `${enrollment.customer.firstName} ${enrollment.customer.lastName}`,
        pmbNumber: enrollment.customer.pmbNumber,
      }),
    },
  });

  return created({ package: pkg });
});
