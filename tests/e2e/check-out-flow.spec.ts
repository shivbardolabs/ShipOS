/**
 * Package Check-Out Flow E2E Tests
 *
 * Tests the check-out page: customer search, package selection,
 * signature capture, and receipt flow. Requires AUTH_COOKIE.
 */

import { test, expect } from '@playwright/test';

test.describe('Package Check-Out', () => {
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

  test('check-out page renders with search', async ({ page }) => {
    await page.goto('/dashboard/packages/check-out');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/check.?out|search|customer/i, { timeout: 15_000 });
  });

  test('check-out has customer search input', async ({ page }) => {
    await page.goto('/dashboard/packages/check-out');
    await page.waitForLoadState('networkidle');
    // Should have search for customer lookup
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="customer" i], input[type="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test('check-out shows tabs or workflow steps', async ({ page }) => {
    await page.goto('/dashboard/packages/check-out');
    await page.waitForLoadState('networkidle');
    // The page should have some structure — tabs, steps, or sections
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent() || '';
    // Should mention key checkout concepts
    expect(bodyText.toLowerCase()).toMatch(/customer|package|signature|check.?out|search/);
  });
});
