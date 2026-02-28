import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOrProvisionUser } from '@/lib/auth';

/* -------------------------------------------------------------------------- */
/*  GET /api/dashboard/briefing                                               */
/*  Aggregates store data and generates a conversational AI morning briefing  */
/*  via GPT-4o. Falls back to a realistic demo briefing when no API key.     */
/* -------------------------------------------------------------------------- */

/* ── Response types ─────────────────────────────────────────────────────── */

export interface BriefingActionItem {
  text: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BriefingMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface Briefing {
  greeting: string;
  summary: string;
  actionItems: BriefingActionItem[];
  metrics: BriefingMetric[];
  prediction: string;
}

export interface BriefingResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  briefing: Briefing;
  error?: string;
}

/* ── Data aggregation helpers ───────────────────────────────────────────── */

async function aggregateStoreData() {
  const user = await getOrProvisionUser();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86_400_000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tenantFilter = user && user.role !== 'superadmin' && user.tenantId
    ? { tenantId: user.tenantId }
    : {};
  const customerRelationFilter = user && user.role !== 'superadmin' && user.tenantId
    ? { customer: { tenantId: user.tenantId } }
    : {};

  const [
    awaitingPickupCount,
    agingPackages,
    expiringIds,
    expiredIdsCount,
    checkedInToday,
    activeCustomers,
    revenueResult,
    shipmentsToday,
    mailToday,
    pendingShipments,
    packagesHeld,
    notificationsSent,
  ] = await Promise.all([
    prisma.package.count({ where: { ...customerRelationFilter, status: { in: ['checked_in', 'notified', 'ready'] } } }),
    prisma.package.findMany({
      where: { ...customerRelationFilter, status: { in: ['checked_in', 'notified', 'ready'] }, checkedInAt: { lt: sevenDaysAgo } },
      take: 5,
      orderBy: { checkedInAt: 'asc' },
      include: { customer: { select: { firstName: true, lastName: true, pmbNumber: true } } },
    }),
    prisma.customer.findMany({
      where: { ...tenantFilter, status: 'active', deletedAt: null, idExpiration: { gt: now, lte: thirtyDaysFromNow } },
      select: { firstName: true, lastName: true, pmbNumber: true, idExpiration: true },
    }),
    prisma.customer.count({ where: { ...tenantFilter, deletedAt: null, idExpiration: { lte: now } } }),
    prisma.package.count({ where: { ...customerRelationFilter, checkedInAt: { gte: todayStart } } }),
    prisma.customer.count({ where: { ...tenantFilter, status: 'active', deletedAt: null } }),
    prisma.shipment.aggregate({ where: { ...customerRelationFilter, createdAt: { gte: todayStart } }, _sum: { retailPrice: true } }),
    prisma.shipment.count({ where: { ...customerRelationFilter, createdAt: { gte: todayStart } } }),
    prisma.mailPiece.count({ where: { ...customerRelationFilter, receivedAt: { gte: todayStart } } }),
    prisma.shipment.count({ where: { ...customerRelationFilter, status: { in: ['pending', 'label_created'] } } }),
    prisma.package.count({ where: { ...customerRelationFilter, status: { in: ['checked_in', 'notified', 'ready'] } } }),
    prisma.notification.count({ where: { ...customerRelationFilter, sentAt: { gte: todayStart } } }),
  ]);

  return {
    awaitingPickup: awaitingPickupCount,
    agingPackages: agingPackages.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agingPackageDetails: agingPackages.map((p: any) => ({
      tracking: p.trackingNumber,
      customer: (p.customer?.firstName ?? '') + ' ' + (p.customer?.lastName ?? ''),
      pmb: p.customer?.pmbNumber,
      daysHeld: Math.floor((now.getTime() - new Date(p.checkedInAt).getTime()) / 86_400_000),
    })),
    expiringIds: expiringIds.length,
    expiringIdDetails: expiringIds.map((c) => ({
      name: c.firstName + ' ' + c.lastName,
      pmb: c.pmbNumber,
      daysUntilExpiry: Math.ceil((new Date(c.idExpiration!).getTime() - now.getTime()) / 86_400_000),
    })),
    expiredIds: expiredIdsCount,
    checkedInToday,
    inactiveCustomers: 0, // Would need a more complex query; omit for now
    totalActiveCustomers: activeCustomers,
    revenueToday: revenueResult._sum.retailPrice ?? 0,
    shipmentsToday,
    mailToday,
    pendingShipments,
    totalPackagesHeld: packagesHeld,
    notificationsSent,
  };
}

/* ── System prompt for GPT-4o ───────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are an AI assistant for ShipOS, a mailbox-management and shipping platform used by pack-and-ship stores. You produce a concise, conversational morning briefing for the store operator.

You will receive a JSON summary of today's store data. Generate a briefing in the following JSON format (no markdown, no code fences — pure JSON only):

{
  "greeting": "A friendly, time-appropriate greeting (e.g. Good morning! or Happy Monday!)",
  "summary": "A 2-3 sentence conversational summary of the store's status. Highlight anything urgent first, then positive trends. Keep it concise and actionable.",
  "actionItems": [
    {
      "text": "Short actionable description",
      "href": "/dashboard/relevant-page",
      "priority": "high|medium|low"
    }
  ],
  "metrics": [
    {
      "label": "Metric name",
      "value": "Formatted value",
      "trend": "up|down|flat"
    }
  ],
  "prediction": "A brief forward-looking prediction or recommendation based on the data patterns."
}

Guidelines:
- Keep the greeting short and warm
- Summary should be 2-3 sentences max, conversational, not robotic
- Action items: 3-5 items, sorted by priority (high first). Use these href paths:
  - Packages: /dashboard/packages
  - Customers: /dashboard/customers
  - Compliance/IDs: /dashboard/compliance
  - Shipping: /dashboard/shipping
  - Notifications: /dashboard/notifications
  - Invoicing: /dashboard/invoicing
- Metrics: exactly 4 key metrics with trends
- Prediction: 1-2 sentences about what to expect or prepare for
- Be specific with numbers from the data
- Flag anything urgent (aging packages, expiring IDs) prominently`;

/* ── Demo briefing ──────────────────────────────────────────────────────── */

async function getDemoBriefing(): Promise<Briefing> {
  const data = await aggregateStoreData();

  return {
    greeting: 'Good morning! ☀️',
    summary: `You have ${data.awaitingPickup} packages awaiting pickup, with ${data.agingPackages} sitting for over a week — those should be your first priority. ${data.expiringIds} customer IDs are expiring within 30 days and ${data.expiredIds > 0 ? `${data.expiredIds} have already expired` : 'need attention soon'}. Revenue is trending well at $${data.revenueToday.toFixed(2)} so far today.`,
    actionItems: [
      ...(data.agingPackages > 0
        ? [
            {
              text: `Send pickup reminders for ${data.agingPackages} aging packages (7+ days)`,
              href: '/dashboard/packages',
              priority: 'high' as const,
            },
          ]
        : []),
      ...(data.expiringIds > 0
        ? [
            {
              text: `${data.expiringIds} customer IDs expiring within 30 days — review compliance`,
              href: '/dashboard/compliance',
              priority: 'high' as const,
            },
          ]
        : []),
      ...(data.pendingShipments > 0
        ? [
            {
              text: `Process ${data.pendingShipments} pending shipments before end of day`,
              href: '/dashboard/shipping',
              priority: 'medium' as const,
            },
          ]
        : []),
      ...(data.inactiveCustomers > 0
        ? [
            {
              text: `Re-engage ${data.inactiveCustomers} inactive customers (no activity in 14+ days)`,
              href: '/dashboard/customers',
              priority: 'medium' as const,
            },
          ]
        : []),
      {
        text: 'Review daily revenue breakdown and outstanding invoices',
        href: '/dashboard/invoicing',
        priority: 'low' as const,
      },
    ],
    metrics: [
      {
        label: 'Packages Held',
        value: String(data.totalPackagesHeld),
        trend: 'flat' as const,
      },
      {
        label: 'Checked In Today',
        value: String(data.checkedInToday),
        trend: 'up' as const,
      },
      {
        label: 'Revenue Today',
        value: `$${data.revenueToday.toFixed(2)}`,
        trend: 'up' as const,
      },
      {
        label: 'Notifications Sent',
        value: String(data.notificationsSent),
        trend: 'flat' as const,
      },
    ],
    prediction: `Based on current patterns, expect a busy afternoon with more check-ins. With ${data.agingPackages} packages aging past 7 days, proactive reminders could free up shelf space and improve customer satisfaction.`,
  };
}

/* ── GET handler ────────────────────────────────────────────────────────── */

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    /* No API key → demo mode */
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        mode: 'demo',
        briefing: await getDemoBriefing(),
      } satisfies BriefingResponse);
    }

    /* Aggregate store data */
    const data = await aggregateStoreData();

    /* Call GPT-4o */
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Here is today's store data:\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', response.status, errText);

      let detail = `OpenAI returned ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        detail = errJson?.error?.message ?? detail;
      } catch {
        // keep generic detail
      }

      return NextResponse.json(
        {
          success: false,
          mode: 'ai' as const,
          briefing: await getDemoBriefing(),
          error: `AI API error: ${detail}`,
        } satisfies BriefingResponse,
        { status: 502 }
      );
    }

    const result = await response.json();
    const content: string = result.choices?.[0]?.message?.content ?? '';

    /* Parse the JSON response */
    let briefing: Briefing;
    try {
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      briefing = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI briefing response:', content);
      return NextResponse.json({
        success: true,
        mode: 'demo',
        briefing: await getDemoBriefing(),
        error: 'Failed to parse AI response, using demo briefing',
      } satisfies BriefingResponse);
    }

    return NextResponse.json({
      success: true,
      mode: 'ai',
      briefing,
    } satisfies BriefingResponse);
  } catch (err) {
    console.error('Briefing API error:', err);
    return NextResponse.json(
      {
        success: false,
        mode: 'demo' as const,
        briefing: await getDemoBriefing(),
        error: 'Internal server error',
      } satisfies BriefingResponse,
      { status: 500 }
    );
  }
}
