import { withApiHandler, validateQuery, validateBody, ok, badRequest, notFound, ApiError } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/packages/rts
 *
 * List RTS records with filtering and pagination.
 * Query params: step?, reason?, carrier?, search?, page?, limit?
 */

const RtsReasons = [
  'no_matching_customer',
  'closed_pmb',
  'expired_pmb',
  'customer_request',
  'storage_policy_expiry',
  'refused',
  'unclaimed',
  'other',
] as const;

const RtsSteps = ['initiated', 'label_printed', 'carrier_handoff', 'completed', 'cancelled'] as const;

const RtsQuerySchema = z.object({
  step: z.enum(RtsSteps).optional(),
  reason: z.enum(RtsReasons).optional(),
  carrier: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApiHandler(async (request, { user }) => {
  const query = validateQuery(request, RtsQuerySchema);
  const { step, reason, carrier, search, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ReturnToSenderWhereInput = {};

  // Tenant scoping
  if (user.role !== 'superadmin' && user.tenantId) {
    where.tenantId = user.tenantId;
  }

  if (step) where.step = step;
  if (reason) where.reason = reason;
  if (carrier) where.carrier = carrier;
  if (search) {
    where.OR = [
      { returnTrackingNumber: { contains: search, mode: 'insensitive' } },
      { pmbNumber: { contains: search, mode: 'insensitive' } },
      { reasonDetail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.returnToSender.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.returnToSender.count({ where }),
  ]);

  // Fetch related package/mail info in a second query for enrichment
  const packageIds = records.filter((r) => r.packageId).map((r) => r.packageId!);
  const mailIds = records.filter((r) => r.mailPieceId).map((r) => r.mailPieceId!);

  const [packages, mailPieces] = await Promise.all([
    packageIds.length > 0
      ? prisma.package.findMany({
          where: { id: { in: packageIds } },
          select: {
            id: true,
            trackingNumber: true,
            carrier: true,
            packageType: true,
            senderName: true,
            storageLocation: true,
            customer: { select: { id: true, firstName: true, lastName: true, pmbNumber: true } },
          },
        })
      : [],
    mailIds.length > 0
      ? prisma.mailPiece.findMany({
          where: { id: { in: mailIds } },
          select: { id: true, type: true, sender: true },
        })
      : [],
  ]);

  const pkgMap = new Map(packages.map((p) => [p.id, p]));
  const mailMap = new Map(mailPieces.map((m) => [m.id, m]));

  const enriched = records.map((r) => ({
    ...r,
    initiatedAt: r.initiatedAt.toISOString(),
    labelPrintedAt: r.labelPrintedAt?.toISOString() ?? null,
    carrierHandoffAt: r.carrierHandoffAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    package: r.packageId ? pkgMap.get(r.packageId) ?? null : null,
    mailPiece: r.mailPieceId ? mailMap.get(r.mailPieceId) ?? null : null,
  }));

  return ok({ records: enriched, total, page, limit });
});

/**
 * POST /api/packages/rts
 *
 * Initiate a Return to Sender action for a package or mail piece.
 * Requires confirmation (front-end shows dialog before calling).
 */

const RtsCreateSchema = z.object({
  packageId: z.string().optional(),
  mailPieceId: z.string().optional(),
  reason: z.enum(RtsReasons),
  reasonDetail: z.string().optional(),
  carrier: z.string().optional(),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'RTS must be explicitly confirmed to prevent accidental returns.' }),
  }),
}).refine(
  (data) => data.packageId || data.mailPieceId,
  { message: 'Either packageId or mailPieceId is required.' },
);

export const POST = withApiHandler(async (request, { user }) => {
  const { packageId, mailPieceId, reason, reasonDetail, carrier } =
    await validateBody(request, RtsCreateSchema);

  // Resolve item details for audit trail
  let customerId: string | null = null;
  let pmbNumber: string | null = null;
  let entityLabel = '';
  let resolvedCarrier = carrier || null;

  if (packageId) {
    const pkg = await prisma.package.findFirst({
      where: {
        id: packageId,
        ...(user.role !== 'superadmin' && user.tenantId
          ? { customer: { tenantId: user.tenantId } }
          : {}),
      },
      include: { customer: { select: { id: true, pmbNumber: true, firstName: true, lastName: true } } },
    });
    if (!pkg) {
      notFound('Package not found.');
    }
    // Prevent RTS on already-released or already-RTS packages
    if (['released', 'rts_initiated', 'rts_labeled', 'rts_completed'].includes(pkg.status)) {
      throw new ApiError(
        `Cannot RTS a package with status "${pkg.status}".`,
        409,
      );
    }
    customerId = pkg.customer?.id ?? null;
    pmbNumber = pkg.customer?.pmbNumber ?? null;
    entityLabel = pkg.trackingNumber || pkg.id;
    resolvedCarrier = resolvedCarrier || pkg.carrier;

    // Update package status
    await prisma.package.update({
      where: { id: packageId },
      data: { status: 'rts_initiated' },
    });
  }

  if (mailPieceId) {
    const mail = await prisma.mailPiece.findFirst({
      where: {
        id: mailPieceId,
        ...(user.role !== 'superadmin' && user.tenantId
          ? { customer: { tenantId: user.tenantId } }
          : {}),
      },
      include: { customer: { select: { id: true, pmbNumber: true } } },
    });
    if (!mail) {
      notFound('Mail piece not found.');
    }
    customerId = mail.customer?.id ?? null;
    pmbNumber = mail.customer?.pmbNumber ?? null;
    entityLabel = mail.sender || mail.id;
  }

  // -- Create RTS record --
  const rts = await prisma.returnToSender.create({
    data: {
      tenantId: user.tenantId || '',
      packageId: packageId || null,
      mailPieceId: mailPieceId || null,
      reason,
      reasonDetail: reasonDetail?.trim() || null,
      step: 'initiated',
      carrier: resolvedCarrier,
      initiatedById: user.id,
      customerId,
      pmbNumber,
    },
  });

  // -- Audit log --
  await prisma.auditLog.create({
    data: {
      action: 'rts.initiated',
      entityType: packageId ? 'package' : 'mail',
      entityId: packageId || mailPieceId!,
      details: JSON.stringify({
        rtsId: rts.id,
        reason,
        reasonDetail: reasonDetail || null,
        carrier: resolvedCarrier,
        trackingNumber: entityLabel,
        customerId,
        pmbNumber,
        description: `Return to Sender initiated for ${packageId ? 'package' : 'mail'} ${entityLabel} — reason: ${reason}`,
      }),
      userId: user.id,
    },
  });

  return ok({ success: true, rts });
});
