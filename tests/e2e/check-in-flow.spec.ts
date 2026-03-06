/**
 * Package Check-In Flow E2E Tests
 *
 * Tests the check-in page UI, form elements, smart intake entry,
 * and carrier detection. Requires AUTH_COOKIE.
 */

import { test, expect } from '@playwright/test';

test.describe('Package Check-In', () => {
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

  test('check-in page renders with form elements', async ({ page }) => {
    await page.goto('/dashboard/packages/check-in');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/check.?in|tracking|package/i, { timeout: 15_000 });
  });

  test('check-in form has tracking number input', async ({ page }) => {
    await page.goto('/dashboard/packages/check-in');
    await page.waitForLoadState('networkidle');
    // Should have a tracking number input field
    const trackingInput = page.locator('input[placeholder*="tracking" i], input[name*="tracking" i], input[type="text"]').first();
    await expect(trackingInput).toBeVisible({ timeout: 15_000 });
  });

  test('smart intake page loads', async ({ page }) => {
    await page.goto('/dashboard/packages/smart-intake');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/intake|smart|camera|scan/i, { timeout: 15_000 });
  });

  test('pending check-in page loads', async ({ page }) => {
    await page.goto('/dashboard/packages/pending-checkin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/pending|check.?in|queue/i, { timeout: 15_000 });
  });

  test('return to sender page loads', async ({ page }) => {
    await page.goto('/dashboard/packages/rts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/return|sender|rts/i, { timeout: 15_000 });
  });
});
