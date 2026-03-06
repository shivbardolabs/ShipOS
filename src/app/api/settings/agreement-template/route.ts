import { withApiHandler, validateBody, ok, badRequest, forbidden } from '@/lib/api-utils';
import { z } from 'zod';
import prisma from '@/lib/prisma';

/* ── Schemas ───────────────────────────────────────────────────────────────── */

const SaveTemplateSchema = z.object({
  content: z.string().min(1),
  name: z.string().optional(),
});

/**
 * GET /api/settings/agreement-template
 * Returns the default service agreement template.
 */
export const GET = withApiHandler(async (request, { user }) => {
  const template = await prisma.mailboxAgreementTemplate.findFirst({
    where: { isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });

  return ok({
    content: template?.content || null,
    name: template?.name || null,
    id: template?.id || null,
  });
});

/**
 * POST /api/settings/agreement-template
 * Creates or updates the default service agreement template.
 */
export const POST = withApiHandler(async (request, { user }) => {
  if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
    forbidden('Insufficient permissions');
  }

  const { content, name } = await validateBody(request, SaveTemplateSchema);

  // Find existing default template
  const existing = await prisma.mailboxAgreementTemplate.findFirst({
    where: { isDefault: true },
  });

  let template;
  if (existing) {
    template = await prisma.mailboxAgreementTemplate.update({
      where: { id: existing.id },
      data: {
        content,
        name: name || existing.name,
      },
    });
  } else {
    template = await prisma.mailboxAgreementTemplate.create({
      data: {
        name: name || 'Default Service Agreement',
        content,
        isDefault: true,
      },
    });
  }

  return ok({ template });
});
