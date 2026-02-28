import { NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/settings/agreement-template
 * Returns the default service agreement template.
 */
export async function GET() {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const template = await prisma.mailboxAgreementTemplate.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      content: template?.content || null,
      name: template?.name || null,
      id: template?.id || null,
    });
  } catch (err) {
    console.error('[GET /api/settings/agreement-template]', err);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * POST /api/settings/agreement-template
 * Creates or updates the default service agreement template.
 */
export async function POST(request: Request) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { content, name } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Template content is required' }, { status: 400 });
    }

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

    return NextResponse.json({ template });
  } catch (err) {
    console.error('[POST /api/settings/agreement-template]', err);
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}
