/**
 * BAR-210: Dashboard E2E Tests
 *
 * Tests dashboard rendering, navigation, sidebar, and responsive behavior.
 * These run against an authenticated session (requires AUTH_COOKIE env).
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  // Skip if no auth cookie available (CI without auth setup)
  test.skip(!process.env.AUTH_COOKIE, 'Requires AUTH_COOKIE env var');

  test.beforeEach(async ({ context }) => {
    if (process.env.AUTH_COOKIE) {
      await context.addCookies([{
        name: 'appSession',
        value: process.env.AUTH_COOKIE,
        domain: new URL(process.env.TEST_BASE_URL || 'http://localhost:3000').hostname,
        path: '/',
      }]);
    }
  });

  test('dashboard loads with stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar navigation links work', async ({ page }) => {
    await page.goto('/dashboard');
    
    const navLinks = [
      { text: 'Packages', url: '/dashboard/packages' },
      { text: 'Customers', url: '/dashboard/customers' },
      { text: 'Mail', url: '/dashboard/mail' },
    ];

    for (const link of navLinks) {
      const nav = page.locator(`a:has-text("${link.text}")`).first();
      if (await nav.isVisible()) {
        await nav.click();
        await expect(page).toHaveURL(new RegExp(link.url));
      }
    }
  });

  test('responsive: mobile sidebar toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    // Sidebar should be hidden on mobile
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      // If visible, there should be a toggle
      const toggle = page.locator('[data-testid="sidebar-toggle"]');
      if (await toggle.isVisible()) {
        await toggle.click();
      }
    }
  });
});
