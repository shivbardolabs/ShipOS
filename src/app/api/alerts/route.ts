import { NextRequest } from 'next/server';
import { withApiHandler, validateQuery, validateBody, ok, created, badRequest } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/**
 * Priority-based alert sorting and grouping utilities.
 */
const PRIORITY_ORDER: Record<string, number> = {
  urgent_important: 0,
  not_urgent_important: 1,
  urgent_not_important: 2,
  not_urgent_not_important: 3,
};

interface GroupedAlert {
  title: string;
  description: string;
  priority: string;
  sortOrder: number;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    actionType: string | null;
    actionLabel: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }>;
}

function groupAlerts(
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    actionType: string | null;
    actionLabel: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    groupKey: string | null;
  }>,
): GroupedAlert[] {
  const groups = new Map<string, GroupedAlert>();

  for (const alert of alerts) {
    const key = alert.groupKey ?? alert.id;
    if (!groups.has(key)) {
      groups.set(key, {
        title: alert.title,
        description: alert.description,
        priority: alert.priority,
        sortOrder: PRIORITY_ORDER[alert.priority] ?? 99,
        alerts: [],
      });
    }
    groups.get(key)!.alerts.push({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      priority: alert.priority,
      status: alert.status,
      actionType: alert.actionType,
      actionLabel: alert.actionLabel,
      metadata: alert.metadata,
      createdAt: alert.createdAt,
    });
  }

  return Array.from(groups.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/* ── Schemas ──────────────────────────────────────────────────────────────── */

const GetAlertsQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  grouped: z.enum(['true', 'false']).optional(),
});

const CreateAlertBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  priority: z.enum(['urgent_important', 'not_urgent_important', 'urgent_not_important', 'not_urgent_not_important']),
  actionType: z.string().optional(),
  actionLabel: z.string().optional(),
  groupKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  dedupeKey: z.string().optional(),
});

/**
 * GET /api/alerts
 * List alerts for the current tenant, with optional filtering and grouping.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session
 * instead of accepting it as a query param.
 */
export const GET = withApiHandler(async (request: NextRequest, { user }) => {
  const query = validateQuery(request, GetAlertsQuerySchema);
  const tenantId = user.tenantId!;

  const where: Prisma.AlertWhereInput = { tenantId };
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  // Sort by priority
  const sorted = [...alerts].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  );

  if (query.grouped === 'true') {
    return ok({ alerts: groupAlerts(sorted) });
  }

  return ok({ alerts: sorted });
});

/**
 * POST /api/alerts
 * Create a new alert with optional deduplication.
 *
 * SECURITY FIX: tenantId now derived from authenticated user session.
 */
export const POST = withApiHandler(async (request: NextRequest, { user }) => {
  const body = await validateBody(request, CreateAlertBodySchema);
  const tenantId = user.tenantId!;

  // Deduplication: skip if an active alert with the same dedupeKey exists
  if (body.dedupeKey) {
    const existing = await prisma.alert.findFirst({
      where: { tenantId, dedupeKey: body.dedupeKey, status: { not: 'resolved' } },
    });
    if (existing) {
      return ok({ alert: existing, deduplicated: true });
    }
  }

  const alert = await prisma.alert.create({
    data: {
      tenantId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      actionType: body.actionType ?? null,
      actionLabel: body.actionLabel ?? null,
      groupKey: body.groupKey ?? null,
      metadata: body.metadata ?? {},
      dedupeKey: body.dedupeKey ?? null,
      status: 'active',
    },
  });

  return created({ alert });
});
