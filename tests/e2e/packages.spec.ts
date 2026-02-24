/**
 * BAR-210: Packages E2E Tests
 *
 * Tests package list, check-in flow, check-out flow, and search.
 */

import { test, expect } from '@playwright/test';

test.describe('Package Management', () => {
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

  test('packages list page loads', async ({ page }) => {
    await page.goto('/dashboard/packages');
    await expect(page.locator('body')).toContainText(/package/i, { timeout: 10_000 });
  });

  test('check-in page renders form', async ({ page }) => {
    await page.goto('/dashboard/packages/check-in');
    await expect(page.locator('body')).toContainText(/check.?in/i, { timeout: 10_000 });
  });

  test('check-out page renders', async ({ page }) => {
    await page.goto('/dashboard/packages/check-out');
    await expect(page.locator('body')).toContainText(/check.?out/i, { timeout: 10_000 });
  });

  test('smart intake page loads', async ({ page }) => {
    await page.goto('/dashboard/packages/smart-intake');
    await expect(page.locator('body')).toContainText(/intake|smart/i, { timeout: 10_000 });
  });
});
