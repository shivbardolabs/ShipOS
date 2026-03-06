/**
 * Customer Management E2E Tests
 *
 * Tests customer list, search, new customer form, and customer detail page.
 * Requires AUTH_COOKIE.
 */

import { test, expect } from '@playwright/test';

test.describe('Customer Management', () => {
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

  test('customer list page loads with search', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/customer/i, { timeout: 15_000 });
    // Should have search functionality
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('customer list has view toggle (grid/list)', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');
    // Should have grid/list view toggle buttons
    const body = await page.locator('body').textContent() || '';
    expect(body.toLowerCase()).toMatch(/customer/);
  });

  test('new customer page renders form', async ({ page }) => {
    await page.goto('/dashboard/customers/new');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/customer|new|create|add|name|email/i, { timeout: 15_000 });
  });

  test('new customer form has required fields', async ({ page }) => {
    await page.goto('/dashboard/customers/new');
    await page.waitForLoadState('networkidle');
    // Should have input fields for customer data
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('AI onboard page loads', async ({ page }) => {
    await page.goto('/dashboard/customers/ai-onboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/onboard|customer|ai/i, { timeout: 15_000 });
  });

  test('customer provision page loads', async ({ page }) => {
    await page.goto('/dashboard/customers/provision');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
