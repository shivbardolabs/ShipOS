import { NextRequest } from 'next/server';
import { withApiHandler, validateBody, badRequest } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import {
  renderPackageLabel,
  renderRtsLabel,
  renderContactLabel,
  renderSignatureLabel,
} from '@/lib/labels';
import { z } from 'zod';

/* ── Schema ───────────────────────────────────────────────────────────────── */

const PrintLabelBodySchema = z.object({
  template: z.enum(['package', 'rts', 'contact', 'signature']),
  data: z.record(z.unknown()),
  format: z.enum(['html', 'pdf']).optional().default('html'),
});

/**
 * POST /api/labels
 * Render a printable label from a template.
 *
 * SECURITY FIX: Now requires authentication.
 * Pure rendering — no Prisma/tenant logic, but we still require auth
 * since this is called from the authenticated frontend.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await validateBody(request, PrintLabelBodySchema);

  let html: string;
  switch (body.template) {
    case 'package':
      html = renderPackageLabel(body.data);
      break;
    case 'rts':
      html = renderRtsLabel(body.data);
      break;
    case 'contact':
      html = renderContactLabel(body.data);
      break;
    case 'signature':
      html = renderSignatureLabel(body.data);
      break;
    default:
      return badRequest('Unknown template');
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
});
