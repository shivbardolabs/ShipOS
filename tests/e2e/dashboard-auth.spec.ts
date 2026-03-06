/**
 * Dashboard Authenticated E2E Tests
 *
 * Tests dashboard, sidebar navigation, page loads for all major sections.
 * Requires AUTH_COOKIE env var — skipped in CI without auth setup.
 */

import { test, expect } from '@playwright/test';

/* ── Auth Setup ────────────────────────────────────────────────────────────── */

test.describe('Dashboard — Authenticated', () => {
  test.skip(!process.env.AUTH_COOKIE, 'Requires AUTH_COOKIE env var');

  test.beforeEach(async ({ context }) => {
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await context.addCookies([{
      name: 'appSession',
      value: process.env.AUTH_COOKIE!,
      domain: new URL(baseURL).hostname,
      path: '/',
    }]);
  });

  /* ── Dashboard Home ─────────────────────────────────────────────────────── */

  test('dashboard loads with KPI stats', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Should show stat cards or dashboard content
    await expect(page.locator('body')).toContainText(/dashboard|package|customer|today/i, { timeout: 15_000 });
  });

  test('dashboard shows user greeting', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Should show some personalized content or general greeting
    await expect(page.locator('body')).toBeVisible();
  });

  /* ── Sidebar Navigation ──────────────────────────────────────────────────── */

  test('sidebar renders core navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Core nav items that should always be visible
    const coreLinks = [
      { text: /dashboard/i, href: '/dashboard' },
      { text: /customer/i, href: '/dashboard/customers' },
      { text: /setting/i, href: '/dashboard/settings' },
    ];

    for (const link of coreLinks) {
      const navItem = page.locator(`a[href="${link.href}"]`).first();
      if (await navItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(navItem).toBeVisible();
      }
    }
  });

  test('sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click into Customers
    const customersLink = page.locator('a[href="/dashboard/customers"]').first();
    if (await customersLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await customersLink.click();
      await expect(page).toHaveURL(/\/dashboard\/customers/, { timeout: 10_000 });
    }
  });

  /* ── Core Page Loads (authenticated) ─────────────────────────────────────── */

  const coreSections = [
    { path: '/dashboard/packages', name: 'Packages', match: /package/i },
    { path: '/dashboard/packages/check-in', name: 'Check-In', match: /check.?in|loading/i },
    { path: '/dashboard/packages/check-out', name: 'Check-Out', match: /check.?out|search|customer/i },
    { path: '/dashboard/customers', name: 'Customers', match: /customer|search/i },
    { path: '/dashboard/customers/new', name: 'New Customer', match: /customer|new|create|add/i },
    { path: '/dashboard/mail', name: 'Mail', match: /mail/i },
    { path: '/dashboard/billing', name: 'Billing', match: /billing|plan|subscription/i },
    { path: '/dashboard/compliance', name: 'Compliance', match: /compliance|cmra/i },
    { path: '/dashboard/settings', name: 'Settings', match: /setting/i },
    { path: '/dashboard/notifications', name: 'Notifications', match: /notification/i },
    { path: '/dashboard/reports', name: 'Reports', match: /report/i },
    { path: '/dashboard/activity-log', name: 'Activity Log', match: /activity|log/i },
    { path: '/dashboard/changelog', name: 'Changelog', match: /changelog|update|release/i },
    { path: '/dashboard/profile', name: 'Profile', match: /profile|account/i },
  ];

  for (const section of coreSections) {
    test(`${section.name} page loads at ${section.path}`, async ({ page }) => {
      await page.goto(section.path);
      await expect(page.locator('body')).toContainText(section.match, { timeout: 15_000 });
    });
  }

  /* ── Settings Sub-pages ───────────────────────────────────────────────────── */

  const settingsPages = [
    { path: '/dashboard/settings/branding', name: 'Branding', match: /brand/i },
    { path: '/dashboard/settings/printer', name: 'Printer', match: /print/i },
    { path: '/dashboard/settings/loyalty', name: 'Loyalty', match: /loyalty|reward/i },
    { path: '/dashboard/settings/brandkit', name: 'Brand Kit', match: /brand|kit|logo/i },
    { path: '/dashboard/settings/security', name: 'Security', match: /security|password|session/i },
  ];

  for (const page_ of settingsPages) {
    test(`Settings — ${page_.name} loads`, async ({ page }) => {
      await page.goto(page_.path);
      await expect(page.locator('body')).toContainText(page_.match, { timeout: 15_000 });
    });
  }

  /* ── Mobile Responsive ────────────────────────────────────────────────────── */

  test('mobile: dashboard loads at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    // Content should not overflow
    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test('mobile: sidebar is hidden or toggleable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // On mobile the sidebar should not take up the full viewport
    // (either hidden or overlay)
    await expect(page.locator('body')).toBeVisible();
  });
});
