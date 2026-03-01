import { NextRequest, NextResponse } from 'next/server';
import { getOrProvisionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// ── Default template seeds ───────────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
  {
    type: 'package_checkin',
    name: 'Package Check-In',
    subject: '📦 New {{carrier}} package at {{pmbNumber}}',
    bodyHtml:
      '<p>Hi {{customerName}},</p>' +
      '<p>A new <strong>{{carrier}}</strong> package has arrived at your mailbox <strong>{{pmbNumber}}</strong>.</p>' +
      '<p>Please pick up at your convenience.</p>',
    bodySms:
      'Hi {{customerName}}, a new {{carrier}} package has arrived at your mailbox {{pmbNumber}}. Please pick up at your convenience.',
    variables: JSON.stringify(['customerName', 'pmbNumber', 'carrier', 'trackingNumber', 'locationName']),
  },
  {
    type: 'package_reminder',
    name: 'Package Reminder',
    subject: '⏰ {{packageCount}} package(s) waiting at {{pmbNumber}}',
    bodyHtml:
      '<p>Hi {{customerName}},</p>' +
      '<p>Reminder: you have <strong>{{packageCount}}</strong> package(s) waiting at <strong>{{pmbNumber}}</strong>.</p>' +
      '<p>Please pick up soon to avoid storage fees.</p>',
    bodySms:
      'Hi {{customerName}}, reminder: you have {{packageCount}} package(s) waiting at {{pmbNumber}}. Please pick up soon.',
    variables: JSON.stringify(['customerName', 'pmbNumber', 'packageCount', 'oldestDays', 'locationName']),
  },
  {
    type: 'id_expiration',
    name: 'ID Expiration Notice',
    subject: '⚠️ ID expiration notice for {{pmbNumber}}',
    bodyHtml:
      '<p>Hi {{customerName}},</p>' +
      '<p>Your <strong>{{idType}}</strong> on file for <strong>{{pmbNumber}}</strong> {{expiryMessage}}.</p>' +
      '<p>Please bring updated ID to your location.</p>',
    bodySms:
      'Hi {{customerName}}, your {{idType}} on file for {{pmbNumber}} {{expiryMessage}}. Please bring updated ID to your location.',
    variables: JSON.stringify(['customerName', 'pmbNumber', 'idType', 'expirationDate', 'daysUntilExpiry', 'expiryMessage', 'locationName']),
  },
  {
    type: 'mail_received',
    name: 'Mail Received',
    subject: '✉️ New mail received at {{pmbNumber}}',
    bodyHtml:
      '<p>Hi {{customerName}},</p>' +
      '<p>New <strong>{{mailType}}</strong> has been received at your mailbox <strong>{{pmbNumber}}</strong>.</p>' +
      '<p>Contact your location for handling options.</p>',
    bodySms:
      'Hi {{customerName}}, new {{mailType}} has been received at your mailbox {{pmbNumber}}. Contact your location for handling options.',
    variables: JSON.stringify(['customerName', 'pmbNumber', 'mailType', 'sender', 'locationName']),
  },
  {
    type: 'welcome',
    name: 'Welcome',
    subject: '🎉 Welcome to ShipOS Pro — {{pmbNumber}} is ready!',
    bodyHtml:
      '<p>Welcome to ShipOS Pro, <strong>{{customerName}}</strong>!</p>' +
      '<p>Your mailbox <strong>{{pmbNumber}}</strong> is now active at <strong>{{locationName}}</strong>.</p>' +
      '<p>You\'ll receive notifications for packages and mail.</p>',
    bodySms:
      'Welcome to ShipOS Pro, {{customerName}}! Your mailbox {{pmbNumber}} is now active. You\'ll receive notifications for packages and mail.',
    variables: JSON.stringify(['customerName', 'pmbNumber', 'locationName', 'locationAddress']),
  },
];

// ── GET — List templates ─────────────────────────────────────────────────────

/**
 * GET /api/notifications/templates
 *
 * Returns all notification templates. Filters by tenantId if the user
 * is not a superadmin (returns both tenant-specific and global templates).
 *
 * Query params:
 *   - includeInactive: "true" to include soft-deleted templates
 *   - seed: "true" to seed default templates if none exist
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const shouldSeed = searchParams.get('seed') === 'true';

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    // Scope: tenant-specific + global (tenantId: null)
    if (user.role !== 'superadmin' && user.tenantId) {
      where.OR = [{ tenantId: user.tenantId }, { tenantId: null }];
    }

    let templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Seed defaults if empty and requested
    if (templates.length === 0 && shouldSeed) {
      await prisma.notificationTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((t) => ({
          ...t,
          tenantId: user.tenantId || null,
        })),
        skipDuplicates: true,
      });

      templates = await prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      });
    }

    // Parse variables JSON for each template
    const serialized = templates.map((t) => ({
      ...t,
      variables: t.variables ? JSON.parse(t.variables) : [],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({ templates: serialized });
  } catch (err) {
    console.error('[GET /api/notifications/templates]', err);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// ── POST — Create template ───────────────────────────────────────────────────

/**
 * POST /api/notifications/templates
 *
 * Body: { type, name, subject, bodyHtml, bodySms, variables? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const required = ['type', 'name', 'subject', 'bodyHtml', 'bodySms'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate type within the tenant scope
    const existing = await prisma.notificationTemplate.findFirst({
      where: {
        type: body.type,
        isActive: true,
        OR: [
          { tenantId: user.tenantId || null },
          { tenantId: null },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A template with type "${body.type}" already exists. Use PATCH to update it.` },
        { status: 409 }
      );
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        type: body.type,
        name: body.name,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodySms: body.bodySms,
        variables: body.variables
          ? JSON.stringify(body.variables)
          : null,
        tenantId: user.tenantId || null,
      },
    });

    return NextResponse.json({
      template: {
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : [],
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/notifications/templates]', err);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// ── PATCH — Update template ──────────────────────────────────────────────────

/**
 * PATCH /api/notifications/templates
 *
 * Body: { id, name?, subject?, bodyHtml?, bodySms?, variables? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
    }

    // Verify template exists and user has access
    const existing = await prisma.notificationTemplate.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Tenant scoping: non-superadmins can only edit their own tenant's templates
    if (
      user.role !== 'superadmin' &&
      existing.tenantId &&
      existing.tenantId !== user.tenantId
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data — only include provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.bodyHtml !== undefined) updateData.bodyHtml = body.bodyHtml;
    if (body.bodySms !== undefined) updateData.bodySms = body.bodySms;
    if (body.variables !== undefined) {
      updateData.variables = Array.isArray(body.variables)
        ? JSON.stringify(body.variables)
        : body.variables;
    }

    const template = await prisma.notificationTemplate.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json({
      template: {
        ...template,
        variables: template.variables ? JSON.parse(template.variables) : [],
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[PATCH /api/notifications/templates]', err);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

// ── DELETE — Soft-delete template ────────────────────────────────────────────

/**
 * DELETE /api/notifications/templates
 *
 * Body: { id }
 * Soft-deletes by setting isActive = false.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getOrProvisionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
    }

    // Verify template exists
    const existing = await prisma.notificationTemplate.findUnique({
      where: { id: body.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Tenant scoping
    if (
      user.role !== 'superadmin' &&
      existing.tenantId &&
      existing.tenantId !== user.tenantId
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft-delete: set isActive = false
    await prisma.notificationTemplate.update({
      where: { id: body.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Template deactivated' });
  } catch (err) {
    console.error('[DELETE /api/notifications/templates]', err);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
