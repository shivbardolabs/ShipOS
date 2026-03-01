import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, validateQuery, ok, created, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { CARRIER_PROGRAMS, PROGRAM_IDS } from '@/lib/carrier-program';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetEnrollmentsQuerySchema = z.object({
  customerId: z.string().optional(),
  program: z.string().optional(),
  status: z.string().optional(),
});

const CreateEnrollmentBodySchema = z.object({
  customerId: z.string().min(1),
  program: z.string().min(1),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/carrier-program/enrollment
 * List carrier program enrollments for the current tenant.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetEnrollmentsQuerySchema);
  const tenantId = user.tenantId!;

  const where: Prisma.CarrierProgramEnrollmentWhereInput = { tenantId };
  if (query.customerId) where.customerId = query.customerId;
  if (query.program) where.program = query.program;
  if (query.status) where.status = query.status;

  const enrollments = await prisma.carrierProgramEnrollment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, pmbNumber: true },
      },
    },
  });

  return ok({
    enrollments,
    availablePrograms: CARRIER_PROGRAMS,
    programIds: PROGRAM_IDS,
  });
});

/**
 * POST /api/carrier-program/enrollment
 * Create or update a carrier program enrollment.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, CreateEnrollmentBodySchema);
  const tenantId = user.tenantId!;

  if (!PROGRAM_IDS.includes(body.program)) {
    return badRequest(`Invalid program: ${body.program}. Valid: ${PROGRAM_IDS.join(', ')}`);
  }

  // Verify customer belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: body.customerId, tenantId },
  });
  if (!customer) return badRequest('Customer not found');

  // Upsert enrollment
  const enrollment = await prisma.carrierProgramEnrollment.upsert({
    where: {
      tenantId_customerId_program: {
        tenantId,
        customerId: body.customerId,
        program: body.program,
      },
    },
    create: {
      tenantId,
      customerId: body.customerId,
      program: body.program,
      status: body.enabled ? 'active' : 'inactive',
    },
    update: {
      status: body.enabled ? 'active' : 'inactive',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'carrier_program.enrollment_updated',
      entityType: 'carrier_program_enrollment',
      entityId: enrollment.id,
      userId: user.id,
      details: JSON.stringify({
        program: body.program,
        enabled: body.enabled,
        customerName: `${customer.firstName} ${customer.lastName}`,
      }),
    },
  });

  return created({ enrollment });
});
