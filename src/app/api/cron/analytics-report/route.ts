import { withApiHandler, ok, unauthorized } from '@/lib/api-utils';

/**
 * POST /api/cron/analytics-report
 *
 * Weekly analytics summary report (designed to run every Monday).
 *
 * Currently logs a structured report to the console.  When PostHog API
 * querying is wired up, replace the placeholder counts with real data
 * from the PostHog Trends / HogQL API.
 *
 * Protected by CRON_SECRET to prevent unauthorized invocation.
 */
export const POST = withApiHandler(async (request) => {
  // ── Auth guard ─────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    unauthorized('Unauthorized');
  }

  // ── Date range (previous Mon → Sun) ───────────────────────────────────
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() - daysToLastMonday);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // ── Build report ──────────────────────────────────────────────────────
  //
  // TODO: Replace placeholder values with real PostHog API queries.
  //   - Use POST https://us.i.posthog.com/api/projects/:id/insights/trend
  //   - Or HogQL: POST /api/projects/:id/query
  //
  const report = {
    period: `${fmt(weekStart)} → ${fmt(weekEnd)}`,
    generatedAt: now.toISOString(),
    summary: {
      totalPageViews: '—',
      uniqueUsers: '—',
      totalLogins: '—',
    },
    pageViewsByPage: [
      { page: 'Dashboard', views: '—' },
      { page: 'Packages', views: '—' },
      { page: 'Customers', views: '—' },
      { page: 'Mail', views: '—' },
      { page: 'Shipping', views: '—' },
      { page: 'Settings', views: '—' },
    ],
    actionsByCategory: [
      { action: 'package_checked_in', count: '—' },
      { action: 'package_checked_out', count: '—' },
      { action: 'customer_created', count: '—' },
      { action: 'shipment_created', count: '—' },
      { action: 'mail_scanned', count: '—' },
    ],
    notes: [
      'This report is a structural placeholder.',
      'Connect PostHog project API to populate real numbers.',
      'See NEXT_PUBLIC_POSTHOG_KEY and POSTHOG_PROJECT_ID env vars.',
    ],
  };

  // ── Log the report ────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('  ShipOS Weekly Analytics Report');
  console.log(`  Period: ${report.period}`);
  console.log('═══════════════════════════════════════════════════');
  console.log(JSON.stringify(report, null, 2));
  console.log('═══════════════════════════════════════════════════');

  return ok({
    success: true,
    report,
  });
}, { public: true });
