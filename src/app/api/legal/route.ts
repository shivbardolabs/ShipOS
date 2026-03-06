import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, ok, notFound } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const GetLegalQuerySchema = z.object({
  type: z.enum(['terms', 'privacy']),
});

/**
 * GET /api/legal?type=terms|privacy
 * Returns the active legal document of the requested type.
 *
 * Intentionally public — serves Terms of Service and Privacy Policy pages
 * that must be accessible before a user has logged in.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const query = validateQuery(request, GetLegalQuerySchema);

  const doc = await prisma.legalDocument.findFirst({
    where: { type: query.type, isActive: true },
    orderBy: { effectiveDate: 'desc' },
  });

  if (!doc) return notFound(`No active ${query.type} document found`);

  return ok({
    type: doc.type,
    title: doc.title,
    content: doc.content,
    version: doc.version,
    effectiveDate: doc.effectiveDate.toISOString(),
  });
}, { public: true });
