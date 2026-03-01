import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, validateQuery, ok, created, badRequest, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetCheckoutsQuerySchema = z.object({
  status: z.string().optional(),
  program: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const CreateCheckoutBodySchema = z.object({
  enrollmentId: z.string().min(1),
  packages: z.array(z.object({
    trackingNumber: z.string().min(1),
    carrier: z.string().min(1),
  })).min(1),
  idVerification: z.object({
    idType: z.string().min(1),
    idNumber: z.string().min(1),
    verified: z.boolean(),
  }),
  signature: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/carrier-program/checkout
 * List checkout transactions for the current tenant.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetCheckoutsQuerySchema);
  const tenantId = user.tenantId!;
  const skip = (query.page - 1) * query.limit;

  const where: Prisma.CarrierProgramCheckoutWhereInput = { tenantId };
  if (query.status) where.status = query.status;

  const [checkouts, total] = await Promise.all([
    prisma.carrierProgramCheckout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        packages: true,
        enrollment: { select: { id: true, program: true, customerId: true } },
      },
    }),
    prisma.carrierProgramCheckout.count({ where }),
  ]);

  return ok({ checkouts, total, page: query.page, limit: query.limit });
});

/**
 * POST /api/carrier-program/checkout
 * Process a carrier program package checkout with ID verification.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, CreateCheckoutBodySchema);
  const tenantId = user.tenantId!;

  // Verify enrollment belongs to tenant
  const enrollment = await prisma.carrierProgramEnrollment.findFirst({
    where: { id: body.enrollmentId, tenantId },
    include: { customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true } } },
  });

  if (!enrollment) return notFound('Enrollment not found');

  if (!body.idVerification.verified) {
    return badRequest('ID verification is required for carrier program checkout');
  }

  const checkout = await prisma.carrierProgramCheckout.create({
    data: {
      tenantId,
      enrollmentId: body.enrollmentId,
      customerId: enrollment.customerId,
      idType: body.idVerification.idType,
      idNumber: body.idVerification.idNumber,
      idVerified: body.idVerification.verified,
      signature: body.signature ?? null,
      notes: body.notes ?? null,
      status: 'completed',
      checkedOutBy: user.id,
      packages: {
        create: body.packages.map((pkg) => ({
          trackingNumber: pkg.trackingNumber,
          carrier: pkg.carrier,
          status: 'released',
        })),
      },
    },
    include: { packages: true },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'carrier_program.package_checkout',
      entityType: 'carrier_program_checkout',
      entityId: checkout.id,
      userId: user.id,
      details: JSON.stringify({
        program: enrollment.program,
        customerName: `${enrollment.customer.firstName} ${enrollment.customer.lastName}`,
        pmbNumber: enrollment.customer.pmbNumber,
        packageCount: body.packages.length,
        trackingNumbers: body.packages.map((p) => p.trackingNumber),
      }),
    },
  });

  return created({ checkout });
});
