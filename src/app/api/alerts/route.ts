/**
 * BAR-265: Alert System — List & Create Alerts
 *
 * GET  /api/alerts        → List active alerts for current tenant (sorted by priority)
 * POST /api/alerts        → Create a new alert (system/internal use)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/* Priority sort order: urgent_important (0) → urgent (1) → important (2) → completed (3) */
const PRIORITY_ORDER = {
  urgent_important: 0,
  urgent: 1,
  important: 2,
  completed: 3,
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const includeResolved = searchParams.get('includeResolved') === 'true';
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 250);

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const now = new Date();

    const alerts = await prisma.alert.findMany({
      where: {
        tenantId,
        ...(includeResolved
          ? {}
          : { resolvedAt: null }),
        // Hide snoozed alerts (snoozedUntil is in the future)
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lt: now } },
        ],
      },
      orderBy: [
        { priority: 'asc' },    // enum order matches desired sort
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Re-sort by our explicit priority order (Prisma enum ordering may differ)
    const sorted = [...alerts].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Group duplicate alert types for the summary panel
    const grouped = groupAlerts(sorted);

    return NextResponse.json({
      alerts: sorted,
      grouped,
      total: sorted.length,
    });
  } catch (error) {
    console.error('[alerts] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      type,
      priority,
      title,
      message,
      actionUrl,
      relatedEntityType,
      relatedEntityId,
      isTimeSensitive = false,
      expiresAt,
      metadata,
    } = body;

    if (!tenantId || !type || !priority || !title || !message) {
      return NextResponse.json(
        { error: 'tenantId, type, priority, title, and message are required' },
        { status: 400 }
      );
    }

    // Check for duplicate: same entity + type + priority that isn't resolved
    const existing = relatedEntityId
      ? await prisma.alert.findFirst({
          where: {
            tenantId,
            type,
            relatedEntityType,
            relatedEntityId,
            resolvedAt: null,
          },
        })
      : null;

    if (existing) {
      // Update existing alert instead of creating a duplicate
      const updated = await prisma.alert.update({
        where: { id: existing.id },
        data: { title, message, metadata, isTimeSensitive },
      });
      return NextResponse.json({ alert: updated, deduplicated: true });
    }

    const alert = await prisma.alert.create({
      data: {
        tenantId,
        type,
        priority,
        title,
        message,
        actionUrl,
        relatedEntityType,
        relatedEntityId,
        isTimeSensitive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: metadata ?? undefined,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('[alerts] POST error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

interface GroupedAlert {
  key: string;
  priority: string;
  type: string;
  title: string;
  count: number;
  alertIds: string[];
  latestTimestamp: string;
}

function groupAlerts(alerts: { id: string; priority: string; type: string; title: string; createdAt: Date }[]): GroupedAlert[] {
  const map = new Map<string, GroupedAlert>();

  for (const alert of alerts) {
    const key = `${alert.priority}:${alert.type}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.alertIds.push(alert.id);
      if (new Date(alert.createdAt) > new Date(existing.latestTimestamp)) {
        existing.latestTimestamp = alert.createdAt.toISOString();
      }
    } else {
      map.set(key, {
        key,
        priority: alert.priority,
        type: alert.type,
        title: alert.title,
        count: 1,
        alertIds: [alert.id],
        latestTimestamp: alert.createdAt.toISOString(),
      });
    }
  }

  return Array.from(map.values());
}
