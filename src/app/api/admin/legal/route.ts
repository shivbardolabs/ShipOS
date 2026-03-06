import { withApiHandler, validateBody, validateQuery, ok, created, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const LegalQuerySchema = z.object({
  type: z.enum(['terms', 'privacy']).optional(),
});

const CreateLegalSchema = z.object({
  type: z.enum(['terms', 'privacy']),
  content: z.string().min(1),
});

/**
 * GET /api/admin/legal?type=terms|privacy
 *
 * Returns legal documents for the given type (all versions, most recent first).
 * Superadmin only.
 */
export const GET = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const query = validateQuery(request, LegalQuerySchema);
  const where = query.type ? { type: query.type } : {};

  const docs = await prisma.legalDocument.findMany({
    where,
    orderBy: [{ type: 'asc' }, { version: 'desc' }],
  });

  return ok({ docs });
});

/**
 * POST /api/admin/legal
 *
 * Create a new version of a legal document (terms or privacy).
 * Automatically deactivates previous versions of the same type.
 * Superadmin only.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'superadmin') {
    forbidden('Superadmin access required');
  }

  const { type, content } = await validateBody(request, CreateLegalSchema);

  // Find the current highest version for this type
  const latest = await prisma.legalDocument.findFirst({
    where: { type },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // Deactivate all previous versions, then create the new one
  await prisma.$transaction([
    prisma.legalDocument.updateMany({
      where: { type, isActive: true },
      data: { isActive: false },
    }),
    prisma.legalDocument.create({
      data: {
        type,
        content: content.trim(),
        version: nextVersion,
        publishedBy: user.id,
        isActive: true,
      },
    }),
  ]);

  // Re-fetch the newly created doc
  const doc = await prisma.legalDocument.findFirst({
    where: { type, version: nextVersion },
  });

  return created({ doc });
});
