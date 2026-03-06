/**
 * Mail & Shipping E2E Tests
 *
 * Tests mail management, AI mail sort, shipping, and label reprint pages.
 * Requires AUTH_COOKIE.
 */

import { test, expect } from '@playwright/test';

test.describe('Mail & Shipping', () => {
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

  test('mail list page loads', async ({ page }) => {
    await page.goto('/dashboard/mail');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/mail/i, { timeout: 15_000 });
  });

  test('AI mail sort page loads', async ({ page }) => {
    await page.goto('/dashboard/mail/ai-sort');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/mail|sort|ai/i, { timeout: 15_000 });
  });

  test('shipping page loads', async ({ page }) => {
    await page.goto('/dashboard/shipping');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/ship/i, { timeout: 15_000 });
  });

  test('reprint label page loads', async ({ page }) => {
    await page.goto('/dashboard/shipping/reprint');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/reprint|label|ship/i, { timeout: 15_000 });
  });
});
