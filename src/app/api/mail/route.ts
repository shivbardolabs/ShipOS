import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, notFound, badRequest, forbidden } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { onMailAction } from '@/lib/charge-event-service';
import type { Prisma } from '@prisma/client';

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetMailQuerySchema = z.object({
  status: z.string().optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const PatchMailBodySchema = z.object({
  id: z.string().min(1),
  action: z.enum(['forward', 'scan', 'shred', 'hold', 'return']),
  notes: z.string().optional(),
  forwardAddress: z.string().optional(),
});

/**
 * GET /api/mail
 * List mail pieces for the tenant with filtering and pagination.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetMailQuerySchema);

  const where: Prisma.MailPieceWhereInput = {
    customer: { tenantId: user.tenantId! },
  };
  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;

  const skip = (query.page - 1) * query.limit;

  const [mailPieces, total] = await Promise.all([
    prisma.mailPiece.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip,
      take: query.limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, pmbNumber: true },
        },
      },
    }),
    prisma.mailPiece.count({ where }),
  ]);

  const serialized = mailPieces.map((m) => ({
    ...m,
    receivedAt: m.receivedAt?.toISOString() ?? null,
    actionedAt: m.actionedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return ok({
    mailPieces: serialized,
    total,
    page: query.page,
    limit: query.limit,
  });
});

/**
 * PATCH /api/mail
 * Update a mail piece action (forward, scan, shred, hold, return).
 * BAR-308: Auto-generates charge event for billable actions.
 */
export const PATCH = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, PatchMailBodySchema);

  const mailPiece = await prisma.mailPiece.findFirst({
    where: { id: body.id, customer: { tenantId: user.tenantId! } },
    include: { customer: { select: { id: true, pmbNumber: true } } },
  });

  if (!mailPiece) return notFound('Mail piece not found');

  if (mailPiece.status === 'actioned') {
    return badRequest('Mail piece has already been actioned');
  }

  const updateData: Prisma.MailPieceUpdateInput = {
    action: body.action,
    status: 'actioned',
    actionedAt: new Date(),
    actionedById: user.id,
    notes: body.notes ?? null,
  };

  if (body.action === 'forward' && body.forwardAddress) {
    updateData.forwardAddress = body.forwardAddress;
  }

  const updated = await prisma.mailPiece.update({
    where: { id: body.id },
    data: updateData,
  });

  // BAR-308: Auto-generate charge event for billable mail actions
  const billableActions = ['forward', 'scan', 'shred'];
  if (billableActions.includes(body.action) && mailPiece.customer) {
    try {
      await onMailAction({
        tenantId: user.tenantId!,
        customerId: mailPiece.customer.id,
        pmbNumber: mailPiece.customer.pmbNumber,
        mailPieceId: mailPiece.id,
        action: body.action,
        createdById: user.id,
      });
    } catch (err) {
      console.error('[mail] Charge event generation failed:', err);
    }
  }

  return ok({ mailPiece: { ...updated, actionedAt: updated.actionedAt?.toISOString() ?? null } });
});
